import type { components } from "@/shared/api"

type Schemas = components["schemas"]

export type PipeSummary = Schemas["PipeOut"]
export type PipeList = Schemas["PipeListOut"]
export type Profile = Schemas["ProfileOut"]
export type SegmentRow = Schemas["SegmentOut"]
export type SegmentDetail = Schemas["SegmentDetailOut"]
export type Priorities = Schemas["PrioritiesOut"]
export type Observation = Schemas["ObservationOut"]
export type InspectionRun = Schemas["RunOut"]
export type ForecastMode = PipeSummary["mode"]
