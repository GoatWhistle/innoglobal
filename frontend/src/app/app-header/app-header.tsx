import { Link, useLocation, useSearchParams } from "react-router"
import { usePipes } from "@/entities/pipe"
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
  const { pathname } = useLocation()
  const [search] = useSearchParams()
  const pipes = usePipes()
  const workspace = pathname === "/" || pathname === "/design/variants/inspection"
  const pipe =
    workspace && search.has("pipe")
      ? (pipes.data?.items.find((item) => item.pipe_id === Number(search.get("pipe"))) ??
        pipes.data?.items[0])
      : undefined
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Link to="/" viewTransition className={styles.brand} aria-label={t("common:nav.home")}>
          <BrandMark variant="lockup" state={brandState} />
        </Link>
        {pipe ? (
          <span className={styles.pipeName} title={pipe.passport.direction}>
            {pipe.passport.direction}
          </span>
        ) : null}
      </div>
      <AppNav />
      <div className={styles.controls}>
        <ThemeSwitch />
      </div>
    </header>
  )
}
