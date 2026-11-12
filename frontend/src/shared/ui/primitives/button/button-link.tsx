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
