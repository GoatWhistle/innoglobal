import { useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { IconButton, TextField } from "@/shared/ui"
import styles from "./workspace-panel.module.css"

export interface SegmentPickerProps {
  readonly selected: number | null
  readonly max: number
  readonly onSelect: (id: number) => void
}

export function SegmentPicker({ selected, max, onSelect }: SegmentPickerProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(selected === null ? "" : String(selected))
  const [invalid, setInvalid] = useState(false)
  const current = selected ?? 0
  const apply = () => {
    const id = Number(draft)
    if (!draft.trim() || !Number.isInteger(id) || id < 0 || id > max) {
      setInvalid(true)
      return
    }
    onSelect(id)
  }
  return (
    <form
      className={styles.picker}
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <TextField
        className={styles.pickerField}
        label={t("variants:workspace.edit")}
        inputMode="numeric"
        value={draft}
        placeholder={t("pipe:unit.span", { from: 0, to: max })}
        hint={invalid ? undefined : t("variants:workspace.pickHint", { max })}
        error={invalid ? t("variants:workspace.invalid", { max }) : undefined}
        onChange={(event) => {
          setDraft(event.target.value)
          setInvalid(false)
        }}
      />
      <div className={styles.stepper}>
        <IconButton
          icon="chevron-left"
          label={t("variants:previousArea")}
          disabled={selected === null || current <= 0}
          onClick={() => onSelect(current - 1)}
        />
        <IconButton
          icon="chevron-right"
          label={t("variants:nextArea")}
          disabled={selected !== null && current >= max}
          onClick={() => onSelect(selected === null ? 0 : current + 1)}
        />
      </div>
    </form>
  )
}
