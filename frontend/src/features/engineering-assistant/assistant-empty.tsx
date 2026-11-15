import { useTranslation } from "@/shared/i18n"
import { BrandMark, Button } from "@/shared/ui"
import styles from "./assistant-chat.module.css"

export interface AssistantEmptyProps {
  readonly context: string
  readonly disabled: boolean
  readonly onAsk: (prompt: string) => void
}

const STARTERS = ["priority", "thinnest", "queue", "compare", "neighbors", "available"] as const

export function AssistantEmpty({ context, disabled, onAsk }: AssistantEmptyProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.empty}>
      <div className={styles.greeting}>
        <BrandMark variant="symbol" size="sm" state="calm" />
        <div className={styles.bubble}>
          <p>{t("assistant:greeting")}</p>
          <p className={styles.context}>{context}</p>
        </div>
      </div>
      <div className={styles.starters}>
        {STARTERS.map((key) => (
          <Button
            key={key}
            variant="secondary"
            size="compact"
            disabled={disabled}
            className={styles.starter}
            onClick={() => onAsk(t(`assistant:prompts.${key}`))}
          >
            {t(`assistant:prompts.${key}`)}
          </Button>
        ))}
      </div>
    </div>
  )
}
