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
