import type { ReactNode } from "react"
import type { DistanceRange, PipeSummary, Profile, SegmentRow } from "@/entities/pipe"

export type Variant = "inspection"
export interface WorkspaceProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly row: SegmentRow
  readonly range: DistanceRange
  readonly onSelect: (id: number) => void
  readonly onRange: (range: DistanceRange) => void
  readonly onReset: () => void
  readonly section: ReactNode
  readonly sceneControls?: ReactNode
  readonly overview?: ReactNode
  readonly aside?: (range: DistanceRange) => ReactNode
  readonly baselineDate?: string | undefined
  readonly onComparisonDate?: (date: string) => void
  readonly hoverPosition?: number | null
  readonly onHoverPosition?: (position: number | null) => void
  readonly highlights?: readonly number[]
  readonly scene: ReactNode
}
export type TrackKind = "forecast" | "observed" | "elevation" | "priority" | "delta"
export interface TrackProps extends WorkspaceProps {
  readonly kind: TrackKind
  readonly compact?: boolean
  readonly date?: string | undefined
  readonly overlay?: boolean
  readonly split?: number | undefined
}
