import { createContext, type ReactNode, use, useState } from "react"
import { createPortal } from "react-dom"

const LayerRootContext = createContext<HTMLElement | null>(null)

export interface LayerHostProps {
  readonly children: ReactNode
}

export function LayerHost({ children }: LayerHostProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  return (
    <LayerRootContext value={root}>
      {children}
      <div ref={setRoot} data-layer-host="" />
    </LayerRootContext>
  )
}

export interface LayerPortalProps {
  readonly children: ReactNode
}

export function LayerPortal({ children }: LayerPortalProps) {
  const root = use(LayerRootContext)
  if (root === null && typeof document === "undefined") return null
  return createPortal(children, root ?? document.body)
}
