import type { SegmentRow } from "@/entities/pipe"
export interface MaterialEngine {
  dispose(): void
  inspect(fraction: number): void
  corrosionMap(rows: readonly SegmentRow[], length: number): void
  cancelInspection(): void
  reset(): void
  mark(fraction: number | null): void
  zoom(factor: number): void
  fit(): void
  nudge(): void
}
export interface PipeIntro {
  readonly delay?: number
  readonly duration?: number
}
export function createPipe(
  host: HTMLElement,
  name: string,
  onPhase?: (phase: string) => void,
  options?: { readonly intro?: PipeIntro },
): MaterialEngine
