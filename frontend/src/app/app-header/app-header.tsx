import { Link } from "react-router"
import { LocaleSwitch } from "@/features/locale-switch"
import { ThemeSwitch } from "@/features/theme-switch"
import { BrandMark, type BrandMarkState } from "@/shared/ui"
import styles from "./app-header.module.css"

export interface AppHeaderProps {
  readonly brandState?: BrandMarkState
}

export function AppHeader({ brandState = "calm" }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <Link to="/" viewTransition className={styles.brand}>
        <BrandMark variant="lockup" state={brandState} />
      </Link>
      <div className={styles.controls}>
        <LocaleSwitch />
        <ThemeSwitch />
      </div>
    </header>
  )
}
