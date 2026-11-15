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
