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
