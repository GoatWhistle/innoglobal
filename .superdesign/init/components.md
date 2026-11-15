# Shared primitives
## frontend/src/shared/ui/states/state-panel/state-panel.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./state-panel.module.css"

export type StatePanelTone = "neutral" | "warning" | "danger"

export interface StatePanelProps {
  readonly icon: IconName
  readonly title: string
  readonly description?: ReactNode
  readonly meta?: ReactNode
  readonly actions?: ReactNode
  readonly tone?: StatePanelTone
  readonly role?: "alert" | "status" | undefined
  readonly className?: string | undefined
}

export function StatePanel({
  icon,
  title,
  description,
  meta,
  actions,
  tone = "neutral",
  role,
  className,
}: StatePanelProps) {
  return (
    <div className={clsx(styles.panel, className)} data-tone={tone} role={role} data-motion="fade">
      <Icon name={icon} size="xl" className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description === undefined ? null : <p className={styles.text}>{description}</p>}
      {meta === undefined ? null : <p className={styles.meta}>{meta}</p>}
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

```

## frontend/src/shared/ui/states/state-panel/state-panel.module.css

```css
.panel {
  composes: statePanel from "../../../styles/compose.module.css";
  align-items: start;
  gap: var(--space-12);
  padding: var(--space-32);
  text-align: start;
}

.icon {
  color: var(--text-muted);
}

.panel[data-tone="danger"] .icon {
  color: var(--text-danger);
}

.panel[data-tone="warning"] .icon {
  color: var(--text-warning);
}

.title {
  composes: subheadingText from "../../../styles/compose.module.css";
  margin-block-start: var(--space-8);
  font-weight: var(--weight-regular);
}

.text {
  composes: secondaryText from "../../../styles/compose.module.css";
  max-inline-size: var(--prose-measure);
  margin-block-end: var(--space-8);
  overflow-wrap: anywhere;
}

.meta {
  composes: mutedCaption from "../../layout/text-role/text-role.module.css";
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4) var(--space-16);
  font-variant-numeric: var(--font-numeric);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-12) var(--space-16);
}

```

## frontend/src/shared/ui/states/error-state/error-state.tsx

```tsx
import type { ReactNode } from "react"
import { useTranslation } from "../../../i18n"
import { Button } from "../../primitives/button/button"
import type { IconName } from "../../primitives/icon/icon"
import { StatePanel, type StatePanelTone } from "../state-panel/state-panel"

export interface ErrorStateProps {
  readonly title: string
  readonly description?: ReactNode | undefined
  readonly meta?: ReactNode | undefined
  readonly icon?: IconName | undefined
  readonly tone?: Exclude<StatePanelTone, "warning"> | undefined
  readonly onRetry?: (() => void) | undefined
  readonly retryPending?: boolean | undefined
  readonly retryLabel?: string | undefined
  readonly extraAction?: ReactNode
  readonly className?: string | undefined
}

