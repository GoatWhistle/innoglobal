const START = { yaw: -0.55, roll: 0.12, fill: 0 }

function viscous(t) {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t)
}

export function createIntro({ group, state, reduced, impulse, delay = 0, duration = 1.6 }) {
  let elapsed = -delay
  let running = !reduced.matches
  state.fill = running ? START.fill : 1
  if (running) group.rotation.set(0, START.yaw, START.roll)
  function tickIntro(dt) {
    if (!running) return
    elapsed += dt
    const progress = Math.max(0, Math.min(1, elapsed / duration))
    const eased = viscous(progress)
    if (!state.inspection && !state.manualView) {
      group.rotation.y = START.yaw * (1 - eased)
      group.rotation.z = START.roll * (1 - eased)
    }
    state.fill = START.fill + (1 - START.fill) * viscous(Math.max(0, progress - 0.15) / 0.85)
    if (progress === 1) running = false
  }
  function nudge() {
    if (reduced.matches) return
    impulse(26, 14)
  }
  return { tickIntro, nudge }
}
