export function illustrativeAngle(position: number): number {
  return (
    (6 +
      1.25 * Math.sin(position * Math.PI * 2 * 2.7) +
      0.55 * Math.sin(position * Math.PI * 2 * 8.4) +
      12) %
    12
  )
}

export function illustrativeThickness(
  nominal: number,
  minimum: number,
  position: number,
  hour: number,
): number {
  const loss = nominal - minimum
  const delta = Math.abs(hour - illustrativeAngle(position)) % 12
  const distance = Math.min(delta, 12 - delta)
  const spread = 1.15 + 0.55 * Math.sin(position * Math.PI * 2 * 4.9) ** 2
  return nominal - loss * (0.22 + 0.78 * Math.exp(-((distance / spread) ** 2)))
}
