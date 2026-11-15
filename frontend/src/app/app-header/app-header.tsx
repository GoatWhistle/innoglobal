import { Link } from "react-router"
import { ThemeSwitch } from "@/features/theme-switch"
import { useTranslation } from "@/shared/i18n"
import { BrandMark, type BrandMarkState } from "@/shared/ui"
import { AppNav } from "../app-nav/app-nav"
import styles from "./app-header.module.css"

export interface AppHeaderProps {
  readonly brandState?: BrandMarkState
}

export function AppHeader({ brandState = "identity" }: AppHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Link to="/" viewTransition className={styles.brand} aria-label={t("common:nav.home")}>
          <BrandMark variant="lockup" state={brandState} />
        </Link>
      </div>
      <AppNav />
      <div className={styles.controls}>
        <ThemeSwitch />
      </div>
    </header>
  )
}
