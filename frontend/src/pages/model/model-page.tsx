import { useModelValidation } from "@/entities/reference"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { PageHeader, QueryView, Skeleton } from "@/shared/ui"
import { CaseValidation } from "./case-validation"
import { ModelNotes } from "./model-notes"
import styles from "./model-page.module.css"
import { ModelVerdict } from "./model-verdict"

export function ModelPage() {
  const { t } = useTranslation()
  const model = useModelValidation()
  useDocumentTitle(t("model:pageTitle"))
  return (
    <div className={styles.page}>
      <PageHeader title={t("model:title")} description={t("model:description")} />
      <QueryView query={model} label={t("model:loading")} skeleton={<Skeleton lines={14} />}>
        {(data) => (
          <div className={styles.stack}>
            <ModelVerdict model={data} />
            {data.cases.map((item) => (
              <CaseValidation key={item.case_id} model={data} caseId={item.case_id} />
            ))}
            <ModelNotes quantiles={data.quantiles} />
          </div>
        )}
      </QueryView>
    </div>
  )
}
