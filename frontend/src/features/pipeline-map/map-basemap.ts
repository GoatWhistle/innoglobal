import { type Frame, font, haloText, inWorld, pathOf, token } from "./map-frame"
import type { View } from "./map-geometry"
import {
  cities,
  countryRivers,
  fieldRivers,
  lakes,
  type MapLabel,
  places,
  regionLabels,
  regions,
  roads,
  water,
} from "./map-layers"

const FIELD_SPAN = 0.004
const REGION_SPAN = 0.03

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

interface Paths {
  readonly land: Path2D
  readonly lakes: Path2D
  readonly countryRivers: Path2D
  readonly water: Path2D
  readonly fieldRivers: Path2D
  readonly minorRoads: Path2D
  readonly majorRoads: Path2D
}

let cached: Paths | null = null

function paths(): Paths {
  cached ??= {
    land: pathOf(
      regions.flatMap((region) => region.rings),
      true,
    ),
    lakes: pathOf(lakes, true),
    countryRivers: pathOf(countryRivers, false),
    water: pathOf(water, true),
    fieldRivers: pathOf(fieldRivers, false),
    minorRoads: pathOf(
      roads.filter((road) => !road.major).map((road) => road.points),
      false,
    ),
    majorRoads: pathOf(
      roads.filter((road) => road.major).map((road) => road.points),
      false,
    ),
  }
  return cached
}

function stroke(frame: Frame, path: Path2D, color: string, width: number) {
  frame.ctx.strokeStyle = token(frame, color)
  frame.ctx.lineWidth = width / frame.scale
  frame.ctx.stroke(path)
}

export function paintBasemap(frame: Frame, view: View) {
  const close = view.width < FIELD_SPAN
  const layers = paths()
  const { ctx } = frame
  inWorld(frame, () => {
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.fillStyle = token(frame, "--surface-sunken")
    ctx.fill(layers.land, "evenodd")
    stroke(frame, layers.land, "--border-subtle", 1)
    ctx.fillStyle = token(frame, "--surface-base")
    ctx.fill(close ? layers.water : layers.lakes, "evenodd")
    stroke(
      frame,
      close ? layers.fieldRivers : layers.countryRivers,
      "--border-strong",
      close ? 1.25 : 0.75,
    )
    if (!close) return
    stroke(frame, layers.minorRoads, "--border-subtle", 1)
    stroke(frame, layers.majorRoads, "--border-strong", 1.75)
  })
}

function paintLabels(
  frame: Frame,
  labels: readonly MapLabel[],
  taken: Rect[],
  style: (label: MapLabel) => { size: number; weight: number; dot: boolean; color: string },
) {
  const { ctx, box } = frame
  const halo = token(frame, "--surface-sunken")
  ctx.textBaseline = "middle"
  for (const label of labels) {
    const x = frame.px(label.at[0])
    const y = frame.py(label.at[1])
    if (x < 0 || y < 0 || x > box.width || y > box.height) continue
    const look = style(label)
    ctx.font = font(frame, look.size, look.weight)
    const width = ctx.measureText(label.name).width
    const offset = look.dot ? 7 : -width / 2
    const rect = {
      left: x + offset - 4,
      top: y - look.size,
      right: x + offset + width + 4,
      bottom: y + look.size,
    }
    if (taken.some((item) => overlaps(item, rect))) continue
    taken.push(rect)
    ctx.fillStyle = look.color
    if (look.dot) {
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.textAlign = "left"
    haloText(frame, label.name, x + offset, y, halo)
  }
}

export function paintBasemapLabels(frame: Frame, view: View, taken: Rect[]) {
  const close = view.width < FIELD_SPAN
  const muted = token(frame, "--text-muted")
  const secondary = token(frame, "--text-secondary")
  if (close) {
    const ordered = [...places].sort((a, b) => b.rank - a.rank)
    paintLabels(frame, ordered, taken, (label) => ({
      size: label.rank > 1 ? 13 : 11,
      weight: label.rank > 1 ? 500 : 400,
      dot: true,
      color: label.rank > 1 ? secondary : muted,
    }))
    return
  }
  paintLabels(frame, cities, taken, () => ({ size: 12, weight: 500, dot: true, color: secondary }))
  if (view.width > REGION_SPAN)
    paintLabels(frame, regionLabels, taken, () => ({
      size: 11,
      weight: 400,
      dot: false,
      color: muted,
    }))
}

export type { Rect }
