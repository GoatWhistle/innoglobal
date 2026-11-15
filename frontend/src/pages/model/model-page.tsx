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
            {data.cases.map((item) => (
              <CaseValidation key={item.case_id} model={data} caseId={item.case_id} />
            ))}
            <Card appearance="ruled" title={t("model:uncertainty.title")}>
              <p className={styles.prose}>
                {t("model:uncertainty.body", { quantiles: data.quantiles.join(", ") })}
              </p>
            </Card>
            <Card appearance="ruled" title={t("model:limits.title")}>
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
