import { DashboardLibrary } from "@/features/engineering-assistant"

import { useDocumentTitle, useTranslation } from "@/shared/i18n"

export function AssistantDashboardsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t("assistant:dashboards"))
  return <DashboardLibrary />
}
