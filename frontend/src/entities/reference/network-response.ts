import type { Network, RouteLine } from "./reference.types"

type NetworkResponse = Omit<Network, "lines"> & {
  readonly lines: (Omit<RouteLine, "points"> & { readonly points: number[][] })[]
}

export function parseNetwork(data: NetworkResponse): Network {
  return {
    ...data,
    lines: data.lines.map((line) => ({
      ...line,
      points: line.points.map((point): [number, number, number] => {
        const [distance, longitude, latitude] = point
        if (distance === undefined || longitude === undefined || latitude === undefined) {
          throw new Error("Invalid route coordinate")
        }
        return [distance, longitude, latitude]
      }),
    })),
  }
}
