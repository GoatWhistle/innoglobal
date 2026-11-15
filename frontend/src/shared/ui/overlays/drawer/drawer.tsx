import { type ReactNode, useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { useInputModality, usePresence } from "../../../motion"
import { CloseButton } from "../../primitives/close-button/close-button"
import styles from "./drawer.module.css"

export interface DrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly size?: "default" | "wide"
  readonly children: ReactNode
}

export function Drawer({ open, onClose, title, children, size = "default" }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const modality = useInputModality()
  const presence = usePresence(open, "--dur-exit", modality.instant)
  useEffect(() => {
    const element = dialog.current
    if (presence.mounted && !element?.open) {
      element?.showModal()
      heading.current?.focus()
    } else if (!presence.mounted) element?.close()
  }, [presence.mounted])
  return createPortal(
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-labelledby={id}
      data-state={presence.state}
      data-size={size}
      data-instant={modality.instant}
      onTransitionEnd={presence.onTransitionEnd}
      onKeyDown={modality.onKeyDown}
      onPointerDownCapture={modality.onPointerDown}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={id} ref={heading} tabIndex={-1}>
            {title}
          </h2>
          <CloseButton onClick={onClose} />
        </header>
        <div className={styles.body} inert={!open}>
          {children}
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
