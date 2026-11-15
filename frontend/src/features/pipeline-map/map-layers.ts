import { countryData as country } from "./data/country.gen"
import { fieldData as field } from "./data/field.gen"
import { type Point, project } from "./map-geometry"

type Raw = readonly (readonly number[])[]

export interface MapLabel {
  readonly name: string
  readonly at: Point
  readonly rank: number
}

const toPoints = (raw: Raw): Point[] => raw.map((p) => project(p[0] ?? 0, p[1] ?? 0))
const at = (raw: readonly number[]): Point => project(raw[0] ?? 0, raw[1] ?? 0)

export const regions = country.regions.map((region) => ({
  name: region.n ?? "",
  at: at(region.c),
  rings: region.p.map(toPoints),
}))

export const countryRivers = country.rivers.map(toPoints)
export const lakes = country.lakes.map(toPoints)

export const cities: readonly MapLabel[] = country.cities.map((city) => ({
  name: city.n ?? "",
  at: at(city.c),
  rank: city.s,
}))

export const roads = field.roads.map((road) => ({ major: road.m === 1, points: toPoints(road.p) }))
export const fieldRivers = field.rivers.map(toPoints)
export const water = field.water.map(toPoints)

export const places: readonly MapLabel[] = field.places.map((place) => ({
  name: place.n ?? "",
  at: at(place.c),
  rank: place.k === "town" ? 2 : 1,
}))

export const regionLabels: readonly MapLabel[] = regions.map((region) => ({
  name: region.name,
  at: region.at,
  rank: 0,
}))
