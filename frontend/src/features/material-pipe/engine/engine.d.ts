import type { SegmentRow } from "@/entities/pipe"
export interface MaterialEngine {
  dispose(): void
  inspect(fraction: number): void
  corrosionMap(rows: readonly SegmentRow[], length: number): void
  cancelInspection(): void
  reset(): void
  zoom(factor: number): void
  fit(): void
}
export function createPipe(
  host: HTMLElement,
  name: string,
  onPhase?: (phase: string) => void,
): MaterialEngine