export function ErrorState({
  title,
  description,
  meta,
  icon = "error",
  tone = "danger",
  onRetry,
  retryPending = false,
  retryLabel,
  extraAction,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation()
  const retry =
    onRetry === undefined ? null : (
      <Button icon="refresh" pending={retryPending} onClick={onRetry}>
        {retryLabel ?? t("common:action.retry")}
      </Button>
    )
  const hasActions = retry !== null || extraAction !== undefined
  return (
    <StatePanel
      role="alert"
      icon={icon}
      tone={tone}
      title={title}
      description={description}
      meta={meta}
      actions={
        hasActions ? (
          <>
            {retry}
            {extraAction}
          </>
        ) : undefined
      }
      className={className}
    />
  )
}

```

## frontend/src/shared/ui/states/skeleton/skeleton.module.css

```css
.group {
  display: grid;
  gap: var(--space-12);
  inline-size: 100%;
}

.bone {
  display: block;
  background-color: var(--surface-skeleton);
  animation: var(--motion-shimmer);
}

.line {
  block-size: var(--space-12);
}

.line:last-child:not(:first-child) {
  inline-size: 60%;
}

.block {
  block-size: var(--space-64);
}

.readout {
  inline-size: 80%;
  block-size: var(--space-40);
}

```

## frontend/src/shared/ui/states/skeleton/skeleton.tsx

```tsx
import { clsx } from "clsx"
import styles from "./skeleton.module.css"

export type SkeletonShape = "line" | "block" | "readout"

export interface SkeletonProps {
  readonly shape?: SkeletonShape | undefined
  readonly lines?: number | undefined
  readonly className?: string | undefined
}

const SHAPE_CLASS: Readonly<Record<SkeletonShape, string | undefined>> = {
  line: styles.line,
  block: styles.block,
  readout: styles.readout,
}

export function Skeleton({ shape = "line", lines = 1, className }: SkeletonProps) {
  const count = shape === "line" ? Math.max(1, Math.trunc(lines)) : 1
  return (
    <span className={clsx(styles.group, className)} aria-hidden="true" data-skeleton={shape}>
      {Array.from({ length: count }, (_, index) => `bone-${index}`).map((bone) => (
        <span key={bone} className={clsx(styles.bone, SHAPE_CLASS[shape])} />
      ))}
    </span>
  )
}

```

## frontend/src/shared/ui/states/query-view/query-view.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import { useErrorText, useTranslation } from "../../../i18n"
import { useLoadingIndicator } from "../../../motion"
import { Button } from "../../primitives/button/button"
import { Banner } from "../banner/banner"
import { ErrorState } from "../error-state/error-state"
import styles from "./query-view.module.css"

export interface QueryLike<T> {
  readonly data: T | undefined
  readonly error: unknown
  readonly isError: boolean
  readonly isFetching: boolean
  readonly refetch: () => unknown
}

export interface QueryViewProps<T> {
  readonly query: QueryLike<T>
  readonly label: string
  readonly skeleton: ReactNode
  readonly children: (data: T) => ReactNode
  readonly className?: string | undefined
}

export function QueryView<T>({ query, label, skeleton, children, className }: QueryViewProps<T>) {
  const errorText = useErrorText()
  const { t } = useTranslation()
  const hasData = query.data !== undefined
  const indicator = useLoadingIndicator({ pending: query.isFetching && !query.isError, hasData })
  if (query.isError && !hasData) {
    return (
      <ErrorState
        className={className}
        title={errorText(query.error)}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }
  if (query.data === undefined) {
    return (
      <div className={clsx(styles.loading, className)} role="status" aria-label={label}>
        {indicator === "skeleton" ? skeleton : null}
      </div>
    )
  }
  return (
    <div
      className={clsx(styles.ready, indicator === "stale" && styles.stale, className)}
      aria-busy={indicator === "stale" || undefined}
    >
      {query.isError ? (
        <Banner
          tone="warning"
          title={t("common:state.stale")}
          actions={
            <Button
              variant="secondary"
              size="compact"
              icon="refresh"
              onClick={() => {
                void query.refetch()
              }}
            >
              {t("common:action.retry")}
            </Button>
          }
        />
      ) : null}
      {children(query.data)}
    </div>
  )
}

```

## frontend/src/shared/ui/states/query-view/query-view.module.css

```css
.loading {
  min-block-size: var(--state-min-height);
}

.ready {
  display: contents;
}

.stale {
  display: block;
  opacity: var(--opacity-stale);
  transition: var(--transition-control);
}

```

## frontend/src/shared/ui/states/empty-state/empty-state.tsx

```tsx
import type { ReactNode } from "react"
import type { IconName } from "../../primitives/icon/icon"
import { StatePanel } from "../state-panel/state-panel"

export interface EmptyStateProps {
  readonly title: string
  readonly description?: string | undefined
  readonly icon: IconName
  readonly action?: ReactNode
  readonly className?: string | undefined
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <StatePanel
      icon={icon}
      title={title}
      description={description}
      actions={action}
      className={className}
    />
  )
}

```

## frontend/src/shared/ui/states/spinner/spinner.module.css

```css
.spinner {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  color: var(--text-secondary);
  animation: var(--motion-fade-in);
}

.bare {
  display: inline-flex;
  flex: none;
}

.ring {
  display: inline-block;
  flex: none;
  inline-size: var(--icon-sm);
  block-size: var(--icon-sm);
  border: var(--border-width-control) solid var(--border-strong);
  border-block-start-color: currentColor;
  border-radius: var(--radius-round);
  animation: var(--motion-spin);
}

.control {
  inline-size: var(--icon-control);
  block-size: var(--icon-control);
}

.lg {
  inline-size: var(--icon-lg);
  block-size: var(--icon-lg);
}

.label {
  font-size: var(--font-size-body-sm);
}

```

## frontend/src/shared/ui/states/spinner/spinner.tsx

```tsx
import { clsx } from "clsx"
import { useReducedMotion } from "../../../motion"
import styles from "./spinner.module.css"

export type SpinnerSize = "sm" | "control" | "lg"

export interface SpinnerProps {
  readonly label?: string | undefined
  readonly size?: SpinnerSize
  readonly className?: string | undefined
}

const SIZE_CLASS: Readonly<Record<SpinnerSize, string | undefined>> = {
  sm: undefined,
  control: styles.control,
  lg: styles.lg,
}

export function Spinner({ label, size = "sm", className }: SpinnerProps) {
  const reduced = useReducedMotion()
  const ring = <span className={clsx(styles.ring, SIZE_CLASS[size])} aria-hidden="true" />
  if (label === undefined) return <span className={clsx(styles.bare, className)}>{ring}</span>
  return (
    <span className={clsx(styles.spinner, className)} role="status">
      {ring}
      <span className={reduced ? styles.label : "visually-hidden"}>{label}</span>
    </span>
  )
}

```

## frontend/src/shared/ui/states/banner/banner.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import { CloseButton } from "../../primitives/close-button/close-button"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./banner.module.css"

export type BannerTone = "info" | "warning" | "danger" | "system"

export const BANNER_ICON: Readonly<Record<BannerTone, IconName>> = {
  info: "info",
  warning: "warning",
  danger: "alarm",
  system: "offline",
}

export interface BannerProps {
  readonly tone: BannerTone
  readonly title: string
  readonly children?: ReactNode
  readonly icon?: IconName | undefined
  readonly actions?: ReactNode
  readonly onDismiss?: (() => void) | undefined
  readonly dismissLabel?: string | undefined
  readonly edgeToEdge?: boolean
  readonly className?: string | undefined
}

export function Banner({
  tone,
  title,
  children,
  icon,
  actions,
  onDismiss,
  dismissLabel,
  edgeToEdge = false,
  className,
}: BannerProps) {
  const hasActions = actions !== undefined || onDismiss !== undefined
  return (
    <div
      className={clsx(styles.banner, edgeToEdge && styles.edge, className)}
      data-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
      data-motion="fade"
    >
      <Icon name={icon ?? BANNER_ICON[tone]} size="md" className={styles.icon} />
      <p className={styles.text}>
        <b className={styles.title}>{title}</b> {children}
      </p>
      {hasActions ? (
        <div className={styles.actions}>
          {actions}
          {onDismiss === undefined ? null : (
            <CloseButton
              size="compact"
              label={dismissLabel}
              onClick={onDismiss}
              className={styles.close}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

```

## frontend/src/shared/ui/states/banner/banner.module.css

```css
.banner {
  composes: secondaryText from "../../../styles/compose.module.css";
  /* biome-ignore lint/suspicious/noDuplicateProperties: composes text and framing */
  composes: frame from "../../primitives/surface/surface.module.css";
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-12);
  align-items: center;
  min-block-size: calc(var(--space-48) + var(--space-8));
  padding: var(--space-8) var(--space-8) var(--space-8) var(--space-16);
  background-color: var(--surface-raised);
  animation: var(--motion-fade-in);
}

.edge {
  border-inline: 0;
  border-radius: 0;
}

.text {
  padding-block: var(--space-4);
}

.title {
  color: var(--text-primary);
  font-weight: var(--weight-medium);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.banner[data-tone="danger"] {
  border-color: var(--status-danger);
  background-color: var(--surface-raised);
}

.banner[data-tone="warning"] {
  border-color: var(--status-warning);
  background-color: var(--surface-raised);
}

.banner[data-tone="danger"] :is(.icon, .title) {
  color: var(--text-danger);
}

.banner[data-tone="warning"] :is(.icon, .title) {
  color: var(--text-warning);
}

.banner[data-tone="danger"] .icon {
  animation: var(--motion-alarm);
}

.banner[data-tone="system"] {
  border-color: var(--surface-inverse);
  background-color: var(--surface-inverse);
  color: var(--text-on-inverse);
}

.banner[data-tone="system"] :is(.text, .title, .close) {
  color: var(--text-on-inverse);
}

@media (max-width: 47.99rem) {
  .banner {
    align-items: start;
  }

  .icon {
    margin-block-start: var(--space-8);
  }

  .actions {
    grid-column: 2 / -1;
    flex-wrap: wrap;
  }
}

```

## frontend/src/shared/ui/data-display/status-badge/status-badge.module.css

```css
.badge {
  composes: pill from "../../primitives/pill/pill.module.css";
  gap: calc(var(--space-4) + var(--space-2));
  min-block-size: calc(var(--space-24) + var(--space-4));
  padding-inline: var(--space-8) var(--space-12);
  border: var(--hairline) solid var(--border-subtle);
  color: var(--text-primary);
  font-size: var(--font-size-label);
  line-height: var(--line-height-label);
  font-variant-numeric: var(--font-numeric);
}

.compact {
  min-block-size: var(--space-24);
  padding-inline: calc(var(--space-4) + var(--space-2)) var(--space-8);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge[data-tone="warning"] {
  border-color: var(--status-warning);
  background-color: var(--surface-raised);
  color: var(--text-warning);
}

.badge[data-tone="danger"] {
  border-color: var(--status-danger);
  background-color: var(--surface-raised);
  color: var(--text-danger);
}

.badge[data-tone="danger"] .icon {
  animation: var(--motion-alarm);
}

.badge[data-tone="muted"] {
  border-style: dashed;
  color: var(--text-muted);
}

.badge[data-tone="off"] {
  border-color: var(--border-subtle);
  color: var(--text-muted);
}

.spinner {
  margin-inline: var(--space-2);
}

```

## frontend/src/shared/ui/data-display/status-badge/status-badge.tsx

```tsx
import { clsx } from "clsx"
import { Icon, type IconName } from "../../primitives/icon/icon"
import { Spinner } from "../../states/spinner/spinner"
import styles from "./status-badge.module.css"

export type StatusTone = "normal" | "warning" | "danger" | "muted" | "off" | "pending"
export type StatusBadgeSize = "regular" | "compact"

export const STATUS_ICON: Readonly<Record<StatusTone, IconName | null>> = {
  normal: "check",
  warning: "warning",
  danger: "alarm",
  muted: "sensor-off",
  off: "shut",
  pending: null,
}

const SIZE_CLASS: Readonly<Record<StatusBadgeSize, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface StatusBadgeProps {
  readonly tone: StatusTone
  readonly label: string
  readonly icon?: IconName | undefined
  readonly size?: StatusBadgeSize
  readonly live?: boolean
  readonly className?: string | undefined
}

export function StatusBadge({
  tone,
  label,
  icon,
  size = "regular",
  live = false,
  className,
}: StatusBadgeProps) {
  const glyph = icon ?? STATUS_ICON[tone]
  return (
    <span
      className={clsx(styles.badge, SIZE_CLASS[size], className)}
      data-tone={tone}
      role={live ? "status" : undefined}
    >
      {glyph === null ? (
        <Spinner className={styles.spinner} />
      ) : (
        <Icon name={glyph} size="sm" className={styles.icon} />
      )}
      <span className={styles.label}>{label}</span>
    </span>
  )
}

```

## frontend/src/shared/ui/data-display/stat/stat.module.css

```css
.stat {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  min-inline-size: 0;
}

.label {
  composes: secondaryText from "../../../styles/compose.module.css";
}

.body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-4);
}

.value {
  font-size: var(--font-size-readout-sm);
  font-weight: var(--weight-light);
  font-variant-numeric: var(--font-numeric);
  line-height: var(--line-height-readout-sm);
  letter-spacing: var(--tracking-tight);
}

.large .value {
  letter-spacing: var(--tracking-readout);
}

.unit {
  color: var(--text-secondary);
  font-size: var(--font-size-body-sm);
}

.hint {
  composes: captionText from "../../../styles/compose.module.css";
}

.largeNumber {
  composes: readoutNumber from "../../../styles/compose.module.css";
}

```

## frontend/src/shared/ui/data-display/stat/stat.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./stat.module.css"

export type StatSize = "regular" | "large"

const SIZE_CLASS: Readonly<Record<StatSize, string | undefined>> = {
  regular: undefined,
  large: styles.large,
}

export interface StatProps {
  readonly label: ReactNode
  readonly value: ReactNode
  readonly unit?: ReactNode
  readonly hint?: ReactNode
  readonly size?: StatSize
  readonly className?: string | undefined
}

export function Stat({ label, value, unit, hint, size = "regular", className }: StatProps) {
  return (
    <div className={clsx(styles.stat, SIZE_CLASS[size], className)}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.body}>
        <span className={clsx(styles.value, size === "large" && styles.largeNumber)}>{value}</span>
        {unit === undefined ? null : <span className={styles.unit}>{unit}</span>}
      </dd>
      {hint === undefined ? null : <dd className={styles.hint}>{hint}</dd>}
    </div>
  )
}

```

## frontend/src/shared/ui/data-display/bar-list/bar-list.tsx

```tsx
import { clsx } from "clsx"
import type { CSSProperties, ReactNode } from "react"
import styles from "./bar-list.module.css"

export interface BarItem {
  readonly id: string
  readonly label: ReactNode
  readonly share: number
  readonly value: ReactNode
  readonly meta?: ReactNode
  readonly emphasis?: boolean
}

export interface BarListProps {
  readonly label: string
  readonly items: readonly BarItem[]
  readonly className?: string | undefined
}

export function BarList({ label, items, className }: BarListProps) {
  return (
    <ul className={clsx(styles.list, className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className={clsx(styles.item, item.emphasis && styles.emphasis)}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
          <span
            className={styles.track}
            aria-hidden="true"
            style={{ "--share": Math.max(0, Math.min(1, item.share)) } as CSSProperties}
          >
            <span className={styles.fill} />
          </span>
          {item.meta === undefined ? null : <span className={styles.meta}>{item.meta}</span>}
        </li>
      ))}
    </ul>
  )
}

```

## frontend/src/shared/ui/data-display/bar-list/bar-list.module.css

```css
.list {
  composes: plainList from "../../../styles/compose.module.css";

  display: grid;
  gap: var(--space-12);
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-4) var(--space-12);
  font-size: var(--font-size-body-sm);
  line-height: var(--line-height-body-sm);
}

.label {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.value {
  font-variant-numeric: var(--font-numeric);
  font-weight: var(--weight-medium);
}

.track {
  grid-column: 1 / -1;
  display: block;
  block-size: var(--space-4);
  border-radius: var(--radius-pill);
  background-color: var(--surface-sunken);
  overflow: hidden;
}

.fill {
  display: block;
  block-size: 100%;
  background-color: var(--chart-model);
  transform: scaleX(var(--share));
  transform-origin: left center;
}

.emphasis .fill {
  background-color: var(--chart-measured);
}

.meta {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-size: var(--font-size-caption);
}

```

## frontend/src/shared/ui/data-display/stat-grid/stat-grid.module.css

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-16) var(--space-24);
  margin: 0;
}

.ruled {
  padding-block: var(--space-16);
  border-block: var(--hairline) solid var(--border-subtle);
}

```

## frontend/src/shared/ui/data-display/stat-grid/stat-grid.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./stat-grid.module.css"

export type StatGridLook = "plain" | "ruled"

const LOOK_CLASS: Readonly<Record<StatGridLook, string | undefined>> = {
  plain: undefined,
  ruled: styles.ruled,
}

export interface StatGridProps {
  readonly look?: StatGridLook
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function StatGrid({ look = "plain", className, children }: StatGridProps) {
  return <dl className={clsx(styles.grid, LOOK_CLASS[look], className)}>{children}</dl>
}

```

## frontend/src/shared/ui/data-display/scatter-plot/scatter-plot.tsx

```tsx
import { useRef } from "react"
import { useElementWidth } from "../../../hooks"
import { useFormatters } from "../../../i18n"
import styles from "./scatter-plot.module.css"

export interface ScatterPoint {
  readonly id: string
  readonly x: number
  readonly y: number
}

export interface ScatterPlotProps {
  readonly points: readonly ScatterPoint[]
  readonly label: string
  readonly xLabel: string
  readonly yLabel: string
}

const START = 54

export function ScatterPlot({ points, label, xLabel, yLabel }: ScatterPlotProps) {
  const format = useFormatters()
  const frame = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frame, 428)
  const size = Math.min(width, 428) - 28
  const end = size - 24
  const values = points.flatMap((point) => [point.x, point.y])
  const low = Math.floor(Math.min(...values, 0))
  const high = Math.max(low + 1, Math.ceil(Math.max(...values, 1)))
  const position = (value: number) => START + ((value - low) / (high - low)) * (end - START)
  const ticks = Array.from({ length: 5 }, (_, i) => low + ((high - low) * i) / 4)
  return (
    <div className={styles.frame} ref={frame}>
      <svg
        className={styles.plot}
        viewBox={`0 0 ${size + 28} ${size + 48}`}
        role="img"
        aria-label={label}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={START}
              x2={end}
              y1={size - position(tick)}
              y2={size - position(tick)}
            />
            <text
              className={styles.label}
              x={position(tick)}
              y={size - START + 22}
              textAnchor="middle"
            >
              {format.number(tick, 1)}
            </text>
            <text
              className={styles.label}
              x={START - 10}
              y={size - position(tick)}
              dy="0.32em"
              textAnchor="end"
            >
              {format.number(tick, 1)}
            </text>
          </g>
        ))}
        <path className={styles.axis} d={`M${START} ${size - end}V${size - START}H${end}`} />
        <line className={styles.identity} x1={START} x2={end} y1={size - START} y2={size - end} />
        {points.map((point) => (
          <circle
            key={point.id}
            className={styles.point}
            cx={position(point.x)}
            cy={size - position(point.y)}
            r={3}
          />
        ))}
        <text
          className={styles.title}
          x={(START + end) / 2}
          y={size - START + 48}
          textAnchor="middle"
        >
          {xLabel}
        </text>
        <text className={styles.title} x={START} y={size - end - 10}>
          {yLabel}
        </text>
      </svg>
    </div>
  )
}

```

## frontend/src/shared/ui/data-display/scatter-plot/scatter-plot.module.css

```css
.frame {
  min-inline-size: 0;
}

.plot {
  display: block;
  inline-size: 100%;
  max-block-size: 28rem;
  font-family: var(--font-sans);
}
.grid {
  stroke: var(--chart-grid);
  stroke-width: var(--hairline);
}
.axis {
  fill: none;
  stroke: var(--chart-axis);
  stroke-width: var(--hairline);
}
.identity {
  stroke: var(--text-secondary);
  stroke-width: var(--hairline);
  stroke-dasharray: 5 4;
}
.point {
  fill: var(--chart-measured);
}
.label {
  fill: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-variant-numeric: var(--font-numeric);
}
.title {
  fill: var(--text-primary);
  font-size: var(--font-size-label);
}

```

## frontend/src/shared/ui/data-display/data-table/data-table.module.css

```css
.scroll {
  min-inline-size: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
  font-variant-numeric: var(--font-numeric);
  line-height: var(--line-height-body-sm);
}

.table th,
.table td {
  padding: var(--cell-padding);
  border-block-end: var(--hairline) solid var(--border-subtle);
  text-align: start;
  vertical-align: middle;
}

.table thead th {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: var(--weight-medium);
  white-space: nowrap;
}

.table td[data-numeric],
.table th[data-numeric] {
  text-align: end;
  white-space: nowrap;
}

.table tbody tr[aria-selected="true"] {
  background-color: var(--surface-selected);
}

.compact th,
.compact td {
  padding: var(--cell-padding-compact);
}

```

## frontend/src/shared/ui/data-display/data-table/data-table.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./data-table.module.css"

export type DataTableDensity = "regular" | "compact"

const DENSITY_CLASS: Readonly<Record<DataTableDensity, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface DataTableProps {
  readonly label: string
  readonly head: ReactNode
  readonly children: ReactNode
  readonly density?: DataTableDensity
  readonly className?: string | undefined
}

export function DataTable({
  label,
  head,
  children,
  density = "regular",
  className,
}: DataTableProps) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable table must be keyboard reachable
    <section className={clsx(styles.scroll, className)} tabIndex={0}>
      <table aria-label={label} className={clsx(styles.table, DENSITY_CLASS[density])}>
        <thead>{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  )
}

```

## frontend/src/shared/ui/primitives/kbd/kbd.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./kbd.module.css"

export interface KbdProps {
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Kbd({ className, children }: KbdProps) {
  return <kbd className={clsx(styles.kbd, className)}>{children}</kbd>
}

```

## frontend/src/shared/ui/primitives/kbd/kbd.module.css

```css
.kbd {
  composes: recessed from "../surface/surface.module.css";
  display: inline-grid;
  place-items: center;
  min-inline-size: var(--icon-md);
  block-size: var(--icon-md);
  padding-inline: var(--space-4);
  border: var(--hairline) solid var(--border-strong);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--font-size-micro);
  line-height: 1;
  font-variant-numeric: var(--font-numeric);
}

```

## frontend/src/shared/ui/primitives/no-value/no-value.module.css

```css
.none {
  color: var(--text-muted);
  font-variant-numeric: var(--font-numeric);
}

.none[data-reason] {
  cursor: help;
  text-decoration: underline dotted var(--border-strong);
  text-underline-offset: var(--space-4);
}

```

## frontend/src/shared/ui/primitives/no-value/no-value.tsx

```tsx
import { useTranslation } from "../../../i18n"
import { Tooltip } from "../../overlays/tooltip/tooltip"
import styles from "./no-value.module.css"

export interface NoValueProps {
  readonly label?: string | undefined
  readonly text?: string | undefined
  readonly reason?: string | undefined
}

export function NoValue({ label, text, reason }: NoValueProps) {
  const { t } = useTranslation()
  const word = (
    <span
      className={styles.none}
      data-no-value=""
      data-reason={reason === undefined ? undefined : ""}
    >
      <span aria-hidden="true">{text ?? t("common:value.none")}</span>
      <span className="visually-hidden">{label ?? t("common:value.noneLabel")}</span>
    </span>
  )
  if (reason === undefined) return word
  return (
    <Tooltip content={reason} focusable>
      {word}
    </Tooltip>
  )
}

```

## frontend/src/shared/ui/primitives/pill/pill.module.css

```css
.pill {
  display: inline-flex;
  align-items: center;
  max-inline-size: 100%;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

```

## frontend/src/shared/ui/primitives/surface/surface.module.css

```css
.float {
  border: var(--hairline) solid var(--border-subtle);
  border-radius: var(--radius-md);
  background-color: var(--surface-float);
  box-shadow: var(--shadow-float);
}

.slidingIndicator {
  position: absolute;
  inset-inline: 0;
  clip-path: inset(0 100% 0 0);
  pointer-events: none;
}

.control {
  composes: pressable from "../../../styles/compose.module.css";
  border-radius: var(--radius-control);
  font-size: var(--font-size-body-sm);
  white-space: nowrap;
  cursor: pointer;
}

.recessed {
  border-radius: var(--radius-sm);
  background-color: var(--surface-sunken);
}

.frame {
  border: var(--hairline) solid var(--border-subtle);
  border-radius: var(--radius-md);
}

```

## frontend/src/shared/ui/primitives/button/button-content.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import { Spinner } from "../../states/spinner/spinner"
import { Icon, type IconName } from "../icon/icon"
import styles from "./button.module.css"

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger"
export type ButtonSize = "regular" | "compact"

const VARIANT_CLASS: Readonly<Record<ButtonVariant, string | undefined>> = {
  primary: styles.primary,
  secondary: styles.secondary,
  quiet: styles.quiet,
  danger: styles.danger,
}

const SIZE_CLASS: Readonly<Record<ButtonSize, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface ButtonLook {
  readonly variant: ButtonVariant
  readonly size: ButtonSize
  readonly icon: IconName | undefined
  readonly className?: string | undefined
}

export function buttonClassName({ variant, size, icon, className }: ButtonLook): string {
  return clsx(
    styles.button,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    icon !== undefined && styles.withIcon,
    className,
  )
}

export interface ButtonContentProps {
  readonly icon?: IconName | undefined
  readonly pending?: boolean
  readonly children: ReactNode
}

function Lead({ icon, pending }: { readonly icon: IconName; readonly pending: boolean }) {
  return pending ? <Spinner size="control" /> : <Icon name={icon} size="control" />
}

export function ButtonContent({ icon, pending = false, children }: ButtonContentProps) {
  const overlay = pending && icon === undefined
  return (
    <>
      {icon === undefined ? null : <Lead icon={icon} pending={pending} />}
      <span className={styles.label} data-hidden={overlay || undefined}>
        {children}
      </span>
      {overlay ? <Spinner size="control" className={styles.overlay} /> : null}
    </>
  )
}

```

## frontend/src/shared/ui/primitives/button/button.module.css

```css
.button {
  composes: control from "../surface/surface.module.css";
  --button-surface: transparent;
  --button-surface-hover: var(--action-ghost-hover);
  --button-surface-press: var(--action-ghost-press);
  --button-text: var(--text-primary);
  --button-edge: transparent;
  --button-height: var(--control-height);

  position: relative;
  display: inline-flex;
  align-items: center;
  max-inline-size: 100%;
  justify-content: center;
  gap: var(--space-8);
  min-block-size: var(--button-height);
  padding-inline: var(--space-20);
  border: var(--hairline) solid var(--button-edge);
  background-color: var(--button-surface);
  color: var(--button-text);
  line-height: var(--line-height-label);
  font-weight: var(--weight-medium);
  text-decoration: none;
  cursor: pointer;
}

.button::after {
  content: "";
  position: absolute;
  inset-block: calc((var(--button-height) - var(--target-min)) / 2);
  inset-inline: 0;
}

.withIcon {
  padding-inline-start: var(--space-16);
}

.primary {
  --button-surface: var(--action-primary);
  --button-surface-hover: var(--action-primary-hover);
  --button-surface-press: var(--action-primary-press);
  --button-text: var(--action-primary-text);
}

.secondary {
  --button-edge: var(--border-control);
}

.quiet {
  padding-inline: var(--space-12);
}

.danger {
  --button-surface: var(--action-danger);
  --button-surface-hover: var(--action-danger-hover);
  --button-surface-press: var(--action-danger-press);
  --button-text: var(--action-danger-text);
}

.compact {
  --button-height: var(--control-height-compact);

  padding-inline: var(--space-16);
}

@media (hover: hover) and (pointer: fine) {
  .button:hover:not(:disabled, [aria-busy="true"]) {
    background-color: var(--button-surface-hover);
  }
}

.button:active:not(:disabled, [aria-busy="true"]) {
  background-color: var(--button-surface-press);
  scale: var(--press-scale);
}

.button:disabled {
  --button-text: var(--text-disabled);

  cursor: not-allowed;
}

.primary:disabled,
.danger:disabled {
  --button-surface: var(--action-disabled);
}

.secondary:disabled {
  --button-edge: var(--border-subtle);
}

.button[aria-pressed="true"] {
  background-color: var(--action-primary);
  color: var(--action-primary-text);
}

.button[aria-busy="true"] {
  cursor: progress;
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  transition: var(--transition-fade);
}

.label[data-hidden] {
  opacity: 0;
}

.overlay {
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
}

```

## frontend/src/shared/ui/primitives/button/button-anchor.tsx

```tsx
import type { ReactNode } from "react"
import type { IconName } from "../icon/icon"
import {
  ButtonContent,
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
} from "./button-content"

export interface ButtonAnchorProps {
  readonly href: string
  readonly download?: string | undefined
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly icon?: IconName | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function ButtonAnchor({
  href,
  download,
  variant = "secondary",
  size = "regular",
  icon,
  className,
  children,
}: ButtonAnchorProps) {
  return (
    <a
      href={href}
      download={download}
      className={buttonClassName({ variant, size, icon, className })}
    >
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </a>
  )
}

```

## frontend/src/shared/ui/primitives/button/button.tsx

```tsx
import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from "react"
import type { IconName } from "../icon/icon"
import {
  ButtonContent,
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
} from "./button-content"

export type { ButtonSize, ButtonVariant } from "./button-content"

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly icon?: IconName | undefined
  readonly pending?: boolean
  readonly type?: "button" | "submit"
  readonly ref?: Ref<HTMLButtonElement> | undefined
  readonly children: ReactNode
}

export function Button({
  variant = "primary",
  size = "regular",
  icon,
  pending = false,
  type = "button",
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <button
      {...rest}
      type={type}
      className={buttonClassName({ variant, size, icon, className })}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={handleClick}
    >
      <ButtonContent icon={icon} pending={pending}>
        {children}
      </ButtonContent>
    </button>
  )
}

```

## frontend/src/shared/ui/primitives/button/button-link.tsx

```tsx
import type { ReactNode } from "react"
import { Link, type To } from "react-router"
import type { IconName } from "../icon/icon"
import {
  ButtonContent,
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
} from "./button-content"

export interface ButtonLinkProps {
  readonly to: To
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly icon?: IconName | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "regular",
  icon,
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link to={to} viewTransition className={buttonClassName({ variant, size, icon, className })}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </Link>
  )
}

```

## frontend/src/shared/ui/primitives/close-button/close-button.module.css

```css
.close {
  color: var(--text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .close:hover:not(:disabled) {
    color: var(--text-primary);
  }
}

```

## frontend/src/shared/ui/primitives/close-button/close-button.tsx

```tsx
import { clsx } from "clsx"
import { useTranslation } from "../../../i18n"
import { IconButton, type IconButtonProps } from "../icon-button/icon-button"
import styles from "./close-button.module.css"

export interface CloseButtonProps extends Omit<IconButtonProps, "icon" | "label" | "variant"> {
  readonly label?: string | undefined
}

export function CloseButton({ label, className, ...rest }: CloseButtonProps) {
  const { t } = useTranslation()
  return (
    <IconButton
      {...rest}
      icon="x"
      label={label ?? t("common:action.close")}
      className={clsx(styles.close, className)}
    />
  )
}

```

## frontend/src/shared/ui/primitives/icon/icon.tsx

```tsx
import { clsx } from "clsx"
import { createElement } from "react"
import { GLYPHS, type IconName } from "./glyphs.gen"
import styles from "./icon.module.css"

export type IconSize = "sm" | "control" | "md" | "lg" | "xl"

export interface IconProps {
  readonly name: IconName
  readonly size?: IconSize
  readonly label?: string | undefined
  readonly className?: string | undefined
}

const SIZE_CLASS: Readonly<Record<IconSize, string | undefined>> = {
  sm: styles.sm,
  control: styles.control,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
}

export const ICON_NAMES = Object.keys(GLYPHS) as readonly IconName[]

export function Icon({ name, size = "md", label, className }: IconProps) {
  const glyph = GLYPHS[name]
  const labelled = label !== undefined && label !== ""
  return (
    <svg
      className={clsx(styles.icon, SIZE_CLASS[size], className)}
      viewBox={glyph.viewBox}
      data-icon={name}
      focusable="false"
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? label : undefined}
      role={labelled ? "img" : undefined}
    >
      {glyph.nodes.map((node, index) =>
        createElement(node.tag, { key: `${node.tag}-${index}`, ...node.attrs }),
      )}
    </svg>
  )
}

export type { IconName } from "./glyphs.gen"

```

## frontend/src/shared/ui/primitives/icon/icon.module.css

```css
.icon {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: var(--icon-stroke);
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.sm {
  inline-size: var(--icon-sm);
  block-size: var(--icon-sm);
}

.control {
  inline-size: var(--icon-control);
  block-size: var(--icon-control);
}

.md {
  inline-size: var(--icon-md);
  block-size: var(--icon-md);
}

.lg {
  inline-size: var(--icon-lg);
  block-size: var(--icon-lg);
}

.xl {
  inline-size: var(--icon-xl);
  block-size: var(--icon-xl);
}

```

## frontend/src/shared/ui/primitives/icon-button/icon-button.tsx

```tsx
import { clsx } from "clsx"
import type { ButtonHTMLAttributes, FocusEvent, MouseEvent, PointerEvent, Ref } from "react"
import { TooltipLayer } from "../../overlays/tooltip/tooltip-layer"
import { useTooltip } from "../../overlays/tooltip/use-tooltip"
import { Spinner } from "../../states/spinner/spinner"
import { Icon, type IconName } from "../icon/icon"
import styles from "./icon-button.module.css"

export type IconButtonVariant = "quiet" | "secondary"
export type IconButtonSize = "regular" | "compact"

const VARIANT_CLASS: Readonly<Record<IconButtonVariant, string | undefined>> = {
  quiet: undefined,
  secondary: styles.secondary,
}

const SIZE_CLASS: Readonly<Record<IconButtonSize, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label"> {
  readonly icon: IconName
  readonly label: string
  readonly variant?: IconButtonVariant
  readonly size?: IconButtonSize
  readonly shortcut?: string | undefined
  readonly pending?: boolean
  readonly pressed?: boolean | undefined
  readonly type?: "button" | "submit"
  readonly ref?: Ref<HTMLButtonElement> | undefined
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value)
  else if (ref !== null && ref !== undefined) ref.current = value
}

export function IconButton({
  icon,
  label,
  variant = "quiet",
  size = "regular",
  shortcut,
  pending = false,
  pressed,
  type = "button",
  className,
  ref,
  onClick,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  ...rest
}: IconButtonProps) {
  const tip = useTooltip<HTMLButtonElement>()
  const glyph = size === "compact" ? "sm" : "control"
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) event.preventDefault()
    else onClick?.(event)
  }
  return (
    <>
      <button
        {...rest}
        ref={(element) => {
          tip.anchorRef.current = element
          assignRef(ref, element)
        }}
        type={type}
        className={clsx(styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
        aria-label={label}
        aria-pressed={pressed}
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        aria-describedby={tip.open && shortcut !== undefined ? tip.id : undefined}
        onClick={handleClick}
        onFocus={(event: FocusEvent<HTMLButtonElement>) => {
          onFocus?.(event)
          tip.triggerProps.onFocus(event)
        }}
        onBlur={(event: FocusEvent<HTMLButtonElement>) => {
          onBlur?.(event)
          tip.triggerProps.onBlur()
        }}
        onPointerEnter={(event: PointerEvent<HTMLButtonElement>) => {
          onPointerEnter?.(event)
          tip.triggerProps.onPointerEnter(event)
        }}
        onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
          onPointerLeave?.(event)
          tip.triggerProps.onPointerLeave()
        }}
        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
          onPointerDown?.(event)
          tip.triggerProps.onPointerDown()
        }}
      >
        {pending ? (
          <Spinner size={glyph === "sm" ? "sm" : "control"} />
        ) : (
          <Icon name={icon} size={glyph} />
        )}
      </button>
      <TooltipLayer
        id={tip.id}
        anchor={tip.anchorRef}
        open={tip.open}
        instant={tip.instant}
        content={label}
        shortcut={shortcut}
      />
    </>
  )
}

