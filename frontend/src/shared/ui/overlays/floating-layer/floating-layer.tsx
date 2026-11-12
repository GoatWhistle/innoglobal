import { clsx } from "clsx"
import { type HTMLAttributes, type ReactNode, type RefObject, useRef } from "react"
import { usePresence } from "../../../motion"
import { LayerPortal } from "../layer-host/layer-host"
import type { LayerAlign, LayerSide } from "../layer-host/place"
import styles from "./floating-layer.module.css"
import { type SpaceToken, usePlacement } from "./use-placement"

export interface FloatingLayerProps extends HTMLAttributes<HTMLDivElement> {
  readonly anchor: RefObject<HTMLElement | null>
  readonly open: boolean
  readonly align?: LayerAlign
  readonly prefer?: LayerSide
  readonly gapToken?: SpaceToken
  readonly matchWidth?: boolean
  readonly instant?: boolean
  readonly layerRef?: RefObject<HTMLDivElement | null>
  readonly children: ReactNode
}

export function FloatingLayer({
  anchor,
  open,
  align = "start",
  prefer = "bottom",
  gapToken = "--space-4",
  matchWidth = false,
  instant = false,
  layerRef,
  className,
  children,
  ...rest
}: FloatingLayerProps) {
  const ownRef = useRef<HTMLDivElement | null>(null)
  const ref = layerRef ?? ownRef
  const presence = usePresence(open, "--dur-fast-exit", instant)
  usePlacement(anchor, ref, presence.mounted, { align, prefer, gapToken, matchWidth })
  if (!presence.mounted) return null
  return (
    <LayerPortal>
      <div
        {...rest}
        ref={ref}
        className={clsx(styles.layer, className)}
        data-state={presence.state}
        data-instant={instant || undefined}
        data-motion="fade"
        onTransitionEnd={presence.onTransitionEnd}
      >
        {children}
      </div>
    </LayerPortal>
  )
}
