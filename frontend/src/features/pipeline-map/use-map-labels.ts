import { useMemo } from "react"
import { useFormatters, useTranslation } from "@/shared/i18n"
import type { MapLabels } from "./map-drawing"

function places(value: number): number {
  return (String(value).split(".")[1] ?? "").length
}

export function useMapLabels(): MapLabels {
  const { t } = useTranslation()
  const format = useFormatters()
  return useMemo(
    () => ({
      distance: (km) =>
        km < 1
          ? t("variants:workspace.mapMeters", { value: format.number(km * 1000, 0) })
          : t("variants:workspace.mapKm", { value: format.number(km, places(km)) }),
    }),
    [t, format],
  )
}
