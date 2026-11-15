type Coord = readonly number[]
type Path = readonly Coord[]

export interface CountryData {
  readonly regions: readonly {
    readonly n: string | null
    readonly c: Coord
    readonly p: readonly Path[]
  }[]
  readonly rivers: readonly Path[]
  readonly lakes: readonly Path[]
  readonly cities: readonly { readonly n: string | null; readonly c: Coord; readonly s: number }[]
}

export interface FieldData {
  readonly roads: readonly { readonly m: number; readonly p: Path }[]
  readonly rivers: readonly Path[]
  readonly water: readonly Path[]
  readonly places: readonly {
    readonly n: string | null
    readonly k: string | null
    readonly c: Coord
  }[]
}
