import { CASE_START, type PipeSummary, useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { NoValue, Stat, StatGrid } from "@/shared/ui"

export interface PipePassportProps {
  readonly pipe: PipeSummary
}

export function PipePassport({ pipe }: PipePassportProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const passport = pipe.passport
  return (
    <StatGrid look="ruled">
      <Stat
        label={t("pipe:passport.target")}
        value={format.date(pipe.target_date)}
        hint={t(CASE_START[pipe.mode])}
      />
      <Stat
        label={t("pipe:passport.size")}
        value={t("pipe:passport.sizeValue", {
          diameter: format.integer(passport.diameter_mm),
          wall: format.number(passport.nominal_wall_mm, 1),
        })}
        unit={t("pipe:unit.mmShort")}
      />
      <Stat
        label={t("pipe:passport.commissioned")}
        value={
          passport.commissioned_at === null ? <NoValue /> : format.date(passport.commissioned_at)
        }
      />
      <Stat
        label={t("pipe:passport.length")}
        value={format.integer(passport.length_m)}
        unit={t("pipe:unit.mShort")}
        hint={t("pipe:passport.segments", { count: pipe.segments })}
      />
      <Stat
        label={t("pipe:passport.thinnest")}
        value={thickness.value(pipe.thinnest_mm)}
        unit={t("pipe:unit.mmShort")}
        hint={t("pipe:passport.thinnestAt", { segment: pipe.thinnest_segment_id })}
      />
      <Stat
        label={t("pipe:passport.cutoff", { percent: pipe.priority_percent })}
        value={thickness.value(pipe.priority_cutoff_mm)}
        unit={t("pipe:unit.mmShort")}
        hint={t("pipe:passport.cutoffHint", { count: pipe.priority_count })}
      />
    </StatGrid>
  )
}
