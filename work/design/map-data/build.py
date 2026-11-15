import json
import sys
from pathlib import Path

SOURCE = Path(sys.argv[1])
TARGET = Path(sys.argv[2])
RUSSIA = (19.0, 41.0, 191.0, 82.5)


def wrap(lon: float) -> float:
    return lon + 360 if lon < 0 else lon


def simplify(points: list, tolerance: float) -> list:
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx - ax, by - ay
        length = (dx * dx + dy * dy) ** 0.5
        best, index = 0.0, -1
        for i in range(first + 1, last):
            px, py = points[i]
            if length == 0:
                distance = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                distance = abs(dy * px - dx * py + bx * ay - by * ax) / length
            if distance > best:
                best, index = distance, i
        if best > tolerance and index > 0:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [p for p, k in zip(points, keep) if k]


def line(coords: list, tolerance: float, digits: int) -> list:
    pts = [(wrap(c[0]), c[1]) for c in coords]
    return [[round(x, digits), round(y, digits)] for x, y in simplify(pts, tolerance)]


def lines_of(geometry: dict) -> list:
    if geometry["type"] in ("LineString",):
        return [geometry["coordinates"]]
    if geometry["type"] in ("MultiLineString", "Polygon"):
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return [ring for polygon in geometry["coordinates"] for ring in polygon]
    return []


def inside(coords: list) -> bool:
    return any(RUSSIA[0] <= wrap(x) <= RUSSIA[2] and RUSSIA[1] <= y <= RUSSIA[3] for x, y in coords)


def load(name: str) -> list:
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))["features"]


def country() -> dict:
    regions = []
    for f in load("ne_10m_admin_1_states_provinces.geojson"):
        p = f["properties"]
        if p.get("adm0_a3") != "RUS":
            continue
        rings = [r for r in (line(ring, 0.07, 2) for ring in lines_of(f["geometry"])) if len(r) >= 4]
        regions.append({"n": p.get("name_ru") or p.get("name"), "c": [round(wrap(p["longitude"]), 2), round(p["latitude"], 2)], "p": rings})
    rivers = []
    for f in load("ne_10m_rivers_lake_centerlines.geojson"):
        if (f["properties"].get("scalerank") or 99) > 7:
            continue
        for part in lines_of(f["geometry"]):
            if inside(part):
                pts = line(part, 0.03, 2)
                if len(pts) >= 2:
                    rivers.append(pts)
    lakes = []
    for f in load("ne_10m_lakes.geojson"):
        if (f["properties"].get("scalerank") or 99) > 5:
            continue
        for ring in lines_of(f["geometry"]):
            if inside(ring):
                pts = line(ring, 0.05, 2)
                if len(pts) >= 4:
                    lakes.append(pts)
    cities = []
    for f in load("places.geojson"):
        p = f["properties"]
        if p.get("ADM0_A3") != "RUS":
            continue
        pop = p.get("POP_MAX") or 0
        if pop < 400000 and p.get("ADM0CAP") != 1:
            continue
        cities.append({"n": p.get("NAME_RU") or p.get("NAME"), "c": [round(wrap(p["LONGITUDE"]), 3), round(p["LATITUDE"], 3)], "s": pop})
    cities.sort(key=lambda c: -c["s"])
    return {"regions": regions, "rivers": rivers, "lakes": lakes, "cities": cities}


def field() -> dict:
    elements = json.loads((SOURCE / "osm.json").read_text(encoding="utf-8"))["elements"]
    roads, rivers, water, places = [], [], [], []
    seen = set()
    for e in elements:
        tags = e.get("tags", {})
        if e["type"] == "node":
            name = tags.get("name:ru") or tags.get("name")
            if name and name not in seen:
                seen.add(name)
                places.append({"n": name, "k": tags.get("place"), "c": [round(e["lon"], 4), round(e["lat"], 4)]})
            continue
        coords = [[g["lon"], g["lat"]] for g in e.get("geometry", [])]
        if len(coords) < 2:
            continue
        highway = tags.get("highway")
        if highway:
            major = highway in ("motorway", "trunk", "primary")
            roads.append({"m": 1 if major else 0, "p": line(coords, 0.0004, 4)})
        elif tags.get("waterway") == "river":
            rivers.append(line(coords, 0.0003, 4))
        elif tags.get("natural") == "water" and coords[0] == coords[-1]:
            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            if max(xs) - min(xs) + max(ys) - min(ys) > 0.004:
                water.append(line(coords, 0.0004, 4))
    return {"roads": roads, "rivers": rivers, "water": water, "places": places}


TARGET.mkdir(parents=True, exist_ok=True)
for name, kind, data in (("country", "CountryData", country()), ("field", "FieldData", field())):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    header = f'import type {{ {kind} }} from "../map-data"'
    text = "\n".join([header, "", f"export const {name}Data: {kind} = {body}", ""])
    path = TARGET / f"{name}.gen.ts"
    path.write_text(text, encoding="utf-8", newline="\n")
    print(path.name, path.stat().st_size)
