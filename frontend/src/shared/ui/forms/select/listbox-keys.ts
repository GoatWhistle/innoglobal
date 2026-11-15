export function rovingIndex(key: string, current: number, length: number): number | null {
  if (length === 0) return null
  const last = length - 1
  if (key === "ArrowDown") return current < last ? current + 1 : 0
  if (key === "ArrowUp") return current > 0 ? current - 1 : last
  if (key === "Home" || key === "PageUp") return 0
  if (key === "End" || key === "PageDown") return last
  return null
}

export function typeaheadIndex(
  query: string,
  labels: readonly string[],
  from: number,
): number | null {
  const needle = query.toLocaleLowerCase()
  if (needle === "") return null
  const single = [...needle].every((char) => char === needle[0])
  const start = single ? from + 1 : Math.max(0, from)
  const order = labels.map((_, index) => (start + index) % labels.length)
  const probe = single ? needle.slice(0, 1) : needle
  const hit = order.find((index) => labels[index]?.toLocaleLowerCase().startsWith(probe))
  return hit ?? null
}

export function isTypeaheadKey(key: string): boolean {
  return key.length === 1 && key !== " "
}