```

## frontend/src/shared/ui/primitives/icon-button/icon-button.module.css

```css
.button {
  composes: control from "../surface/surface.module.css";
  --icon-button-size: var(--control-height);

  position: relative;
  display: inline-grid;
  flex: none;
  place-items: center;
  inline-size: var(--icon-button-size);
  block-size: var(--icon-button-size);
  border: var(--hairline) solid transparent;
  color: var(--text-primary);
}

.button::after {
  content: "";
  position: absolute;
  inset: calc((var(--icon-button-size) - var(--target-min)) / 2);
}

.secondary {
  border-color: var(--border-control);
}

.compact {
  --icon-button-size: var(--control-height-compact);
}

.button[aria-pressed="true"] {
  background-color: var(--action-primary);
  color: var(--action-primary-text);
}

@media (hover: hover) and (pointer: fine) {
  .button:hover:not(:disabled, [aria-busy="true"], [aria-pressed="true"]) {
    background-color: var(--action-ghost-hover);
  }
}

.button:active:not(:disabled, [aria-busy="true"]) {
  scale: var(--press-scale);
}

.button:active:not(:disabled, [aria-busy="true"], [aria-pressed="true"]) {
  background-color: var(--action-ghost-press);
}

.button:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.secondary:disabled {
  border-color: var(--border-subtle);
}

