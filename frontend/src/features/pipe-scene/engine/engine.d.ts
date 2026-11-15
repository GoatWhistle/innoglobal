export interface AnnotationFrame {
  marker: { x: number; y: number }
  moving: boolean
  flat: boolean
  sheet: [{ x: number; y: number }, { x: number; y: number }]
}
export interface SceneData {
  lengthM: number
  nominalMm: number
  segments: { startM: number; endM: number; predictedMm: number }[]
}
export interface WallEngine {
  setData(data: SceneData): void
  select(index: number, instant?: boolean): void
  setMode(mode: string, instant?: boolean): void
  setTheme(theme: string): void
  resize(width: number, height: number, wide: boolean): void
  dispose(): void
}
export function createWallEngine(
  canvas: HTMLCanvasElement,
  callbacks: {
    onPick: (point: { meters: number; hour: number }) => void
    durations: Record<"route" | "unroll" | "section" | "move", number>
    onFrame: (frame: AnnotationFrame) => void
    onFailure: (reason: string) => void
  },
): WallEngine
