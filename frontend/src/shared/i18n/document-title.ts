export const TITLE_SEPARATOR = " | "

export function documentTitle(app: string, page: string | null): string {
  const parts = page === null ? [app] : [page, app]
  return parts.filter((part) => part.trim() !== "").join(TITLE_SEPARATOR)
}
