"""Screen OSM building footprints against the existing *indicative* DEM raster.

This is a coverage/intersection inventory, NOT an inundation or observed
damage analysis. Buildings are frequently smaller than one 50-m-ish preview
pixel, so classification is only a coarse spatial-screening approximation.
"""

import json
import csv
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'public' / 'data'
BOUNDS = dict(west=116.5, east=117.0, south=-1.0, north=-0.75)
LABELS = {0: 'Belum diklasifikasikan', 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi'}


def polygons(geometry):
    if geometry['type'] == 'Polygon':
        return [geometry['coordinates']]
    if geometry['type'] == 'MultiPolygon':
        return geometry['coordinates']
    return []


def pixel_pair(point, width, height):
    lon, lat = point[:2]
    return ((lon - BOUNDS['west']) / (BOUNDS['east'] - BOUNDS['west']) * width,
            (BOUNDS['north'] - lat) / (BOUNDS['north'] - BOUNDS['south']) * height)


def classify(geometry, classes):
    height, width = classes.shape
    xy_polygons = []
    coords = []
    for polygon in polygons(geometry):
        rings = [[pixel_pair(coord, width, height) for coord in ring] for ring in polygon]
        if rings and rings[0]:
            xy_polygons.append(rings)
            coords.extend(pt for ring in rings for pt in ring)
    if not coords:
        return None, 'invalid_geometry', 0

    raw_xmin = min(p[0] for p in coords)
    raw_xmax = max(p[0] for p in coords)
    raw_ymin = min(p[1] for p in coords)
    raw_ymax = max(p[1] for p in coords)
    if raw_xmax < 0 or raw_xmin >= width or raw_ymax < 0 or raw_ymin >= height:
        return None, 'outside_dem_extent', 0

    x0 = max(0, int(np.floor(raw_xmin)) - 1)
    y0 = max(0, int(np.floor(raw_ymin)) - 1)
    x1 = min(width, int(np.ceil(raw_xmax)) + 2)
    y1 = min(height, int(np.ceil(raw_ymax)) + 2)
    if x0 >= x1 or y0 >= y1:
        return None, 'outside_dem_extent', 0

    mask = Image.new('L', (x1 - x0, y1 - y0), 0)
    draw = ImageDraw.Draw(mask)
    for rings in xy_polygons:
        if not rings:
            continue
        outer = [(x - x0, y - y0) for x, y in rings[0]]
        draw.polygon(outer, fill=255)
        for hole in rings[1:]:
            draw.polygon([(x - x0, y - y0) for x, y in hole], fill=0)
    covered = np.asarray(mask) > 0
    zone_values = classes[y0:y1, x0:x1][covered]
    valid_values = zone_values[zone_values > 0]
    if valid_values.size:
        return int(valid_values.max()), 'indicative_raster_intersection', int(valid_values.size)

    # Fall back to a single sub-pixel screen when a very small footprint
    # touches no raster pixel center. This still does NOT mean site-level risk.
    cx = max(0, min(width - 1, int((raw_xmin + raw_xmax) / 2)))
    cy = max(0, min(height - 1, int((raw_ymin + raw_ymax) / 2)))
    nearest = int(classes[cy, cx])
    if nearest:
        return nearest, 'subpixel_approximation', 1
    return None, 'no_valid_zonation', 0


def main():
    classes = np.asarray(Image.open(DATA / 'flood_classes.png').convert('L'))
    source = json.loads((DATA / 'builtup.geojson').read_text(encoding='utf-8'))
    counts = Counter()
    features = []
    for feature in source['features']:
        zone, method, valid_pixels = classify(feature['geometry'], classes)
        item = dict(feature)
        item['properties'] = dict(feature.get('properties') or {})
        item['properties'].update({
            'screen_zone': zone,
            'screen_label': LABELS[zone or 0],
            'screen_method': method,
            'screen_valid_pixels': valid_pixels,
        })
        features.append(item)
        counts[str(zone) if zone is not None else 'unclassified'] += 1
        counts['method:' + method] += 1

    output = dict(type='FeatureCollection', name='OSM_buildings_with_indicative_screening', features=features)
    (DATA / 'builtup_zoned.geojson').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    with (DATA / 'builtup_screening.csv').open('w', encoding='utf-8-sig', newline='') as target:
        writer = csv.writer(target)
        writer.writerow(['osm_id', 'jenis_bangunan', 'kelas_indikatif', 'kelas_angka', 'metode', 'piksel_valid'])
        for feature in features:
            p = feature['properties']
            writer.writerow([p.get('@id', ''), p.get('building', ''), p['screen_label'], p['screen_zone'] if p['screen_zone'] is not None else '', p['screen_method'], p['screen_valid_pixels']])
    stats = {
        'total_building_footprints': len(features),
        'counts': {key: counts.get(key, 0) for key in ['1', '2', '3', 'unclassified']},
        'methods': {key.removeprefix('method:'): val for key, val in counts.items() if key.startswith('method:')},
        'model_bounds_wgs84': BOUNDS,
        'raster_size': {'width': int(classes.shape[1]), 'height': int(classes.shape[0])},
        'valid_raster_pixels': int(np.count_nonzero(classes)),
        'total_raster_pixels': int(classes.size),
        'source': 'User-supplied Overpass Turbo export.geojson (OSM buildings), two northern DEMNAS tiles, HydroRIVERS/HydroBASINS',
        'method_description': 'Approximate footprint/raster-pixel overlap; use maximum intersecting indicative index, with subpixel fallback.',
        'interpretation': 'Indicative screening candidates only; NOT inundated buildings, confirmed flood impacts, exposed residents, or calibrated flood hazard.',
        'spatial_limit': 'Raster model covers 116.5–117.0 E, -1.0 to -0.75 N at partial valid pixels. Southern Sepaku estuary is outside the current raster extent.',
    }
    (DATA / 'builtup_screening_stats.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