.button[aria-busy="true"] {
  cursor: progress;
}

```

## frontend/src/shared/ui/brand/brand-mark/brand-mark.tsx

```tsx
import { clsx } from "clsx"
import { useTranslation } from "../../../i18n"
import {
  MARK_ACCENT_PATH,
  MARK_BASE_PATH,
  MARK_VIEW_BOX,
  WORDMARK_MARK_TRANSFORM,
  WORDMARK_VIEW_BOX,
  WORDMARK_WORD_PATH,
} from "./brand-geometry.gen"
import styles from "./brand-mark.module.css"

export type BrandMarkState = "identity" | "calm" | "alarm" | "busy"
export type BrandMarkSize = "sm" | "md" | "lg"
export type BrandMarkVariant = "symbol" | "lockup"

export interface BrandMarkProps {
  readonly state?: BrandMarkState
  readonly size?: BrandMarkSize
  readonly variant?: BrandMarkVariant
  readonly reveal?: boolean
  readonly className?: string | undefined
}

export const BRAND_MARK_STATES: readonly BrandMarkState[] = ["identity", "calm", "alarm", "busy"]

const STATE_CLASS: Readonly<Record<BrandMarkState, string | undefined>> = {
  identity: styles.identity,
  calm: styles.calm,
  alarm: styles.alarm,
  busy: styles.busy,
}

const SIZE_CLASS: Readonly<Record<BrandMarkSize, string | undefined>> = {
  sm: styles.sm,
  md: undefined,
  lg: styles.lg,
}

export function BrandMark({
  state = "identity",
  size = "md",
  variant = "symbol",
  reveal = true,
  className,
}: BrandMarkProps) {
  const { t } = useTranslation()
  const strokes = (
    <>
      <path className={styles.base} d={MARK_BASE_PATH} data-stroke="base" />
      <g className={styles.enter}>
        <g className={styles.drop}>
          <path className={styles.accent} d={MARK_ACCENT_PATH} data-stroke="accent" />
        </g>
      </g>
    </>
  )
  const lockup = variant === "lockup"
  return (
    <svg
      className={clsx(
        styles.mark,
        SIZE_CLASS[size],
        STATE_CLASS[state],
        reveal && styles.reveal,
        className,
      )}
      viewBox={lockup ? WORDMARK_VIEW_BOX : MARK_VIEW_BOX}
      role="img"
      aria-label={t("common:app.name")}
      data-state={state}
      data-reveal={reveal || undefined}
    >
      {lockup ? (
        <>
          <path className={styles.word} d={WORDMARK_WORD_PATH} />
          <g transform={WORDMARK_MARK_TRANSFORM}>{strokes}</g>
        </>
      ) : (
        strokes
      )}
    </svg>
  )
}

```

## frontend/src/shared/ui/brand/brand-mark/brand-mark.module.css

```css
.mark {
  display: block;
  flex: none;
  inline-size: auto;
  block-size: var(--brand-size-md);
  overflow: visible;
}

.sm {
  block-size: var(--brand-size-sm);
}

.lg {
  block-size: var(--brand-size-lg);
}

.word,
.base {
  fill: var(--brand-ink);
}

.accent {
  fill: var(--brand-ink);
  transform: translateY(calc(var(--shift-brand-align) * -1));
  transition: var(--transition-brand-rise);
}

.identity .accent,
.alarm .accent {
  fill: var(--brand-accent);
  transform: translateY(0);
}

.alarm .accent {
  transition: var(--transition-brand-drop);
}

.busy .accent {
  animation: var(--motion-brand-busy);
}

.reveal .base {
  animation: var(--motion-brand-base-in);
}

.reveal .enter {
  animation: var(--motion-brand-accent-in);
}

.reveal .drop {
  animation: var(--motion-brand-drop-in);
}

.reveal.calm .drop,
.reveal.busy .drop {
  animation: none;
}

```

## frontend/src/shared/ui/layout/disclosure/disclosure.tsx

```tsx
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

```

## frontend/src/shared/ui/layout/disclosure/disclosure.module.css

```css
.disclosure {
  border-block-start: var(--hairline) solid var(--border-subtle);
  padding-block: var(--space-8);
}
.body {
  display: grid;
  gap: var(--space-16);
  padding-block: var(--space-12);
}
.body[hidden] {
  display: none;
}
.body[data-state="open"] {
  animation: var(--motion-fade-in);
}
.body[data-state="closed"] {
  animation: var(--motion-fade-out);
}
.body[data-instant="true"] {
  animation: none;
}

```

## frontend/src/shared/ui/layout/tabs/tabs.tsx

```tsx
import { clsx } from "clsx"
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react"
import { useFormatters } from "../../../i18n"
import { useInputModality, useSlidingIndicator } from "../../../motion"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./tabs.module.css"

export interface TabItem<T extends string> {
  readonly value: T
  readonly label: string
  readonly icon?: IconName | undefined
  readonly count?: number | undefined
  readonly alarm?: boolean | undefined
  readonly disabled?: boolean | undefined
}

export interface TabsProps<T extends string> {
  readonly label: string
  readonly items: readonly TabItem<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly className?: string | undefined
  readonly children?: ReactNode
}

function nextIndex(key: string, current: number, length: number): number | null {
  if (key === "ArrowRight") return (current + 1) % length
  if (key === "ArrowLeft") return (current - 1 + length) % length
  if (key === "Home") return 0
  if (key === "End") return length - 1
  return null
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
  children,
}: TabsProps<T>) {
  const base = useId()
  const { integer } = useFormatters()
  const modality = useInputModality()
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  const { listRef, indicatorRef, itemRef } = useSlidingIndicator<HTMLDivElement>(value, {
    instant: modality.instant,
    radiusToken: "--radius-none",
  })
  const enabled = items.filter((item) => item.disabled !== true)
  const tabId = (item: T) => `${base}-tab-${item}`

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    modality.onKeyDown()
    const current = enabled.findIndex((item) => item.value === value)
    const next = nextIndex(event.key, Math.max(0, current), enabled.length)
    const target = next === null ? undefined : enabled[next]
    if (target === undefined) return
    event.preventDefault()
    onChange(target.value)
    buttons.current.get(target.value)?.focus()
  }

  return (
    <div className={clsx(styles.tabs, className)}>
      <div className={styles.scroller}>
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          className={styles.list}
          onKeyDown={onKeyDown}
          onPointerDown={modality.onPointerDown}
        >
          {items.map((item) => {
            const selected = item.value === value
            return (
              <button
                key={item.value}
                ref={(element) => {
                  itemRef(item.value)(element)
                  if (element === null) buttons.current.delete(item.value)
                  else buttons.current.set(item.value, element)
                }}
                id={tabId(item.value)}
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={selected}
                aria-controls={children === undefined ? undefined : `${base}-panel`}
                aria-disabled={item.disabled === true || undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  if (item.disabled !== true) onChange(item.value)
                }}
              >
                {item.icon === undefined ? null : <Icon name={item.icon} size="sm" />}
                <span>{item.label}</span>
                {item.count === undefined ? null : (
                  <span className={styles.count} data-alarm={item.alarm === true || undefined}>
                    {integer(item.count)}
                  </span>
                )}
              </button>
            )
          })}
          <span ref={indicatorRef} className={styles.ink} aria-hidden="true" />
        </div>
      </div>
      {children === undefined ? null : (
        <div
          id={`${base}-panel`}
          role="tabpanel"
          aria-labelledby={tabId(value)}
          className={styles.panel}
        >
          {children}
        </div>
      )}
    </div>
  )
}

```

## frontend/src/shared/ui/layout/tabs/tabs.module.css

```css
.tabs {
  display: grid;
  min-inline-size: 0;
}

.scroller {
  composes: frame from "../../primitives/surface/surface.module.css";
  overflow-x: auto;
  scrollbar-width: none;
  background-color: var(--surface-sunken);
}

.list {
  position: relative;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  inline-size: max-content;
  min-inline-size: 100%;
}

.tab {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-8);
  min-block-size: var(--control-height);
  padding-inline: var(--space-16);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-body-sm);
  transition: color var(--dur-fast) var(--ease-out);
}

.tab:focus-visible {
  outline-offset: calc(var(--focus-ring-width) * -1);
}

.tab[aria-selected="true"] {
  background-color: var(--surface-raised);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
}

