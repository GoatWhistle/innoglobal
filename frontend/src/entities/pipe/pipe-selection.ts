const STORAGE_KEY = "duppel-selected-pipe"

export function readSelectedPipe(): number | null {
  try {
    const value = Number(sessionStorage.getItem(STORAGE_KEY))
    return Number.isSafeInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function rememberSelectedPipe(pipeId: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(pipeId))
  } catch {
    return
  }
}
