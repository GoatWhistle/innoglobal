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