.tab[aria-disabled="true"] {
  color: var(--text-disabled);
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .tab:not([aria-disabled="true"]):hover {
    color: var(--text-primary);
  }
}

.count {
  composes: kbd from "../../primitives/kbd/kbd.module.css";
  border-radius: var(--radius-pill);
}

.count[data-alarm] {
  border-color: var(--status-danger);
  color: var(--text-danger);
}

.ink {
  composes: slidingIndicator from "../../primitives/surface/surface.module.css";
  inset-block-end: var(--space-4);
  block-size: var(--track-size);
  background-color: var(--text-primary);
}

.panel {
  padding-block: var(--space-16);
}

.panel:focus-visible {
  outline-offset: calc(var(--focus-ring-width) * -1);
}

```

## frontend/src/shared/ui/layout/card/card.tsx

```tsx
import { clsx } from "clsx"
import { type HTMLAttributes, type ReactNode, useId } from "react"
import { staggerStyle } from "../../../motion"
import styles from "./card.module.css"

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly appearance?: "panel" | "sheet" | "plain" | "ruled"
  readonly as?: "section" | "article" | "aside" | "div"
  readonly title?: ReactNode
  readonly eyebrow?: ReactNode
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly motionIndex?: number | undefined
  readonly children: ReactNode
}

interface CardHeaderProps {
  readonly titleId: string
  readonly title: ReactNode
  readonly eyebrow: ReactNode
  readonly description: ReactNode
  readonly actions: ReactNode
}

function CardHeader({ titleId, title, eyebrow, description, actions }: CardHeaderProps) {
  return (
    <header className={styles.header}>
      <hgroup className={styles.heading}>
        {eyebrow === undefined ? null : <p className={styles.eyebrow}>{eyebrow}</p>}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </hgroup>
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </header>
  )
}

export function Card({
  as: Tag = "section",
  appearance = "panel",
  title,
  eyebrow,
  description,
  actions,
  motionIndex,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const titleId = useId()
  const titled = title !== undefined
  const entering = motionIndex !== undefined
  return (
    <Tag
      aria-labelledby={titled && rest["aria-label"] === undefined ? titleId : undefined}
      {...rest}
      className={clsx(
        styles.card,
        appearance === "sheet" && styles.sheet,
        appearance === "plain" && styles.plain,
        appearance === "ruled" && styles.ruled,
        entering && styles.entering,
        className,
      )}
      style={entering ? { ...style, ...staggerStyle(motionIndex) } : style}
      data-motion={entering ? "fade" : undefined}
    >
      {titled ? (
        <CardHeader
          titleId={titleId}
          title={title}
          eyebrow={eyebrow}
          description={description}
          actions={actions}
        />
      ) : null}
      {children}
    </Tag>
  )
}

```

## frontend/src/shared/ui/layout/card/card.module.css

```css
.card {
  display: grid;
  align-content: start;
  gap: var(--space-16);
  min-inline-size: 0;
  padding: var(--space-card);
  border: var(--hairline) solid var(--border-subtle);
  border-radius: var(--radius-control);
  background-color: var(--surface-raised);
}

.entering {
  animation: var(--motion-rise-in);
  animation-delay: calc(var(--i) * var(--stagger));
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-element);
}

.heading {
  display: grid;
  flex: 1 1 var(--term-min);
  gap: var(--space-4);
  min-inline-size: 0;
}

.eyebrow {
  composes: mutedCaption from "../text-role/text-role.module.css";
  font-variant-numeric: var(--font-numeric);
}

.title {
  composes: subheadingText from "../../../styles/compose.module.css";
  font-weight: var(--weight-regular);
}

.description {
  composes: secondaryText from "../../../styles/compose.module.css";
  max-inline-size: var(--prose-measure);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
}

.sheet {
  border-radius: var(--radius-none);
  border-color: var(--drawing-frame);
  outline: var(--hairline) solid var(--border-subtle);
  outline-offset: calc(var(--space-4) * -1);
  box-shadow: var(--shadow-sheet);
}

.plain {
  padding: 0;
  border-width: 0;
  border-radius: var(--radius-none);
  background-color: transparent;
}

.ruled {
  padding: var(--space-24) 0;
  border: 0;
  border-block-start: var(--hairline) solid var(--border-subtle);
  border-radius: var(--radius-none);
  background: transparent;
}

```

## frontend/src/shared/ui/layout/text-role/text-role.module.css

```css
.mutedCaption {
  composes: captionText from "../../../styles/compose.module.css";
}

.truncate {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  composes: mutedCaption;
  max-inline-size: var(--prose-measure);
  margin: 0;
}

```

## frontend/src/shared/ui/layout/scroll-area/scroll-area.module.css

```css
.area {
  min-inline-size: 0;
  overflow-y: auto;
}
.horizontal {
  overflow-x: auto;
  overflow-y: hidden;
}

```

## frontend/src/shared/ui/layout/scroll-area/scroll-area.tsx

```tsx
import { clsx } from "clsx"
import type { HTMLAttributes, Ref } from "react"
import styles from "./scroll-area.module.css"

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  readonly ref?: Ref<HTMLDivElement>
  readonly axis?: "horizontal" | "vertical"
}

export function ScrollArea({ axis = "vertical", className, ...rest }: ScrollAreaProps) {
  return (
    <div
      {...rest}
      className={clsx(styles.area, axis === "horizontal" && styles.horizontal, className)}
    />
  )
}

```

## frontend/src/shared/ui/layout/page-header/page-header.module.css

```css
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  padding-block: var(--space-16);
  justify-content: space-between;
  gap: var(--space-16);
}

.text {
  display: grid;
  gap: var(--space-8);
  min-inline-size: 0;
}

.eyebrow {
  composes: mutedCaption from "../text-role/text-role.module.css";
}

.title {
  font-size: var(--font-size-heading-lg);
  font-weight: var(--weight-light);
  line-height: var(--line-height-heading-lg);
  letter-spacing: var(--tracking-tight);
  text-wrap: balance;
}

.description {
  max-inline-size: var(--prose-measure);
  color: var(--text-secondary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-8);
}

```

## frontend/src/shared/ui/layout/page-header/page-header.tsx

```tsx
import type { ReactNode } from "react"
import styles from "./page-header.module.css"

export interface PageHeaderProps {
  readonly title: string
  readonly eyebrow?: ReactNode
  readonly description?: ReactNode
  readonly actions?: ReactNode
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow === undefined ? null : <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title} tabIndex={-1}>
          {title}
        </h1>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </div>
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </header>
  )
}

```

## frontend/src/shared/ui/overlays/drawer/drawer.tsx

```tsx
import { type ReactNode, useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { useInputModality, usePresence } from "../../../motion"
import { CloseButton } from "../../primitives/close-button/close-button"
import styles from "./drawer.module.css"

export interface DrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
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

```

## frontend/src/shared/ui/overlays/drawer/drawer.module.css

```css
.drawer {
  position: fixed;
  inset: 0 0 0 auto;
  margin: 0;
  padding: 0;
  inline-size: min(100%, var(--drawer-width));
  block-size: 100dvh;
  min-block-size: var(--target-min);
  max-block-size: 100dvh;
  max-inline-size: 100%;
  background: var(--surface-base);
  color: var(--text-primary);
  border: var(--hairline) solid var(--border-subtle);
  border-inline-start: var(--hairline) solid var(--border-subtle);
}
.drawer::backdrop {
  background: var(--surface-scrim);
}
.drawer[data-state="open"] {
  transform: translateX(0);
  opacity: 1;
  transition: var(--transition-drawer);
}
.drawer[data-state="closed"] {
  transform: translateX(100%);
  opacity: 0;
  transition: var(--transition-drawer-close);
}
.drawer[data-instant="true"] {
  transition: none;
}
.content {
  overscroll-behavior: contain;
  min-block-size: 100%;
  padding: var(--space-24);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-16);
  margin-block-end: var(--space-24);
}
.header h2 {
  font-size: var(--font-size-subheading);
  font-weight: var(--weight-medium);
}
.body {
  min-inline-size: 0;
}

@starting-style {
  .drawer[data-state="open"] {
    transform: translateX(100%);
    opacity: 0;
  }
}

```

## frontend/src/shared/ui/overlays/tooltip/tooltip.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./tooltip.module.css"
import { TooltipLayer } from "./tooltip-layer"
import { useTooltip } from "./use-tooltip"

export interface TooltipProps {
  readonly content: string
  readonly shortcut?: string | undefined
  readonly focusable?: boolean
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Tooltip({
  content,
  shortcut,
  focusable = false,
  className,
  children,
}: TooltipProps) {
  const tip = useTooltip<HTMLSpanElement>()
  return (
    <>
      <span
        ref={tip.anchorRef}
        className={clsx(styles.anchor, className)}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={tip.open ? tip.id : undefined}
        {...tip.triggerProps}
      >
        {children}
      </span>
      <TooltipLayer
        id={tip.id}
        anchor={tip.anchorRef}
        open={tip.open}
        instant={tip.instant}
        content={content}
        shortcut={shortcut}
      />
    </>
  )
}

```

## frontend/src/shared/ui/overlays/tooltip/tooltip-layer.module.css

```css
.tooltip {
  composes: inverseHint from "../../../styles/compose.module.css";
  z-index: var(--layer-tooltip);
  display: grid;
  grid-template-columns: fit-content(var(--tooltip-max-width)) auto;
  align-items: center;
  gap: var(--space-8);
  padding: calc(var(--space-4) + var(--space-2)) var(--space-8);
  line-height: var(--line-height-caption);
  pointer-events: none;
}

.kbd {
  border-color: currentColor;
  color: inherit;
}

```

## frontend/src/shared/ui/overlays/tooltip/tooltip-layer.tsx

```tsx
import type { RefObject } from "react"
import { Kbd } from "../../primitives/kbd/kbd"
import { FloatingLayer } from "../floating-layer/floating-layer"
import styles from "./tooltip-layer.module.css"

export interface TooltipLayerProps {
  readonly id: string
  readonly anchor: RefObject<HTMLElement | null>
  readonly open: boolean
  readonly instant: boolean
  readonly content: string
  readonly shortcut?: string | undefined
}

export function TooltipLayer({ id, anchor, open, instant, content, shortcut }: TooltipLayerProps) {
  return (
    <FloatingLayer
      id={id}
      role="tooltip"
      anchor={anchor}
      open={open}
      instant={instant}
      align="center"
      prefer="top"
      gapToken="--space-8"
      className={styles.tooltip}
    >
      <span>{content}</span>
      {shortcut === undefined ? null : <Kbd className={styles.kbd}>{shortcut}</Kbd>}
    </FloatingLayer>
  )
}

```

## frontend/src/shared/ui/overlays/tooltip/tooltip.module.css

```css
.anchor {
  display: inline-flex;
  max-inline-size: 100%;
}

```

## frontend/src/shared/ui/overlays/toast/toast-provider.module.css

```css
.region {
  position: fixed;
  inset-block-end: var(--space-24);
  inset-inline-end: var(--space-24);
  z-index: var(--layer-toast);
  display: grid;
  gap: var(--space-8);
  inline-size: min(var(--toast-width), calc(100% - var(--space-16) * 2));
  pointer-events: none;
}

.region:empty {
  display: none;
}

@media (max-width: 47.99rem) {
  .region {
    inset-inline: var(--space-16);
    inset-block-end: var(--space-16);
    inline-size: auto;
  }
}

```

## frontend/src/shared/ui/overlays/toast/toast-card.module.css

```css
.toast {
  composes: float from "../../primitives/surface/surface.module.css";
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-4) var(--space-12);
  align-items: start;
  padding: var(--space-16) var(--space-8) var(--space-16) var(--space-16);
  overflow: hidden;
  font-size: var(--font-size-body-sm);
  line-height: var(--line-height-body-sm);
  pointer-events: auto;
  animation: var(--motion-toast-in);
}

.toast[data-leaving] {
  animation: var(--motion-toast-out);
  pointer-events: none;
}

.icon {
  margin-block-start: var(--space-2);
}

.text {
  display: grid;
  gap: var(--space-2);
  padding-block-start: var(--space-2);
  color: var(--text-secondary);
}

.title {
  color: var(--text-primary);
  font-weight: var(--weight-medium);
}

.close {
  margin-block: calc(var(--space-8) * -1);
}

.actions {
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-block-start: var(--space-8);
}

.timer {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--hairline);
  background-color: var(--border-strong);
  transform-origin: 0 0;
  animation: var(--motion-countdown);
}

.toast:focus-within .timer {
  animation-play-state: paused;
}

@media (hover: hover) and (pointer: fine) {
  .toast:hover .timer {
    animation-play-state: paused;
  }
}

.toast[data-tone="danger"] :is(.icon, .title) {
  color: var(--text-danger);
}

.toast[data-tone="warning"] :is(.icon, .title) {
  color: var(--text-warning);
}

```

