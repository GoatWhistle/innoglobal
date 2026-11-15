import { type FormEvent, useState } from "react"
import { indexAt, type SegmentRow } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, IconButton, TextField } from "@/shared/ui"
import styles from "./pipe-controls.module.css"

export interface PipeControlsProps {
  readonly rows: readonly SegmentRow[]
  readonly selected: number
  readonly onSelect: (id: number) => void
}
export function PipeControls({ rows, selected, onSelect }: PipeControlsProps) {
  const { t } = useTranslation()
  const index = rows.findIndex((row) => row.segment_id === selected)
  const row = rows[index]
  const length = rows.at(-1)?.end_m ?? 0
  const [draft, setDraft] = useState(String(row?.start_m ?? 0))
  const [invalid, setInvalid] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(draft.trim().replace(",", "."))
    if (!draft.trim() || !Number.isFinite(value) || value < 0 || value > length) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    const next = rows[indexAt(rows, value)]
    if (next) onSelect(next.segment_id)
  }
  const move = (offset: number) => {
    const next = rows[index + offset]
    if (next) onSelect(next.segment_id)
  }
  return (
    <div className={styles.controls}>
      <form className={styles.form} onSubmit={submit}>
        <IconButton
          icon="chevron-left"
          label={t("inspector:previous")}
          disabled={index <= 0}
          onClick={() => move(-1)}
        />
        <TextField
          label={t("pipe:restoration.coordinate")}
          value={draft}
          inputMode="decimal"
          onChange={(e) => setDraft(e.target.value)}
          error={invalid ? t("pipe:restoration.coordinateError", { length }) : undefined}
        />
        <IconButton
          icon="chevron-right"
          label={t("inspector:next")}
          disabled={index >= rows.length - 1}
          onClick={() => move(1)}
        />
        <Button type="submit" variant="secondary" icon="arrow-right">
          {t("pipe:restoration.go")}
        </Button>
      </form>
    </div>
  )
}
