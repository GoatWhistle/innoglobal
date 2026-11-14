import { Navigate, useLocation } from "react-router"
import { readSelectedPipe, usePipes } from "@/entities/pipe"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { QueryView, Skeleton } from "@/shared/ui"

export function PipeRedirectPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const pipes = usePipes()
  useDocumentTitle(t("common:nav.pipes"))
  const suffix = location.pathname.startsWith("/priorities") ? "/priorities" : ""
  return (
    <QueryView query={pipes} label={t("pipe:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => {
        const first =
          data.items.find((item) => item.pipe_id === readSelectedPipe()) ?? data.items[0]
        return first === undefined ? (
          <Navigate to="/" replace />
        ) : (
          <Navigate to={`/pipes/${first.pipe_id}${suffix}`} replace />
        )
      }}
    </QueryView>
  )
}
