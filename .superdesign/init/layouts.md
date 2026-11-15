# Shared layouts
## frontend/src/app/root-layout/root-layout.module.css

```css
.shell {
  grid-template-columns: minmax(0, 1fr);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-block-size: 100dvh;
}

.skip {
  composes: controlText from "../../shared/styles/compose.module.css";
  position: fixed;
  inset-block-start: var(--space-8);
  inset-inline-start: var(--space-8);
  z-index: var(--layer-skip-link);
  display: inline-flex;
  align-items: center;
  min-block-size: var(--target-min);
  padding-inline: var(--space-16);
  border-radius: var(--radius-md);
  background-color: var(--action-primary);
  color: var(--action-primary-text);
  transform: translateY(calc(-100% - var(--space-16)));
}

.skip:focus-visible {
  transform: none;
}

.main {
  min-inline-size: 0;
  padding: var(--space-16) var(--space-page);
  outline: none;
}

@media (min-width: 75rem) {
  .main {
    padding: var(--space-16) var(--space-page-wide);
  }
}

```

## frontend/src/app/root-layout/root-layout.tsx

```tsx
import { Outlet, ScrollRestoration } from "react-router"
import { useTranslation } from "@/shared/i18n"
import { AppHeader } from "../app-header/app-header"
import styles from "./root-layout.module.css"
import { useRouteFocus } from "./use-route-focus"

export function RootLayout() {
  const { t } = useTranslation()
  useRouteFocus()
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t("common:shell.skip")}
      </a>
      <AppHeader />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}

```

## frontend/src/app/app-header/app-header.tsx

```tsx
import { Link } from "react-router"
import { ThemeSwitch } from "@/features/theme-switch"
import { useTranslation } from "@/shared/i18n"
import { BrandMark, type BrandMarkState } from "@/shared/ui"
import { AppNav } from "../app-nav/app-nav"
import styles from "./app-header.module.css"

export interface AppHeaderProps {
  readonly brandState?: BrandMarkState
}

export function AppHeader({ brandState = "calm" }: AppHeaderProps) {
  const { t } = useTranslation()
  return (
    <header className={styles.header}>
      <Link to="/" viewTransition className={styles.brand} aria-label={t("common:nav.home")}>
        <BrandMark variant="lockup" state={brandState} />
      </Link>
      <AppNav />
      <div className={styles.controls}>
        <ThemeSwitch />
      </div>
    </header>
  )
}

```

## frontend/src/app/app-header/app-header.module.css

```css
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8) var(--space-16);
  min-block-size: var(--header-height);
  padding-block: var(--space-8);
  padding-inline: var(--space-page);
  border-block-end: var(--hairline) solid var(--border-subtle);
}

.brand {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-block-size: var(--target-min);
}

.controls {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
}

@media (min-width: 75rem) {
  .header {
    padding-inline: var(--space-page-wide);
  }
}

@media (width < 48rem) {
  .header > nav {
    order: 2;
    flex-basis: 100%;
  }
  .controls {
    margin-inline-start: auto;
  }
}

```

## frontend/src/app/app-nav/app-nav.tsx

```tsx
import { clsx } from "clsx"
import { NavLink } from "react-router"
import { type MessageKey, useTranslation } from "@/shared/i18n"
import { Icon, type IconName, ScrollArea } from "@/shared/ui"
import styles from "./app-nav.module.css"

interface NavItem {
  readonly to: string
  readonly label: MessageKey
  readonly icon: IconName
  readonly end?: boolean
}

const ITEMS: readonly NavItem[] = [
  { to: "/", label: "common:nav.pipes", icon: "pipe", end: true },
  { to: "/data", label: "common:nav.data", icon: "journal" },
  { to: "/model", label: "common:nav.model", icon: "chart" },
]

export function AppNav() {
  const { t } = useTranslation()
  return (
    <nav className={styles.nav} aria-label={t("common:nav.label")}>
      <ScrollArea axis="horizontal">
        <ul className={styles.list}>
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                viewTransition
                className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
              >
                <Icon name={item.icon} size="control" />
                <span>{t(item.label)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
  )
}

```

## frontend/src/app/app-nav/app-nav.module.css

```css
.nav {
  min-inline-size: 0;
}

.list {
  composes: plainList from "../../shared/styles/compose.module.css";

  display: flex;
  gap: var(--space-4);
}

.link {
  composes: controlFrame controlRow controlText from "../../shared/styles/compose.module.css";
  min-block-size: var(--target-min);
  color: var(--text-secondary);
  text-decoration: none;
}

.active {
  background-color: var(--surface-selected);
  color: var(--text-primary);
}

@media (hover: hover) and (pointer: fine) {
  .link:hover {
    color: var(--text-primary);
  }
}

```