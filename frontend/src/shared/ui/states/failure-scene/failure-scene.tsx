import type { ReactNode } from "react"
import styles from "./failure-scene.module.css"
import { FlangeDrawing } from "./flange-drawing"

export interface FailureSceneProps {
  readonly eyebrow: string
  readonly title: string
  readonly callout: string
  readonly code?: readonly [string, string] | undefined
  readonly leaking?: boolean
  readonly children: ReactNode
  readonly actions: ReactNode
  readonly details?: ReactNode
}

export function FailureScene({
  eyebrow,
  title,
  callout,
  code,
  leaking = false,
  children,
  actions,
  details,
}: FailureSceneProps) {
  return (
    <section className={styles.scene}>
      <div
        className={styles.figure}
        data-code={code === undefined ? undefined : true}
        data-leaking={leaking || undefined}
      >
        <span className={styles.axis} aria-hidden="true" />
        {code === undefined ? null : (
          <span className={styles.digit} aria-hidden="true">
            {code[0]}
          </span>
        )}
        <span className={styles.zero}>
          <FlangeDrawing leaking={leaking} />
          <span className={styles.callout} aria-hidden="true">
            {callout}
          </span>
        </span>
        {code === undefined ? null : (
          <span className={styles.digit} aria-hidden="true">
            {code[1]}
          </span>
        )}
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.text}>{children}</div>
        <div className={styles.actions}>{actions}</div>
        {details}
      </div>
    </section>
  )
}