## frontend/src/shared/ui/overlays/toast/toast-provider.tsx

```tsx
import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "../../../i18n"
import { ToastCard } from "./toast-card"
import styles from "./toast-provider.module.css"
import { addToast, leaveToast, removeToast, type ToastEntry, type ToastInput } from "./toast-store"

export interface ToastApi {
  readonly show: (toast: ToastInput) => number
  readonly dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export interface ToastProviderProps {
  readonly children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<readonly ToastEntry[]>([])
  const counter = useRef(0)

  const show = useCallback((toast: ToastInput) => {
    counter.current += 1
    const id = counter.current
    setEntries((current) => addToast(current, toast, id))
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setEntries((current) => leaveToast(current, id))
  }, [])

  const remove = useCallback((id: number) => {
    setEntries((current) => removeToast(current, id))
  }, [])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext value={api}>
      {children}
      <section className={styles.region} aria-label={t("common:toast.region")} aria-live="polite">
        {entries.map((entry) => (
          <ToastCard key={entry.id} entry={entry} onDismiss={dismiss} onRemoved={remove} />
        ))}
      </section>
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (api === null) throw new Error("useToast must be used within ToastProvider")
  return api
}

```

## frontend/src/shared/ui/overlays/toast/toast-card.tsx

```tsx
import type { AnimationEvent } from "react"
import { useTranslation } from "../../../i18n"
import { Button } from "../../primitives/button/button"
import { CloseButton } from "../../primitives/close-button/close-button"
import { Icon } from "../../primitives/icon/icon"
import styles from "./toast-card.module.css"
import { TOAST_ICON, type ToastEntry } from "./toast-store"

export interface ToastCardProps {
  readonly entry: ToastEntry
  readonly onDismiss: (id: number) => void
  readonly onRemoved: (id: number) => void
}

const TIMER_STYLE = {
  neutral: undefined,
  warning: undefined,
  danger: { animationDuration: "var(--timeout-toast-error)" },
} as const

export function ToastCard({ entry, onDismiss, onRemoved }: ToastCardProps) {
  const { t } = useTranslation()
  const tone = entry.tone ?? "neutral"
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && entry.leaving) onRemoved(entry.id)
  }
  return (
    <div
      className={styles.toast}
      data-tone={tone}
      data-leaving={entry.leaving || undefined}
      role={tone === "danger" ? "alert" : undefined}
      onAnimationEnd={onAnimationEnd}
    >
      <Icon name={entry.icon ?? TOAST_ICON[tone]} size="md" className={styles.icon} />
      <p className={styles.text}>
        <b className={styles.title}>{entry.title}</b>
        {entry.text === undefined ? null : <span>{entry.text}</span>}
      </p>
      <CloseButton
        size="compact"
        label={t("common:toast.dismiss")}
        className={styles.close}
        onClick={() => onDismiss(entry.id)}
      />
      {entry.action === undefined ? null : (
        <div className={styles.actions}>
          <Button
            size="compact"
            variant={tone === "danger" ? "danger" : "secondary"}
            icon={entry.action.icon}
            onClick={entry.action.onClick}
          >
            {entry.action.label}
          </Button>
        </div>
      )}
      <span
        className={styles.timer}
        style={TIMER_STYLE[tone]}
        aria-hidden="true"
        onAnimationEnd={(event) => {
          event.stopPropagation()
          onDismiss(entry.id)
        }}
      />
    </div>
  )
}

```

## frontend/src/shared/ui/overlays/floating-layer/floating-layer.tsx

```tsx
import { clsx } from "clsx"
import { type HTMLAttributes, type ReactNode, type RefObject, useRef } from "react"
import { usePresence } from "../../../motion"
import { LayerPortal } from "../layer-host/layer-host"
import type { LayerAlign, LayerSide } from "../layer-host/place"
import styles from "./floating-layer.module.css"
import { type SpaceToken, usePlacement } from "./use-placement"

export interface FloatingLayerProps extends HTMLAttributes<HTMLDivElement> {
  readonly anchor: RefObject<HTMLElement | null>
  readonly open: boolean
  readonly align?: LayerAlign
  readonly prefer?: LayerSide
  readonly gapToken?: SpaceToken
  readonly matchWidth?: boolean
  readonly instant?: boolean
  readonly layerRef?: RefObject<HTMLDivElement | null>
  readonly children: ReactNode
}

export function FloatingLayer({
  anchor,
  open,
  align = "start",
  prefer = "bottom",
  gapToken = "--space-4",
  matchWidth = false,
  instant = false,
  layerRef,
  className,
  children,
  ...rest
}: FloatingLayerProps) {
  const ownRef = useRef<HTMLDivElement | null>(null)
  const ref = layerRef ?? ownRef
  const presence = usePresence(open, "--dur-fast-exit", instant)
  usePlacement(anchor, ref, presence.mounted, { align, prefer, gapToken, matchWidth })
  if (!presence.mounted) return null
  return (
    <LayerPortal>
      <div
        {...rest}
        ref={ref}
        className={clsx(styles.layer, className)}
        data-state={presence.state}
        data-instant={instant || undefined}
        data-motion="fade"
        onTransitionEnd={presence.onTransitionEnd}
      >
        {children}
      </div>
    </LayerPortal>
  )
}

```

## frontend/src/shared/ui/overlays/floating-layer/floating-layer.module.css

```css
.layer {
  --layer-from: calc(var(--shift-anchor) * -1);
  --layer-hidden: 0;

  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: var(--layer-popover);
  opacity: calc(1 - var(--layer-hidden));
  scale: calc(1 - var(--layer-hidden) * (1 - var(--enter-scale)));
  translate: 0 calc(var(--layer-from) * var(--layer-hidden));
  transform-origin: var(--layer-origin, top left);
  transition:
    opacity var(--dur-fast) var(--ease-out),
    scale var(--dur-fast) var(--ease-out),
    translate var(--dur-fast) var(--ease-out);
}

.layer[data-side="top"] {
  --layer-from: var(--shift-anchor);
}

.layer[data-state="closed"] {
  --layer-hidden: 1;

  transition-duration: var(--dur-fast-exit);
  pointer-events: none;
}

.layer[data-instant] {
  transition: none;
}

@starting-style {
  .layer[data-state="open"] {
    --layer-hidden: 1;
  }
}

```

## frontend/src/shared/ui/overlays/layer-host/layer-host.tsx

```tsx
import { createContext, type ReactNode, use, useState } from "react"
import { createPortal } from "react-dom"

const LayerRootContext = createContext<HTMLElement | null>(null)

export interface LayerHostProps {
  readonly children: ReactNode
}

export function LayerHost({ children }: LayerHostProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  return (
    <LayerRootContext value={root}>
      {children}
      <div ref={setRoot} data-layer-host="" />
    </LayerRootContext>
  )
}

export interface LayerPortalProps {
  readonly children: ReactNode
}

export function LayerPortal({ children }: LayerPortalProps) {
  const root = use(LayerRootContext)
  if (root === null && typeof document === "undefined") return null
  return createPortal(children, root ?? document.body)
}

```

## frontend/src/shared/ui/forms/segmented/segmented.module.css

```css
.segmented {
  position: relative;
  display: inline-grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  padding: var(--space-4);
  border: var(--hairline) solid var(--border-control);
  background-color: var(--surface-sunken);
  border-radius: var(--radius-control);
}

.option {
  composes: control from "../../primitives/surface/surface.module.css";
  position: relative;
  z-index: var(--layer-raised);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  min-block-size: var(--control-height-compact);
  padding-inline: var(--space-16);
  color: var(--text-secondary);
  cursor: pointer;
}

.segmented .option {
  transition: var(--transition-choice);
}

.iconOnly {
  inline-size: var(--target-min);
  padding-inline: 0;
}

.option::before {
  content: "";
  position: absolute;
  inset-block: calc((var(--control-height-compact) - var(--target-min)) / 2);
  inset-inline: 0;
}

.option[data-checked="true"] {
  background-color: var(--action-primary);
  color: var(--action-primary-text);
}

@media (hover: hover) and (pointer: fine) {
  .option[data-checked="false"]:hover {
    color: var(--text-primary);
  }
}

.segmented .option:active {
  transition: var(--transition-choice-press);
  scale: var(--press-scale);
}

.option:has(:focus-visible) {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.input {
  composes: choiceInput from "../choice/choice.module.css";
  appearance: none;
}

.camera {
  border: 0;
  background: var(--surface-base);
  padding: 0;
  gap: var(--space-4);
}
.camera .option {
  min-block-size: var(--target-min);
  border: var(--hairline) solid var(--border-subtle);
}
.camera .option[data-checked="true"] {
  background: var(--action-primary);
  border-color: var(--action-primary);
}
@media (width < 48rem) {
  .camera {
    inline-size: 100%;
  }
  .camera .option {
    padding-inline: var(--space-8);
    font-size: var(--font-size-caption);
  }
}

```

## frontend/src/shared/ui/forms/segmented/segmented.tsx

```tsx
import { clsx } from "clsx"
import { useId } from "react"
import { useInputModality } from "../../../motion"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./segmented.module.css"

export interface SegmentedOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly icon?: IconName
  readonly short?: string
}

export type SegmentedDisplay = "label" | "icon" | "short"

export interface SegmentedProps<T extends string> {
  readonly appearance?: "standard" | "camera"
  readonly label: string
  readonly options: readonly SegmentedOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly display?: SegmentedDisplay
  readonly className?: string | undefined
}

interface OptionFaceProps {
  readonly label: string
  readonly icon: IconName | undefined
  readonly short: string | undefined
  readonly display: SegmentedDisplay
}

function OptionFace({ label, icon, short, display }: OptionFaceProps) {
  const glyph = icon === undefined ? null : <Icon name={icon} size="control" />
  if (display === "label")
    return (
      <>
        {glyph}
        <span>{label}</span>
      </>
    )
  return (
    <>
      {display === "icon" ? glyph : <span aria-hidden="true">{short ?? label}</span>}
      <span className="visually-hidden">{label}</span>
    </>
  )
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  display = "label",
  appearance = "standard",
  className,
}: SegmentedProps<T>) {
  const name = useId()
  const modality = useInputModality()
  return (
    <fieldset
      className={clsx(styles.segmented, appearance === "camera" && styles.camera, className)}
      onKeyDown={modality.onKeyDown}
      onPointerDown={modality.onPointerDown}
    >
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx(styles.option, display === "icon" && styles.iconOnly)}
          data-checked={option.value === value}
          title={display === "label" ? undefined : option.label}
        >
          <input
            className={styles.input}
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <OptionFace
            label={option.label}
            icon={option.icon}
            short={option.short}
            display={display}
          />
        </label>
      ))}
    </fieldset>
  )
}

```

## frontend/src/shared/ui/forms/number-field/number-field.tsx

