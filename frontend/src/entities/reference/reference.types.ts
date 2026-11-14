import type { components } from "@/shared/api"

type Schemas = components["schemas"]

export type Network = Schemas["NetworkOut"]
export type RouteLine = Schemas["RouteOut"]
export type Quality = Schemas["QualityOut"]
export type QualityCheck = Schemas["CheckOut"]
export type ModelValidation = Schemas["ModelOut"]
export type ValidationMetric = Schemas["MetricOut"]
export type FeatureShare = Schemas["ImportanceOut"]

export type ValidationComparison = Schemas["ComparisonOut"]
