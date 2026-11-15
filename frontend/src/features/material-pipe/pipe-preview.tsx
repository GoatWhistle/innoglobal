import { useEffect, useRef, useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { Banner } from "@/shared/ui"
import { createPipe, type MaterialEngine } from "./engine/engine.js"
import styles from "./pipe-preview.module.css"

export interface PipePreviewProps {
  readonly name: string
  readonly order?: number
  readonly stirred?: boolean
}

export function PipePreview({ name, order = 0, stirred = false }: PipePreviewProps) {
  const host = useRef<HTMLDivElement>(null)
  const engine = useRef<MaterialEngine | null>(null)
  const [failed, setFailed] = useState(false)
  const { t } = useTranslation()
  useEffect(() => {
    if (!host.current) return
    try {
      const created = createPipe(host.current, name, undefined, {
        intro: { delay: 0.2 + order * 0.14 },
      })
      created.reset()
      engine.current = created
      return () => {
        engine.current = null
        created.dispose()
      }
    } catch {
      setFailed(true)
    }
    return undefined
  }, [name, order])
  useEffect(() => {
    if (stirred) engine.current?.nudge()
  }, [stirred])
  return (
    <div className={styles.preview}>
      <div ref={host} className={styles.host} />
      {failed ? <Banner tone="warning" title={t("pipe:restoration.fallback")} /> : null}
    </div>
  )
}
