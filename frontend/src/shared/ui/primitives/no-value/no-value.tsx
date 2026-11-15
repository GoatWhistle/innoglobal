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
