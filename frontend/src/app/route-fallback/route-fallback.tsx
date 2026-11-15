import { useTranslation } from "@/shared/i18n"
import { LoadingScene } from "@/shared/ui"

export function RouteFallback() {
  const { t } = useTranslation()
  return <LoadingScene label={t("common:state.loading")} />
}
