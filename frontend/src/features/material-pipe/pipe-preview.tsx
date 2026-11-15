import { useEffect, useRef, useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { Banner } from "@/shared/ui"
import { createPipe } from "./engine/engine.js"
import styles from "./pipe-preview.module.css"

export function PipePreview({ name }: { readonly name: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { t } = useTranslation()
  useEffect(() => {
    if (!host.current) return
    try {
      const engine = createPipe(host.current, name)
      engine.reset()
      return () => engine.dispose()
    } catch {
      setFailed(true)
    }
    return undefined
  }, [name])
  return (
    <div className={styles.preview}>
      <div ref={host} className={styles.host} />
      {failed ? <Banner tone="warning" title={t("pipe:restoration.fallback")} /> : null}
    </div>
  )
}
