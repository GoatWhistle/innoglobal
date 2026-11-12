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
