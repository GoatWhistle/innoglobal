import { type ReactNode, useId, useState } from "react"
import { useInputModality, usePresence } from "../../../motion"
import { Button } from "../../primitives/button/button"
import styles from "./disclosure.module.css"

export interface DisclosureProps {
  readonly title: string
  readonly children: ReactNode
  readonly defaultOpen?: boolean
}
export function Disclosure({ title, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const modality = useInputModality()
  const presence = usePresence(open, "--dur-fast-exit", modality.instant)
  return (
    <section className={styles.disclosure}>
      <Button
        variant="quiet"
        icon={open ? "chevron-up" : "chevron-down"}
        aria-expanded={open}
        aria-controls={id}
        onKeyDown={modality.onKeyDown}
        onPointerDown={modality.onPointerDown}
        onClick={() => setOpen(!open)}
      >
        {title}
      </Button>
      <div
        id={id}
        hidden={!presence.mounted}
        inert={!open}
        className={styles.body}
        data-state={presence.state}
        data-instant={modality.instant}
        onAnimationEnd={presence.onAnimationEnd}
      >
        {children}
      </div>
    </section>
  )
}