```tsx
import { clsx } from "clsx"
import { useId } from "react"
import { useTranslation } from "../../../i18n"
import { Icon } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import {
  INPUT_CONTROL_CLASS,
  INPUT_UNIT_CLASS,
  inputBoxClassName,
  inputBoxState,
} from "../field/input-box"
import styles from "./number-field.module.css"
import { atBound, decimalsOf } from "./number-value"
import { useNumberDraft } from "./use-number-draft"

export interface NumberFieldProps {
  readonly label: string
  readonly value: number | null
  readonly onChange: (value: number | null) => void
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step?: number
  readonly largeStep?: number | undefined
  readonly fractionDigits?: number | undefined
  readonly unit?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
  readonly placeholder?: string | undefined
  readonly name?: string | undefined
  readonly className?: string | undefined
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  largeStep,
  fractionDigits,
  unit,
  hint,
  error,
  warning,
  optional,
  disabled,
  readOnly,
  placeholder,
  name,
  className,
}: NumberFieldProps) {
  const { t } = useTranslation()
  const ids = fieldIds(useId())
  const bounds = { min, max, step }
  const digits = fractionDigits ?? decimalsOf(step)
  const draft = useNumberDraft({
    value,
    onChange,
    bounds,
    largeStep: largeStep ?? step * 10,
    digits,
  })
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled, readOnly })
  const locked = disabled === true || readOnly === true
  const stepper = (direction: 1 | -1) => (
    <button
      type="button"
      tabIndex={-1}
      className={styles.step}
      aria-label={t(direction > 0 ? "common:field.increase" : "common:field.decrease")}
      disabled={locked || atBound(draft.current, bounds, direction)}
      onClick={(event) => draft.step(direction, event.shiftKey)}
    >
      <Icon name={direction > 0 ? "plus" : "minus"} size="sm" />
    </button>
  )
  return (
    <Field
      ids={ids}
      label={label}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <div className={inputBoxClassName(styles.box)} data-state={inputBoxState(state)}>
        {stepper(-1)}
        <input
          id={ids.control}
          name={name}
          className={clsx(INPUT_CONTROL_CLASS, styles.input)}
          inputMode="decimal"
          autoComplete="off"
          role="spinbutton"
          value={draft.text}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-valuenow={draft.current ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={
            unit === undefined || draft.text === ""
              ? undefined
              : t("common:field.valueWithUnit", { value: draft.text, unit })
          }
          aria-invalid={error !== undefined || draft.invalid ? true : undefined}
          aria-describedby={message === null ? undefined : ids.message}
          onChange={draft.onInput}
          onBlur={draft.onBlur}
          onKeyDown={readOnly === true ? undefined : draft.onKeyDown}
        />
        {unit === undefined ? null : (
          <span className={clsx(INPUT_UNIT_CLASS, styles.unit)}>{unit}</span>
        )}
        {stepper(1)}
      </div>
    </Field>
  )
}

```

## frontend/src/shared/ui/forms/number-field/number-field.module.css

```css
.box {
  align-items: stretch;
  gap: var(--space-8);
  padding-inline: 0;
}

.input {
  text-align: end;
}

.unit {
  align-self: center;
}

.step {
  composes: pressable from "../../../styles/compose.module.css";
  flex: none;
  display: grid;
  place-items: center;
  inline-size: var(--control-height);
  min-block-size: var(--control-height);
  color: var(--text-primary);
}

.step:first-child {
  border-inline-end: var(--hairline) solid var(--border-subtle);
}

.step:last-child {
  border-inline-start: var(--hairline) solid var(--border-subtle);
}

.step:active:not(:disabled) {
  background-color: var(--action-ghost-press);
}

.step:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .step:hover:not(:disabled) {
    background-color: var(--action-ghost-hover);
  }
}

```

## frontend/src/shared/ui/forms/range-field/range-field.tsx

```tsx
import { type CSSProperties, useId } from "react"
import styles from "./range-field.module.css"

export interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly onChange: (value: number) => void
}
export function RangeField({ label, value, min, max, onChange }: RangeFieldProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div
        className={styles.track}
        style={{ "--range-progress": (value - min) / (max - min) } as CSSProperties}
      >
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className={styles.thumb} aria-hidden="true" />
      </div>
    </div>
  )
}

```

## frontend/src/shared/ui/forms/range-field/range-field.module.css

```css
.field {
  display: grid;
  gap: var(--space-4);
}
.field label {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}
.track {
  position: relative;
  block-size: var(--target-min);
  background: var(--surface-sunken);
  border: var(--hairline) solid var(--border-control);
}
.track:has(input:focus-visible) {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
.track input {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  opacity: 0;
  cursor: ew-resize;
  margin: 0;
}
.thumb {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(var(--range-progress) * (100% - var(--target-min)));
  inline-size: var(--target-min);
  block-size: var(--target-min);
  background: var(--text-primary);
  border: var(--space-16) solid var(--surface-raised);
  box-shadow: var(--shadow-ring);
  pointer-events: none;
}

```

## frontend/src/shared/ui/forms/checkbox/checkbox.module.css

```css
.check {
  composes: choice from "../choice/choice.module.css";
}

.input {
  composes: choiceInput from "../choice/choice.module.css";
}

.text {
  composes: choiceText from "../choice/choice.module.css";
}

.description {
  composes: choiceDescription from "../choice/choice.module.css";
}

.box {
  composes: recessed from "../../primitives/surface/surface.module.css";

  flex: none;
  display: grid;
  place-items: center;
  inline-size: var(--indicator-size);
  block-size: var(--indicator-size);
  border: var(--border-width-control) solid var(--border-control);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    scale var(--dur-press) var(--ease-out);
}

.mark {
  composes: icon sm from "../../primitives/icon/icon.module.css";
  grid-area: 1 / 1;
  stroke: var(--action-primary-text);
  stroke-width: calc(var(--icon-stroke) + 1);
}

.tick {
  stroke-dasharray: 21;
  stroke-dashoffset: 21;
  transition: stroke-dashoffset var(--dur-base) var(--ease-out);
}

.dash {
  stroke-dasharray: 13;
  stroke-dashoffset: 13;
  transition: stroke-dashoffset var(--dur-fast) var(--ease-out);
}

.input:is(:checked, :indeterminate) + .box {
  border-color: var(--action-primary);
  background-color: var(--action-primary);
}

.input:checked:not(:indeterminate) + .box .tick,
.input:indeterminate + .box .dash {
  stroke-dashoffset: 0;
}

.check:active .box {
  scale: var(--press-scale);
}

.input:focus-visible + .box {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.check[data-invalid] .box {
  border-color: var(--status-danger);
}

.input:disabled + .box {
  border-color: var(--border-strong);
  background-color: var(--action-disabled);
}

.input:disabled:is(:checked, :indeterminate) + .box {
  border-color: var(--text-disabled);
  background-color: var(--text-disabled);
}

.input:disabled + .box .mark {
  stroke: var(--surface-base);
}

@media (hover: hover) and (pointer: fine) {
  .check:hover .input:not(:disabled, :checked, :indeterminate) + .box {
    border-color: var(--border-ink);
  }

  .check:hover .input:not(:disabled):is(:checked, :indeterminate) + .box {
    border-color: var(--action-primary-hover);
    background-color: var(--action-primary-hover);
  }
}

```

## frontend/src/shared/ui/forms/checkbox/checkbox.tsx

```tsx
import { clsx } from "clsx"
import { type ChangeEvent, useEffect, useRef } from "react"
import styles from "./checkbox.module.css"

export interface CheckboxProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly indeterminate?: boolean
  readonly description?: string | undefined
  readonly invalid?: boolean
  readonly disabled?: boolean
  readonly hideLabel?: boolean
  readonly name?: string | undefined
  readonly value?: string | undefined
  readonly className?: string | undefined
}

export function Checkbox({
  label,
  checked,
  onChange,
  indeterminate = false,
  description,
  invalid = false,
  disabled = false,
  hideLabel = false,
  name,
  value,
  className,
}: CheckboxProps) {
  const input = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (input.current !== null) input.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className={clsx(styles.check, className)} data-invalid={invalid || undefined}>
      <input
        ref={input}
        className={styles.input}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        <svg className={styles.mark} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path className={styles.tick} d="M5 12.5l4.5 4.5L19 7.5" />
          <path className={styles.dash} d="M5.5 12h13" />
        </svg>
      </span>
      <span className={hideLabel ? "visually-hidden" : styles.text}>
        <span>{label}</span>
        {description === undefined ? null : (
          <small className={styles.description}>{description}</small>
        )}
      </span>
    </label>
  )
}

```

## frontend/src/shared/ui/forms/choice/choice.module.css

```css
.choice {
  position: relative;
  display: inline-flex;
  align-items: start;
  gap: var(--space-12);
  min-block-size: var(--target-min);
  padding-block: var(--space-12);
  font-size: var(--font-size-body-sm);
  line-height: var(--line-height-body-sm);
  cursor: pointer;
}

.choice:has(.choiceInput:disabled) {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.choiceInput {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.choiceText {
  display: grid;
  gap: var(--space-2);
  min-inline-size: 0;
}

.choiceDescription {
  composes: mutedCaption from "../../layout/text-role/text-role.module.css";
}

.choice:has(.choiceInput:disabled) .choiceDescription {
  color: var(--text-disabled);
}

```

## frontend/src/shared/ui/forms/field/field.module.css

```css
.field {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
  min-inline-size: 0;
  max-inline-size: var(--field-max-width);
}

.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-12);
}

.label {
  color: var(--text-secondary);
  font-size: var(--font-size-label);
  line-height: var(--line-height-label);
}

.aside {
  composes: mutedCaption from "../../layout/text-role/text-role.module.css";
  font-variant-numeric: var(--font-numeric);
}

.message {
  composes: mutedCaption from "../../layout/text-role/text-role.module.css";
  display: flex;
  align-items: start;
  gap: var(--space-8);
}

.field[data-state="error"] .message {
  color: var(--text-danger);
}

.field[data-state="warning"] .message {
  color: var(--text-warning);
}

.field[data-state="disabled"] .label {
  color: var(--text-disabled);
}

```

## frontend/src/shared/ui/forms/field/field.tsx

```tsx
import { clsx } from "clsx"
import type { ReactNode } from "react"
import { useTranslation } from "../../../i18n"
import { Icon } from "../../primitives/icon/icon"
import styles from "./field.module.css"

export type FieldState = "default" | "error" | "warning" | "disabled" | "readonly"

export interface FieldMessage {
  readonly text: string
  readonly tone: "hint" | "error" | "warning"
}

export interface FieldIds {
  readonly control: string
  readonly label: string
  readonly message: string
}

export function fieldIds(base: string): FieldIds {
  return { control: `${base}-control`, label: `${base}-label`, message: `${base}-message` }
}

export interface FieldMessageInput {
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
}

export function fieldMessage({ hint, error, warning }: FieldMessageInput): FieldMessage | null {
  if (error !== undefined) return { text: error, tone: "error" }
  if (warning !== undefined) return { text: warning, tone: "warning" }
  return hint === undefined ? null : { text: hint, tone: "hint" }
}

export interface FieldStateInput {
  readonly message: FieldMessage | null
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
}

export function fieldState({ message, disabled, readOnly }: FieldStateInput): FieldState {
  if (disabled === true) return "disabled"
  if (message?.tone === "error") return "error"
  if (message?.tone === "warning") return "warning"
  return readOnly === true ? "readonly" : "default"
}

export interface FieldProps {
  readonly ids: FieldIds
  readonly label: string
  readonly labelFor?: boolean
  readonly optional?: boolean | undefined
  readonly aside?: ReactNode
  readonly message: FieldMessage | null
  readonly state: FieldState
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Field({
  ids,
  label,
  labelFor = true,
  optional = false,
  aside,
  message,
  state,
  className,
  children,
}: FieldProps) {
  const { t } = useTranslation()
  return (
    <div className={clsx(styles.field, className)} data-state={state}>
      <div className={styles.top}>
        {labelFor ? (
          <label id={ids.label} htmlFor={ids.control} className={styles.label}>
            {label}
          </label>
        ) : (
          <span id={ids.label} className={styles.label}>
            {label}
          </span>
        )}
        {optional ? <span className={styles.aside}>{t("common:field.optional")}</span> : null}
        {aside === undefined ? null : <span className={styles.aside}>{aside}</span>}
      </div>
      {children}
      {message === null ? null : (
        <p id={ids.message} className={styles.message}>
          {message.tone === "hint" ? null : (
            <Icon name={message.tone === "error" ? "error" : "warning"} size="sm" />
          )}
          <span>{message.text}</span>
        </p>
      )}
    </div>
  )
}

```

## frontend/src/shared/ui/forms/field/input-box.module.css

