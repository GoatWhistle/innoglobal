import { useNavigate } from "react-router"
import { CASE_START, CASE_TITLE, type PipeSummary, useProfile, useThickness } from "@/entities/pipe"
import { SegmentStrip } from "@/features/segment-strip"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonLink, Card, QueryView, Skeleton, Stat, StatGrid } from "@/shared/ui"
import styles from "./overview-page.module.css"

export interface PipeOverviewCardProps {
  readonly pipe: PipeSummary
  readonly motionIndex: number
}

export function PipeOverviewCard({ pipe, motionIndex }: PipeOverviewCardProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const navigate = useNavigate()
  const profile = useProfile(pipe.pipe_id)
  const open = (query: string) => {
    void navigate(`/pipes/${pipe.pipe_id}?${query}`, { viewTransition: true })
  }
  return (
    <Card
      motionIndex={motionIndex}
      eyebrow={t(CASE_TITLE[pipe.mode])}
      title={t("pipe:title", { pipe: pipe.pipe_id })}
      description={t("pipe:subtitle", {
        direction: pipe.passport.direction,
        section: pipe.passport.section_name,
      })}
    >
      <StatGrid>
        <Stat
          label={t("pipe:passport.target")}
          value={format.date(pipe.target_date)}
          hint={t(CASE_START[pipe.mode])}
        />
        <Stat
          label={t("pipe:passport.length")}
          value={format.integer(pipe.passport.length_m)}
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
          label={t("pipe:passport.median")}
          value={thickness.value(pipe.median_mm)}
          unit={t("pipe:unit.mmShort")}
          hint={t("pipe:passport.nominalHint", {
            value: thickness.withUnit(pipe.passport.nominal_wall_mm),
          })}
        />
      </StatGrid>
      <QueryView query={profile} label={t("pipe:loading")} skeleton={<Skeleton shape="block" />}>
        {(data) => (
          <SegmentStrip
            rows={data.rows}
            nominal={data.nominal_wall_mm}
            thinnest={pipe.thinnest_mm}
            selected={pipe.thinnest_segment_id}
            range={{ from: 0, to: data.rows.at(-1)?.end_m ?? 1 }}
            onSelect={(segment) => open(`segment=${segment}`)}
            onRange={(range) => open(`from=${Math.round(range.from)}&to=${Math.round(range.to)}`)}
          />
        )}
      </QueryView>
      <p className={styles.caption}>{t("overview:stripHint")}</p>
      <div className={styles.actions}>
        <ButtonLink to={`/pipes/${pipe.pipe_id}`} icon="arrow-right">
          {t("overview:open")}
        </ButtonLink>
        <ButtonLink to={`/pipes/${pipe.pipe_id}/priorities`} variant="secondary" icon="warning">
          {t("overview:priorities", { count: pipe.priority_count })}
        </ButtonLink>
      </div>
    </Card>
  )
}
