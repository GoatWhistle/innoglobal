import { type ReactNode, useState } from "react"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Disclosure, RangeField, Segmented, Select } from "@/shared/ui"
import { AlignedTrack } from "../aligned-track"
import { EvidenceLegend } from "../controls/evidence-legend"
import type { WorkspaceProps } from "../variant-types"
import styles from "./comparison.module.css"

interface ComparisonPanelProps extends WorkspaceProps {
  readonly date: string | undefined
  readonly onDate: (value: string) => void
  readonly compact?: boolean
  readonly controls?: ReactNode
}

export function ComparisonPanel(props: ComparisonPanelProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const { date, onDate, compact = false } = props
  const [mode, setMode] = useState<"beside" | "overlay">(compact ? "overlay" : "beside")
  const [boundary, setBoundary] = useState(compact ? 100 : 65)
  return (
    <section className={styles.panel} aria-label={t("variants:compareEvidence")}>
      <div className={styles.toolbar}>
        {props.controls}
        <Select
          label={t("variants:baseline")}
          value={date ?? "nominal"}
          onChange={onDate}
          options={
            props.profile.run_dates.length
              ? props.profile.run_dates.map((value) => ({
                  value,
                  label: t("variants:vtdDate", { date: format.date(value) }),
                }))
              : [{ value: "nominal", label: t("variants:nominalBase") }]
          }
        />
      </div>
      <div className={styles.comparison} data-mode={mode}>
        {mode === "beside" ? <AlignedTrack {...props} kind="observed" compact={compact} /> : null}
        <AlignedTrack
          {...props}
          kind="forecast"
          compact={compact}
          overlay={mode === "overlay"}
          split={mode === "overlay" && !compact ? boundary / 100 : undefined}
        />
        {mode === "overlay" ? (
          <>
            <EvidenceLegend date={date} />
            {!compact ? (
              <RangeField
                label={t("variants:boundary", { value: boundary })}
                value={boundary}
                min={0}
                max={100}
                onChange={setBoundary}
              />
            ) : null}
          </>
        ) : null}
      </div>
      <Disclosure title={t("variants:moreComparison")}>
        <Segmented
          label={t("variants:compareMode")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "beside", label: t("variants:beside"), icon: "layers" },
            { value: "overlay", label: t("variants:overlay"), icon: "chart" },
          ]}
        />
        <AlignedTrack {...props} kind="delta" compact={compact} />
        <p className={styles.note}>
          {t("variants:deltaExplanation", {
            date: date ? format.date(date) : t("variants:nominalBase"),
            target: format.date(props.pipe.target_date),
          })}
        </p>
      </Disclosure>
    </section>
  )
}
