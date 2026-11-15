import { useTranslation } from "@/shared/i18n"
import { Button } from "@/shared/ui"
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
      <h1 className={styles.intro}>{t("assistant:welcome")}</h1>
      <p className={styles.lead}>{t("assistant:page.description")}</p>
      <p className={styles.context}>{context}</p>
      <div className={styles.starters}>
        {STARTERS.map((key) => (
          <Button
            key={key}
            variant="secondary"
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
