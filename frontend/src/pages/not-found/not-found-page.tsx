import { useLocation } from "react-router"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { ButtonLink, FailureScene } from "@/shared/ui"

const CODE = ["4", "4"] as const

export function NotFoundPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  useDocumentTitle(t("common:notFound.title"))
  return (
    <FailureScene
      code={CODE}
      eyebrow={t("common:notFound.eyebrow")}
      title={t("common:notFound.heading")}
      callout={t("common:notFound.callout")}
      actions={
        <ButtonLink to="/" icon="arrow-left">
          {t("common:notFound.home")}
        </ButtonLink>
      }
    >
      <p>{t("common:notFound.description", { path: pathname })}</p>
    </FailureScene>
  )
}
