import { type ReactNode, useEffect, useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { Card, CloseButton, Drawer } from "@/shared/ui"
import styles from "./dashboards-page.module.css"
export function DashboardPanel({
  open,
  onClose,
  children,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
}) {
  const { t } = useTranslation()
  const [desktop, setDesktop] = useState(() => matchMedia("(min-width: 64rem)").matches)
  useEffect(() => {
    const media = matchMedia("(min-width: 64rem)")
    const update = () => setDesktop(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  if (!desktop)
    return (
      <Drawer open={open} onClose={onClose} title={t("variants:dash.add")}>
        {children}
      </Drawer>
    )
  return (
    <aside hidden={!open} className={styles.panel} aria-label={t("variants:dash.add")}>
      <header>
        <Card as="div" appearance="plain" title={t("variants:dash.add")}>
          {null}
        </Card>
        <CloseButton onClick={onClose} />
      </header>
      {children}
    </aside>
  )
}
