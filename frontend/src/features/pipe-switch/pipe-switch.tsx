import { CASE_SHORT, type PipeSummary } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Segmented, type SegmentedOption } from "@/shared/ui"

export interface PipeSwitchProps {
  readonly pipes: readonly PipeSummary[]
  readonly current: number
  readonly onChange: (pipeId: number) => void
}

export function PipeSwitch({ pipes, current, onChange }: PipeSwitchProps) {
  const { t } = useTranslation()
  const options: SegmentedOption<string>[] = pipes.map((pipe) => ({
    value: String(pipe.pipe_id),
    short: t(CASE_SHORT[pipe.mode]),
    label: t("pipe:switchOption", { case: t(CASE_SHORT[pipe.mode]), pipe: pipe.pipe_id }),
    icon: "pipe",
  }))
  return (
    <Segmented
      label={t("pipe:switchLabel")}
      display="short"
      options={options}
      value={String(current)}
      onChange={(value) => onChange(Number(value))}
    />
  )
}
