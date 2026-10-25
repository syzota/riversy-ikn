"""Transform EPSG:32750 point geometry to GeoJSON EPSG:4326 (WGS84)."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source_data" / "locations.geojson"
OUTPUT = ROOT / "public" / "data" / "locations.geojson"

def utm50s_to_wgs84(x, y):
    a, f, k0 = 6378137.0, 1/298.257223563, .9996
    e2 = f*(2-f)
    ep2 = e2/(1-e2)
    xx, yy = x-500000, y-10000000
    m = yy/k0
    mu = m/(a*(1-e2/4-3*e2**2/64-5*e2**3/256))
    e1 = (1-math.sqrt(1-e2))/(1+math.sqrt(1-e2))
    phi1 = mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*math.sin(4*mu)+(151*e1**3/96)*math.sin(6*mu)+(1097*e1**4/512)*math.sin(8*mu)
    sin, cos = math.sin(phi1), math.cos(phi1)
    n = a/math.sqrt(1-e2*sin**2)
    t = math.tan(phi1)**2
    c = ep2*cos**2
    r = a*(1-e2)/(1-e2*sin**2)**1.5
    d = xx/(n*k0)
    latitude = phi1-(n*math.tan(phi1)/r)*(d**2/2-(5+3*t+10*c-4*c**2-9*ep2)*d**4/24+(61+90*t+298*c+45*t**2-252*ep2-3*c**2)*d**6/720)
    longitude = (117*math.pi/180)+(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c**2+8*ep2+24*t**2)*d**5/120)/cos
    return [round(math.degrees(longitude), 8), round(math.degrees(latitude), 8)]

def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    crs = data.get("crs",{}).get("properties",{}).get("name","")
    if "32750" not in crs:
        raise ValueError(f"Expected source coordinates in EPSG:32750, got: {crs}")
    for feature in data["features"]:
        geom = feature["geometry"]
        if geom["type"] != "Point":
            raise ValueError("Expected Point geometry")
        geom["coordinates"] = utm50s_to_wgs84(*geom["coordinates"][:2])
        props = feature.setdefault("properties",{})
        if props.get("status","").startswith("NULL"):
            props["status"] = props["status"].removeprefix("NULL")
    data.pop("crs", None)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print([(f["properties"].get("nama"), f["geometry"]["coordinates"]) for f in data["features"]])

if __name__ == "__main__":
    main()
