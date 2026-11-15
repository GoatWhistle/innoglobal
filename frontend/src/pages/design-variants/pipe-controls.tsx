import { type FormEvent, useState } from "react"
import { indexAt, type SegmentRow, useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, TextField } from "@/shared/ui"
import styles from "./pipe-controls.module.css"

export interface PipeControlsProps {
  readonly rows: readonly SegmentRow[]
  readonly selected: number
  readonly onSelect: (id: number) => void
}
export function PipeControls({ rows, selected, onSelect }: PipeControlsProps) {
  const { t } = useTranslation()
  const thickness = useThickness()
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
      <p className={styles.hint}>{t("pipe:restoration.keyboard")}</p>
      <form className={styles.form} onSubmit={submit}>
        <Button
          variant="secondary"
          icon="chevron-left"
          disabled={index <= 0}
          onClick={() => move(-1)}
        >
          {t("inspector:previous")}
        </Button>
        <TextField
          label={t("pipe:restoration.coordinate")}
          value={draft}
          inputMode="decimal"
          onChange={(e) => setDraft(e.target.value)}
          error={invalid ? t("pipe:restoration.coordinateError", { length }) : undefined}
          hint={row ? thickness.range(row.start_m, row.end_m) : undefined}
        />
        <Button
          variant="secondary"
          icon="chevron-right"
          disabled={index >= rows.length - 1}
          onClick={() => move(1)}
        >
          {t("inspector:next")}
        </Button>
        <Button type="submit" variant="secondary" icon="arrow-right">
          {t("pipe:restoration.go")}
        </Button>
      </form>
    </div>
  )
}
