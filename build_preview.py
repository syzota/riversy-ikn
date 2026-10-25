"""Make a preliminary susceptibility visualization, NOT a flood-inundation model.

Source data needed in source_data/: 2 uploaded DEMNAS tiles, rivers.geojson,
basins.geojson. Requires numpy, scipy, Pillow.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source_data"
TARGET = ROOT / "public" / "data"
WEST, EAST, SOUTH, NORTH = 116.5, 117.0, -1.0, -0.75
SCALE = 6

def to_pixels(coordinates, width, height):
    return [((lon-WEST)/(EAST-WEST)*width, (NORTH-lat)/(NORTH-SOUTH)*height) for lon, lat, *_ in coordinates]

def draw_geometry(draw, geometry, width, height, fill):
    typ, data = geometry["type"], geometry["coordinates"]
    if typ in ("MultiLineString", "LineString"):
        lines = data if typ == "MultiLineString" else [data]
        for line in lines:
            if len(line) > 1:
                draw.line(to_pixels(line, width, height), fill=fill, width=2)
    elif typ in ("Polygon", "MultiPolygon"):
        polygons = [data] if typ == "Polygon" else data
        for polygon in polygons:
            if polygon:
                draw.polygon(to_pixels(polygon[0], width, height), fill=fill)
                for hole in polygon[1:]:
                    draw.polygon(to_pixels(hole, width, height), fill=0)

def features(filename):
    data = json.loads((SOURCE / filename).read_text(encoding="utf-8"))
    return data.get("features", [])

def main():
    with Image.open(SOURCE / "DEMNAS_1815-31_v1.0.tif") as im:
        w, h = math.ceil(im.width/SCALE), math.ceil(im.height/SCALE)
        west = np.asarray(im.resize((w, h), Image.Resampling.BILINEAR), dtype="float32")
    with Image.open(SOURCE / "DEMNAS_1815-32_v1.0.tif") as im:
        east = np.asarray(im.resize((w, h), Image.Resampling.BILINEAR), dtype="float32")
    elevation = np.concatenate([west, east], axis=1)
    height, width = elevation.shape
    meters_y = (NORTH-SOUTH)*110575/height
    meters_x = (EAST-WEST)*111300*math.cos(math.radians((NORTH+SOUTH)/2))/width

    river_im = Image.new("L", (width, height), 0)
    for feature in features("rivers.geojson"):
        if feature.get("geometry"):
            draw_geometry(ImageDraw.Draw(river_im), feature["geometry"], width, height, 255)
    river_mask = np.asarray(river_im) > 0
    if not np.any(river_mask):
        raise RuntimeError("No rivers intersect DEM tiles")

    basin_im = Image.new("L", (width, height), 0)
    for feature in features("basins.geojson"):
        if feature.get("geometry"):
            draw_geometry(ImageDraw.Draw(basin_im), feature["geometry"], width, height, 255)
    basin_mask = np.asarray(basin_im) > 0

    dist_m, nearest = distance_transform_edt(~river_mask, sampling=(meters_y, meters_x), return_indices=True)
    relative_height = np.maximum(elevation - elevation[nearest[0], nearest[1]], 0)
    smoothed = gaussian_filter(elevation, sigma=1.1)
    gy, gx = np.gradient(smoothed, meters_y, meters_x)
    slope_deg = np.degrees(np.arctan(np.hypot(gx, gy)))

    # Screening-only assumptions, not fitted or scientifically validated weights.
    height_score = np.clip((12-relative_height)/12, 0, 1)
    distance_score = np.clip((1600-dist_m)/1500, 0, 1)
    slope_score = np.clip((10-slope_deg)/9, 0, 1)
    lowland_score = np.clip((90-elevation)/90, 0, 1)
    index = .3*height_score + .25*distance_score + .25*slope_score + .2*lowland_score
    valid = basin_mask & np.isfinite(elevation) & (dist_m <= 2000) & (elevation <= 140)
    high = (index >= .7) & (slope_deg <= 5) & (elevation <= 50)
    medium = (index >= .48) & (slope_deg <= 10) & (elevation <= 100)
    classes = np.where(high, 3, np.where(medium, 2, 1))

    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    for number, color in ((1, (50,160,100,125)), (2, (250,184,55,145)), (3, (230,82,72,160))):
        rgba[valid & (classes == number)] = color
    TARGET.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(TARGET / "flood_susceptibility_preview.png", optimize=True)
    Image.fromarray(np.where(valid, classes, 0).astype(np.uint8), "L").save(TARGET / "flood_classes.png", optimize=True)
    metadata = {
        "bounds": [[SOUTH, WEST], [NORTH, EAST]],
        "status": "INDICATIVE_UNVALIDATED_PARTIAL_EXTENT",
        "source": "DEMNAS_1815-31, DEMNAS_1815-32, HydroRIVERS, HydroBASINS",
        "method": "Screening proxy: river-relative elevation 30%, river distance 25%, slope 25%, absolute elevation 20%; indicative filters for slope, elevation, and distance",
        "limits": "NOT simulated inundation or flood depth. No rainfall, flow, tidal, infrastructure, land-cover or calibration inputs. Southern estuary outside available DEM.",
        "coverage": {"valid_pixels": int(valid.sum()), "total_pixels": int(valid.size)},
    }
    (TARGET / "flood_preview_metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False))

if __name__ == "__main__":
    main()
