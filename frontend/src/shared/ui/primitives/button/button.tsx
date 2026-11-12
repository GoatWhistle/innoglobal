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
