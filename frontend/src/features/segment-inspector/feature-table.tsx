import type { SegmentDetail } from "@/entities/pipe"
import { featureKey } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable, NoValue } from "@/shared/ui"
import styles from "./segment-inspector.module.css"

export interface FeatureTableProps {
  readonly features: SegmentDetail["features"]
}

export function FeatureTable({ features }: FeatureTableProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const number = (value: number | null) =>
    value === null ? <NoValue /> : format.number(value, Math.abs(value) >= 100 ? 0 : 2)
  return (
    <DataTable
      label={t("inspector:features")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("inspector:featureName")}</th>
          <th scope="col" data-numeric="">
            {t("inspector:featureValue")}
          </th>
          <th scope="col" data-numeric="">
            {t("inspector:featureMedian")}
          </th>
          <th scope="col" data-numeric="">
            {t("inspector:featureShare")}
          </th>
        </tr>
      }
    >
      {features.map((item) => {
        const key = featureKey(item.name)
        return (
          <tr key={item.name}>
            <th scope="row" className={styles.featureName}>
              {key === null ? <code>{item.name}</code> : t(key)}
            </th>
            <td data-numeric="">{number(item.value)}</td>
            <td data-numeric="">{number(item.pipe_median)}</td>
            <td data-numeric="">{format.percent(item.share, 1)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}
