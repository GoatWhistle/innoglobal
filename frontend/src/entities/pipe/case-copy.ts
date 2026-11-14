import type { MessageKey } from "@/shared/i18n"
import type { ForecastMode } from "./pipe.types"

export const CASE_TITLE: Readonly<Record<ForecastMode, MessageKey>> = {
  between_inspections: "pipe:case.between.title",
  from_commissioning: "pipe:case.commissioning.title",
}

export const CASE_START: Readonly<Record<ForecastMode, MessageKey>> = {
  between_inspections: "pipe:case.between.start",
  from_commissioning: "pipe:case.commissioning.start",
}

export const CASE_SHORT: Readonly<Record<ForecastMode, MessageKey>> = {
  between_inspections: "pipe:case.between.short",
  from_commissioning: "pipe:case.commissioning.short",
}
