import styles from "./failure-scene.module.css"

const BOLTS: readonly (readonly [number, number])[] = [
  [28.64, 11.86],
  [11.86, 28.64],
  [-11.86, 28.64],
  [-28.64, 11.86],
  [-28.64, -11.86],
  [-11.86, -28.64],
  [11.86, -28.64],
  [28.64, -11.86],
]

export interface FlangeDrawingProps {
  readonly leaking: boolean
}

export function FlangeDrawing({ leaking }: FlangeDrawingProps) {
  return (
    <svg className={styles.flange} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle className={styles.ring} r="45" />
      <circle className={styles.axisFine} r="31" />
      <circle className={styles.fine} r="21" />
      <path className={styles.axisFine} d="M0 -60V60M-60 0H60" />
      {BOLTS.map(([cx, cy]) => (
        <circle key={`${cx}:${cy}`} className={styles.hole} cx={cx} cy={cy} r="3.25" />
      ))}
      <path
        className={styles.leader}
        d={leaking ? "M14.06 31.24L29.86 64H64" : "M14.06 -31.24L29.86 -64H64"}
      />
      {leaking ? (
        <g className={styles.leak}>
          <path className={styles.seep} d="M11.86 31.9q1.6 3.4 0 6.2q-1.6 -2.8 0 -6.2z" />
          <path
            className={styles.drop}
            d="M11.86 40q2.6 4.2 2.6 6a2.6 2.6 0 0 1 -5.2 0q0 -1.8 2.6 -6z"
          />
        </g>
      ) : null}
    </svg>
  )
}
