import { useModelValidation } from "@/entities/reference"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { Card, PageHeader, QueryView, Skeleton } from "@/shared/ui"
import { CaseValidation } from "./case-validation"
import styles from "./model-page.module.css"

const LIMITS = ["level", "pearson", "quantiles", "neighbours", "regime"] as const

export function ModelPage() {
  const { t } = useTranslation()
  const model = useModelValidation()
  useDocumentTitle(t("model:pageTitle"))
  return (
    <div className={styles.page}>
      <PageHeader title={t("model:title")} description={t("model:description")} />
      <QueryView query={model} label={t("model:loading")} skeleton={<Skeleton lines={14} />}>
        {(data) => (
          <div className={styles.grid}>
            {data.cases.map((item, index) => (
              <CaseValidation
                key={item.case_id}
                model={data}
                caseId={item.case_id}
                motionIndex={index}
              />
            ))}
            <Card
              appearance="sheet"
              title={t("model:uncertainty.title")}
              motionIndex={data.cases.length}
            >
              <p className={styles.note}>
                {t("model:uncertainty.body", { quantiles: data.quantiles.join(", ") })}
              </p>
            </Card>
            <Card
              appearance="sheet"
              title={t("model:limits.title")}
              motionIndex={data.cases.length + 1}
            >
              <ul className={styles.limits}>
                {LIMITS.map((key) => (
                  <li key={key}>{t(`model:limits.${key}`)}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </QueryView>
    </div>
  )
}
