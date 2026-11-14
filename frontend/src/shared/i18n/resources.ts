import type { Locale } from "./locale"
import enCommon from "./locales/en/common.json"
import enErrors from "./locales/en/errors.json"
import enHealth from "./locales/en/health.json"
import enInspector from "./locales/en/inspector.json"
import enModel from "./locales/en/model.json"
import enOverview from "./locales/en/overview.json"
import enPipe from "./locales/en/pipe.json"
import enPriorities from "./locales/en/priorities.json"
import enProfile from "./locales/en/profile.json"
import enQuality from "./locales/en/quality.json"
import enRoute from "./locales/en/route.json"
import enSection from "./locales/en/section.json"
import ruCommon from "./locales/ru/common.json"
import ruErrors from "./locales/ru/errors.json"
import ruHealth from "./locales/ru/health.json"
import ruInspector from "./locales/ru/inspector.json"
import ruModel from "./locales/ru/model.json"
import ruOverview from "./locales/ru/overview.json"
import ruPipe from "./locales/ru/pipe.json"
import ruPriorities from "./locales/ru/priorities.json"
import ruProfile from "./locales/ru/profile.json"
import ruQuality from "./locales/ru/quality.json"
import ruRoute from "./locales/ru/route.json"
import ruSection from "./locales/ru/section.json"

export const NAMESPACES = [
  "common",
  "errors",
  "health",
  "inspector",
  "model",
  "overview",
  "pipe",
  "priorities",
  "profile",
  "quality",
  "route",
  "section",
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const DEFAULT_NAMESPACE: Namespace = "common"

const en = {
  common: enCommon,
  errors: enErrors,
  health: enHealth,
  inspector: enInspector,
  model: enModel,
  overview: enOverview,
  pipe: enPipe,
  priorities: enPriorities,
  profile: enProfile,
  quality: enQuality,
  route: enRoute,
  section: enSection,
}

const ru = {
  common: ruCommon,
  errors: ruErrors,
  health: ruHealth,
  inspector: ruInspector,
  model: ruModel,
  overview: ruOverview,
  pipe: ruPipe,
  priorities: ruPriorities,
  profile: ruProfile,
  quality: ruQuality,
  route: ruRoute,
  section: ruSection,
}

export type Dictionary = typeof en

export const resources = { en, ru } satisfies Record<Locale, Record<Namespace, object>>
