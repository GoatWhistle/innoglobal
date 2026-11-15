import { useCallback } from "react"
import { useFormatters, useTranslation } from "@/shared/i18n"

export const THICKNESS_DIGITS = 2

export function useThickness() {
  const { t } = useTranslation()
  const format = useFormatters()
  const value = useCallback((mm: number) => format.number(mm, THICKNESS_DIGITS), [format])
  const withUnit = useCallback(
    (mm: number) => t("pipe:unit.mm", { value: format.number(mm, THICKNESS_DIGITS) }),
    [format, t],
  )
  const distance = useCallback(
    (m: number) => t("pipe:unit.m", { value: format.integer(m) }),
    [format, t],
  )
  const range = useCallback(
    (from: number, to: number) =>
      t("pipe:unit.range", { from: format.integer(from), to: format.integer(to) }),
    [format, t],
  )
  return { value, withUnit, distance, range }
}
