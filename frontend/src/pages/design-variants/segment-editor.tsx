import { useRef, useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { Button, TextField } from "@/shared/ui"
import styles from "./segment-editor.module.css"

export function SegmentEditor({
  selected,
  max,
  onSelect,
  onActive,
}: {
  readonly selected: number | null
  readonly max: number
  readonly onSelect: (id: number) => void
  readonly onActive: (active: boolean) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(selected === null ? "" : String(selected))
  const [invalid, setInvalid] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const cancel = () => {
    setEditing(false)
    setInvalid(false)
    setDraft(selected === null ? "" : String(selected))
    onActive(false)
    input.current?.blur()
  }
  const activate = () => {
    setEditing(true)
    onActive(true)
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
  }
  return (
    <form
      className={styles.editor}
      data-editing={editing || selected === null}
      onMouseEnter={activate}
      onMouseLeave={cancel}
      onSubmit={(e) => {
        e.preventDefault()
        const id = Number(draft)
        if (!draft.trim() || !Number.isInteger(id) || id < 0 || id > max) {
          setInvalid(true)
          return
        }
        onSelect(id)
        setEditing(false)
        onActive(false)
        input.current?.blur()
      }}
    >
      {!editing && selected !== null ? (
        <Button variant="quiet" onFocus={activate} onClick={activate}>
          {t("inspector:title", { segment: selected })}
        </Button>
      ) : (
        <>
          <TextField
            ref={input}
            label={t("variants:workspace.edit")}
            inputMode="numeric"
            value={draft}
            placeholder={t("pipe:unit.span", { from: 0, to: max })}
            onChange={(e) => {
              setDraft(e.target.value)
              setInvalid(false)
            }}
            onFocus={() => onActive(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                cancel()
              }
            }}
            error={invalid ? t("variants:workspace.invalid", { max }) : undefined}
          />
          <div className={styles.hints}>
            <Button type="submit" variant="quiet">
              {t("variants:workspace.enter")}
            </Button>
            <Button variant="quiet" onClick={cancel}>
              {t("variants:workspace.escape")}
            </Button>
          </div>
        </>
      )}
    </form>
  )
}
