export type LayerSide = "top" | "bottom"
export type LayerAlign = "start" | "center" | "end"

export interface AnchorBox {
  readonly top: number
  readonly left: number
  readonly right: number
  readonly bottom: number
  readonly width: number
}

export interface BoxSize {
  readonly width: number
  readonly height: number
}

export interface PlaceOptions {
  readonly align: LayerAlign
  readonly prefer: LayerSide
  readonly gap: number
  readonly edge: number
}

export interface Placement {
  readonly x: number
  readonly y: number
  readonly side: LayerSide
  readonly originX: number
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, Math.max(low, high)))
}

function pickSide(anchor: AnchorBox, layer: BoxSize, viewport: BoxSize, options: PlaceOptions) {
  const below = viewport.height - anchor.bottom
  const above = anchor.top
  const needed = layer.height + options.gap + options.edge
  if (options.prefer === "bottom") return below < needed && above > below ? "top" : "bottom"
  return above < needed && below > above ? "bottom" : "top"
}

function rawX(anchor: AnchorBox, layer: BoxSize, align: LayerAlign): number {
  if (align === "end") return anchor.right - layer.width
  if (align === "center") return anchor.left + anchor.width / 2 - layer.width / 2
  return anchor.left
}

export function placeLayer(
  anchor: AnchorBox,
  layer: BoxSize,
  viewport: BoxSize,
  options: PlaceOptions,
): Placement {
  const side = pickSide(anchor, layer, viewport, options)
  const x = clamp(
    rawX(anchor, layer, options.align),
    options.edge,
    viewport.width - layer.width - options.edge,
  )
  const wantedY =
    side === "bottom" ? anchor.bottom + options.gap : anchor.top - options.gap - layer.height
  const y = clamp(wantedY, options.edge, viewport.height - layer.height - options.edge)
  const originX = clamp(anchor.left + anchor.width / 2 - x, 0, layer.width)
  return { x, y, side, originX }
}