```css
.box {
  composes: controlFrame from "../../../styles/compose.module.css";
  --box-edge: var(--border-control);
  --box-edge-hover: var(--border-control-hover);

  display: flex;
  align-items: center;
  gap: var(--space-8);
  inline-size: 100%;
  min-block-size: var(--control-height);
  border: var(--hairline) solid var(--box-edge);
  background-color: var(--surface-sunken);
  color: var(--text-muted);
  font-size: var(--font-size-body-sm);
  text-align: start;
  cursor: text;
}

.box:focus-within,
.box[aria-expanded="true"] {
  --box-edge: var(--border-ink);
  --box-edge-hover: var(--border-ink);

  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.box[data-state="error"] {
  --box-edge: var(--status-danger);
  --box-edge-hover: var(--status-danger);
}

.box[data-state="warning"] {
  --box-edge: var(--status-warning);
  --box-edge-hover: var(--status-warning);
}

.box[data-state="error"]:focus-within {
  box-shadow: none;
}

.box[data-state="readonly"] {
  --box-edge: var(--border-strong);
  --box-edge-hover: var(--border-strong);

  border-style: dashed;
  cursor: default;
}

.box[data-state="disabled"] {
  --box-edge: var(--border-subtle);
  --box-edge-hover: var(--border-subtle);

  background-color: var(--action-disabled);
  color: var(--text-disabled);
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .box:hover:not(:focus-within) {
    border-color: var(--box-edge-hover);
  }
}

.unit {
  flex: none;
  color: var(--text-muted);
  font-size: var(--font-size-body-sm);
}

.control {
  flex: 1 1 0;
  align-self: stretch;
  inline-size: 0;
  min-inline-size: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background-color: transparent;
  color: var(--text-primary);
  font-variant-numeric: var(--font-numeric);
  text-overflow: ellipsis;
}

.control::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.box[data-state="disabled"] .control {
  color: var(--text-disabled);
  cursor: not-allowed;
}

```

## frontend/src/shared/ui/forms/switch/switch.tsx

```tsx
import { clsx } from "clsx"
import type { ChangeEvent } from "react"
import styles from "./switch.module.css"

export interface SwitchProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly description?: string | undefined
  readonly pending?: boolean
  readonly disabled?: boolean
  readonly hideLabel?: boolean
  readonly name?: string | undefined
  readonly className?: string | undefined
}

export function Switch({
  label,
  checked,
  onChange,
  description,
  pending = false,
  disabled = false,
  hideLabel = false,
  name,
  className,
}: SwitchProps) {
  return (
    <label className={clsx(styles.toggle, className)} aria-busy={pending || undefined}>
      <input
        className={styles.input}
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        aria-checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (!pending) onChange(event.target.checked)
        }}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={hideLabel ? "visually-hidden" : styles.text}>
        <span>{label}</span>
        {description === undefined ? null : (
          <small className={styles.description}>{description}</small>
        )}
      </span>
    </label>
  )
}

```

## frontend/src/shared/ui/forms/switch/switch.module.css

```css
.toggle {
  composes: choice from "../choice/choice.module.css";
}

.input {
  composes: choiceInput from "../choice/choice.module.css";
}

.text {
  composes: choiceText from "../choice/choice.module.css";
}

.description {
  composes: choiceDescription from "../choice/choice.module.css";
}

.track {
  flex: none;
  display: flex;
  align-items: center;
  inline-size: var(--switch-width);
  block-size: var(--switch-height);
  margin-block: calc((var(--indicator-size) - var(--switch-height)) / 2);
  padding: calc((var(--switch-height) - var(--border-width-control) * 2 - var(--icon-sm)) / 2);
  border: var(--border-width-control) solid var(--border-control);
  border-radius: var(--radius-pill);
  background-color: var(--surface-sunken);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.thumb {
  display: grid;
  place-items: center;
  block-size: var(--icon-sm);
  aspect-ratio: 1;
  border-radius: var(--radius-round);
  background-color: var(--border-control);
  transition:
    transform var(--dur-base) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.input:checked + .track {
  border-color: var(--action-primary);
  background-color: var(--action-primary);
}

.input:checked + .track .thumb {
  background-color: var(--action-primary-text);
  transform: translateX(calc(var(--switch-width) - var(--switch-height)));
}

.input:focus-visible + .track {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}

.toggle[aria-busy="true"] {
  cursor: progress;
}

.toggle[aria-busy="true"] .thumb::after {
  content: "";
  inline-size: calc(var(--icon-sm) - var(--space-4) - var(--space-2));
  block-size: calc(var(--icon-sm) - var(--space-4) - var(--space-2));
  border: var(--hairline) solid transparent;
  border-block-start-color: var(--surface-base);
  border-inline-end-color: var(--surface-base);
  border-radius: var(--radius-round);
  animation: var(--motion-spin);
}

.toggle[aria-busy="true"] .input:checked + .track .thumb::after {
  border-block-start-color: var(--action-primary);
  border-inline-end-color: var(--action-primary);
}

.input:disabled + .track {
  border-color: var(--border-strong);
  background-color: var(--action-disabled);
}

.input:disabled + .track .thumb {
  background-color: var(--text-disabled);
}

.input:disabled:checked + .track {
  border-color: var(--text-disabled);
  background-color: var(--text-disabled);
}

.input:disabled:checked + .track .thumb {
  background-color: var(--surface-base);
}

@media (hover: hover) and (pointer: fine) {
  .toggle:hover .input:not(:disabled, :checked) + .track {
    border-color: var(--border-ink);
  }

  .toggle:hover .input:not(:disabled):checked + .track {
    border-color: var(--action-primary-hover);
    background-color: var(--action-primary-hover);
  }
}

```

## frontend/src/shared/ui/forms/text-field/text-field.tsx

```tsx
import type { InputHTMLAttributes, Ref } from "react"
import { useId } from "react"
import { Icon, type IconName } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import {
  INPUT_CONTROL_CLASS,
  INPUT_UNIT_CLASS,
  inputBoxClassName,
  inputBoxState,
} from "../field/input-box"

export type TextFieldType = "text" | "email" | "password" | "search" | "tel" | "url"

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id" | "size" | "children"> {
  readonly label: string
  readonly type?: TextFieldType
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly icon?: IconName | undefined
  readonly unit?: string | undefined
  readonly className?: string | undefined
  readonly ref?: Ref<HTMLInputElement> | undefined
}

export function TextField({
  label,
  type = "text",
  hint,
  error,
  warning,
  optional,
  icon,
  unit,
  className,
  disabled,
  readOnly,
  ...rest
}: TextFieldProps) {
  const ids = fieldIds(useId())
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled, readOnly })
  const prefix = icon ?? (readOnly === true ? "lock" : undefined)
  return (
    <Field
      ids={ids}
      label={label}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <div className={inputBoxClassName()} data-state={inputBoxState(state)}>
        {prefix === undefined ? null : <Icon name={prefix} size="sm" />}
        <input
          {...rest}
          id={ids.control}
          type={type}
          className={INPUT_CONTROL_CLASS}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={message === null ? undefined : ids.message}
        />
        {unit === undefined ? null : <span className={INPUT_UNIT_CLASS}>{unit}</span>}
      </div>
    </Field>
  )
}

```

## frontend/src/shared/ui/forms/select/select-options.module.css

```css
.option {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  inline-size: 100%;
  min-block-size: var(--target-min);
  padding-inline: var(--space-8) var(--space-12);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.check {
  visibility: hidden;
}

.option[aria-selected="true"] .check {
  visibility: visible;
}

.label {
  composes: truncate from "../../layout/text-role/text-role.module.css";
  flex: 1 1 auto;
}

.option[aria-selected="true"] {
  background-color: var(--surface-selected);
}

.option[aria-selected="true"] .label {
  font-weight: var(--weight-medium);
}

.meta {
  composes: mutedCaption from "../../layout/text-role/text-role.module.css";
  flex: none;
  margin-inline-start: auto;
  font-variant-numeric: var(--font-numeric);
}

.option[data-active] {
  background-color: var(--action-ghost-press);
}

.option[aria-disabled="true"] {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.option[aria-disabled="true"] .meta {
  color: var(--text-disabled);
}

```

## frontend/src/shared/ui/forms/select/select.module.css

```css
.trigger {
  color: var(--text-primary);
  cursor: pointer;
}

.trigger:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
  border-color: var(--border-ink);
}

.trigger:disabled {
  cursor: not-allowed;
}

.value {
  composes: truncate from "../../layout/text-role/text-role.module.css";
  flex: 1 1 auto;
}

.value[data-placeholder] {
  color: var(--text-muted);
}

.chevron {
  color: var(--text-secondary);
  transition: rotate var(--dur-fast) var(--ease-out);
}

.trigger[aria-expanded="true"] .chevron {
  rotate: 180deg;
}

.layer {
  composes: float from "../../primitives/surface/surface.module.css";
  box-sizing: border-box;
  min-inline-size: var(--popover-min-width);
  min-block-size: var(--target-min);
  max-block-size: var(--popover-max-block);
  padding: var(--space-4);
  overflow: auto;
  overscroll-behavior: contain;
  color: var(--text-primary);
  font-size: var(--font-size-body-sm);
}

.layer:focus-visible {
  outline: 0;
}

```

## frontend/src/shared/ui/forms/select/select-options.tsx

```tsx
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./select-options.module.css"

export interface SelectOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly meta?: string | undefined
  readonly icon?: IconName | undefined
  readonly disabled?: boolean | undefined
}

export interface SelectOptionsProps<T extends string> {
  readonly idBase: string
  readonly options: readonly SelectOption<T>[]
  readonly value: T | null
  readonly active: T | null
}

function scrollIntoView(element: HTMLDivElement | null): void {
  element?.scrollIntoView?.({ block: "nearest" })
}

export function SelectOptions<T extends string>({
  idBase,
  options,
  value,
  active,
}: SelectOptionsProps<T>) {
  return options.map((option) => {
    const disabled = option.disabled === true
    const isActive = option.value === active
    return (
      <div
        key={option.value}
        ref={isActive ? scrollIntoView : undefined}
        id={`${idBase}-${option.value}`}
        role="option"
        tabIndex={-1}
        data-value={option.value}
        className={styles.option}
        aria-selected={option.value === value}
        aria-disabled={disabled || undefined}
        data-active={isActive || undefined}
      >
        <Icon name="check" size="sm" className={styles.check} />
        {option.icon === undefined ? null : <Icon name={option.icon} size="sm" />}
        <span className={styles.label}>{option.label}</span>
        {option.meta === undefined ? null : <span className={styles.meta}>{option.meta}</span>}
      </div>
    )
  })
}

```

## frontend/src/shared/ui/forms/select/select.tsx

```tsx
import { useId, useRef } from "react"
import { FloatingLayer } from "../../overlays/floating-layer/floating-layer"
import { Icon } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import { inputBoxClassName, inputBoxState } from "../field/input-box"
import styles from "./select.module.css"
import { type SelectOption, SelectOptions } from "./select-options"
import { useListbox } from "./use-listbox"

export type { SelectOption } from "./select-options"

export interface SelectProps<T extends string> {
  readonly label: string
  readonly options: readonly SelectOption<T>[]
  readonly value: T | null
  readonly onChange: (value: T) => void
  readonly placeholder?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly className?: string | undefined
}

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  hint,
  error,
  warning,
  optional,
  disabled,
  className,
}: SelectProps<T>) {
  const base = useId()
  const ids = fieldIds(base)
  const valueId = `${base}-value`
  const listId = `${base}-list`
  const trigger = useRef<HTMLButtonElement | null>(null)
  const list = useRef<HTMLDivElement | null>(null)
  const listbox = useListbox({ items: options, value, onChoose: onChange, trigger, list })
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled })
  const selected = options.find((option) => option.value === value)
  return (
    <Field
      ids={ids}
      label={label}
      labelFor={false}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <button
        ref={trigger}
        id={ids.control}
        type="button"
        className={inputBoxClassName(styles.trigger)}
        data-state={inputBoxState(state)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={listbox.open}
        aria-controls={listbox.open ? listId : undefined}
        aria-labelledby={`${ids.label} ${valueId}`}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={message === null ? undefined : ids.message}
        onClick={listbox.toggle}
        onKeyDown={listbox.onTriggerKeyDown}
      >
        <span
          id={valueId}
          className={styles.value}
          data-placeholder={selected === undefined || undefined}
        >
          {selected?.label ?? placeholder}
        </span>
        <Icon name="chevron-down" size="sm" className={styles.chevron} />
      </button>
      <FloatingLayer
        anchor={trigger}
        open={listbox.open}
        matchWidth
        layerRef={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={ids.label}
        aria-activedescendant={listbox.active === null ? undefined : `${listId}-${listbox.active}`}
        className={styles.layer}
        onKeyDown={listbox.onListKeyDown}
        onClick={listbox.onListClick}
        onPointerMove={listbox.onListPointerMove}
      >
        <SelectOptions idBase={listId} options={options} value={value} active={listbox.active} />
      </FloatingLayer>
    </Field>
  )
}

```