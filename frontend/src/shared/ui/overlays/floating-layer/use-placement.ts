import { type RefObject, useLayoutEffect } from "react"
import { readPixels } from "../../../motion"
import { type LayerAlign, type LayerSide, placeLayer } from "../layer-host/place"

export type SpaceToken = `--space-${string}`

export interface PlacementOptions {
  readonly align: LayerAlign
  readonly prefer: LayerSide
  readonly gapToken: SpaceToken
  readonly matchWidth: boolean
}

function apply(anchor: HTMLElement, layer: HTMLElement, options: PlacementOptions): void {
  if (options.matchWidth) layer.style.minInlineSize = `${anchor.offsetWidth}px`
  const placement = placeLayer(
    anchor.getBoundingClientRect(),
    { width: layer.offsetWidth, height: layer.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    {
      align: options.align,
      prefer: options.prefer,
      gap: readPixels(options.gapToken),
      edge: readPixels("--space-8"),
    },
  )
  layer.dataset.side = placement.side
  layer.style.insetInlineStart = `${placement.x}px`
  layer.style.insetBlockStart = `${placement.y}px`
  layer.style.setProperty(
    "--layer-origin",
    `${placement.originX}px ${placement.side === "bottom" ? "0" : "100%"}`,
  )
}

export function usePlacement(
  anchor: RefObject<HTMLElement | null>,
  layer: RefObject<HTMLElement | null>,
  mounted: boolean,
  options: PlacementOptions,
): void {
  const { align, prefer, gapToken, matchWidth } = options
  useLayoutEffect(() => {
    if (!mounted) return
    const sync = () => {
      if (anchor.current !== null && layer.current !== null)
        apply(anchor.current, layer.current, { align, prefer, gapToken, matchWidth })
    }
    sync()
    window.addEventListener("resize", sync)
    window.addEventListener("scroll", sync, true)
    return () => {
      window.removeEventListener("resize", sync)
      window.removeEventListener("scroll", sync, true)
    }
  }, [anchor, layer, mounted, align, prefer, gapToken, matchWidth])
}
