export const SEGMENT_M = 12000
export const WAVE_MS = 1050
export const SENSORS_M = [0, 2400, 4800, 7200, 9600, 12000]
export const SAMPLES = 256
export const P_RANGE = [3.6, 5.1]

export const DIAMETER = 0.514
const ROUGHNESS = 0.0001
const FLOW = 1500 / 3600
const DENSITY = 870
const P_IN = 5.0
const T_IN = 52
const T_GROUND = 6
const SHUKHOV_M = 38000
const MU_50 = 0.018
const MU_SLOPE = 0.035
const LEAK_DROP = 0.32
const LEAK_SHARE = 0.08
const RISE = 0.22
export const ARRIVE = 0.045
export const THRESHOLD = 0.07
export const HOLD = 0.4
const FILTER = 0.12
const STEP = 0.01

function friction(re) {
  return 0.25 / Math.log10(ROUGHNESS / (3.7 * DIAMETER) + 5.74 / re ** 0.9) ** 2
}

function buildModel() {
  const velocity = FLOW / ((Math.PI * DIAMETER ** 2) / 4)
  const dx = SEGMENT_M / (SAMPLES - 1)
  const out = new Float32Array(SAMPLES)
  let pressure = P_IN * 1e6
  for (let i = 0; i < SAMPLES; i++) {
    out[i] = pressure / 1e6
    const temperature = T_GROUND + (T_IN - T_GROUND) * Math.exp(-(i * dx) / SHUKHOV_M)
    const viscosity = MU_50 * Math.exp(-MU_SLOPE * (temperature - 50))
    const re = (DENSITY * velocity * DIAMETER) / viscosity
    pressure -= ((friction(re) * DENSITY * velocity ** 2) / (2 * DIAMETER)) * dx
  }
  return out
}

function gauss(random) {
  return (random() + random() + random() - 1.5) * 1.15
}

export function createSim(random = Math.random) {
  const model = buildModel()
  const measured = new Float32Array(SAMPLES)
  const sensors = SENSORS_M.map((x, i) => ({
    id: i + 1,
    x,
    residual: 0,
    arrival: null,
    since: null,
    tripped: false,
    state: 0,
  }))
  let time = 0
  let pending = 0
  let leak = null
  let detection = null

  function modelAt(x) {
    const f = (Math.min(Math.max(x, 0), SEGMENT_M) / SEGMENT_M) * (SAMPLES - 1)
    const i = Math.min(Math.floor(f), SAMPLES - 2)
    return model[i] + (model[i + 1] - model[i]) * (f - i)
  }

  function amplitude(x) {
    const shape = x < leak.x ? x / leak.x : (SEGMENT_M - x) / (SEGMENT_M - leak.x)
    return LEAK_DROP * (0.25 + 0.75 * shape)
  }

  function rise(x, t) {
    if (!leak) return 0
    const tau = t - leak.t0 - Math.abs(x - leak.x) / WAVE_MS
    return tau <= 0 ? 0 : 1 - Math.exp(-tau / RISE)
  }

  function drop(x, t) {
    return leak ? amplitude(x) * rise(x, t) : 0
  }

  function ripple(x, t) {
    return (
      0.005 * Math.sin(x * 0.0011 + t * 0.9) +
      0.0035 * Math.sin(x * 0.0029 - t * 1.7) +
      0.0025 * Math.sin(x * 0.0071 + t * 2.6)
    )
  }

  function locate() {
    const arrived = sensors.filter((s) => s.arrival !== null)
    const first = arrived.reduce((a, b) => (b.arrival < a.arrival ? b : a))
    const i = sensors.indexOf(first)
    const sides = [sensors[i - 1], sensors[i + 1]].filter((s) => s && s.arrival !== null)
    if (!sides.length) return { x: first.x, spread: 1200, pair: [first.id] }
    const other = sides.reduce((a, b) => (b.arrival < a.arrival ? b : a))
    const [l, r] = first.x < other.x ? [first, other] : [other, first]
    const x = (l.x + r.x) / 2 + (WAVE_MS * (l.arrival - r.arrival)) / 2
    return { x: Math.min(Math.max(x, l.x), r.x), spread: WAVE_MS * STEP * 4, pair: [l.id, r.id] }
  }

  function tick() {
    time += STEP
    const k = 1 - Math.exp(-STEP / FILTER)
    for (const s of sensors) {
      const reading = modelAt(s.x) + ripple(s.x, time) - drop(s.x, time) + gauss(random) * 0.004
      s.model = modelAt(s.x)
      s.measured = reading
      s.residual += (modelAt(s.x) - reading - s.residual) * k
      if (leak && s.arrival === null && s.residual > ARRIVE) s.arrival = time
      if (s.residual > THRESHOLD) s.since ??= time
      else s.since = null
      s.tripped = s.since !== null && time - s.since >= HOLD
      s.state = detection?.pair.includes(s.id) ? 2 : s.residual > ARRIVE ? 1 : 0
    }
    if (leak && !detection && sensors.filter((s) => s.tripped).length >= 2) {
      const found = locate()
      detection = {
        seconds: time - leak.t0,
        x: found.x,
        spread: found.spread,
        error: Math.abs(found.x - leak.x),
        pair: found.pair,
      }
    }
  }

  return {
    model,
    measured,
    sensors,
    get time() {
      return time
    },
    get leak() {
      return leak
    },
    get detection() {
      return detection
    },
    get age() {
      return leak ? time - leak.t0 : 0
    },
    advance(dt) {
      pending += Math.max(0, dt)
      while (pending + 1e-9 >= STEP) {
        pending -= STEP
        tick()
      }
    },
    insert(x) {
      leak = { x: Math.min(Math.max(x, 60), SEGMENT_M - 60), t0: time }
      detection = null
      for (const s of sensors) {
        s.arrival = null
        s.since = null
        s.tripped = false
        s.state = 0
      }
      return leak.x
    },
    clear() {
      leak = null
      detection = null
      for (const s of sensors) {
        s.arrival = null
        s.since = null
        s.tripped = false
        s.state = 0
        s.residual = 0
      }
    },
    fronts() {
      if (!leak) return null
      const reach = (time - leak.t0) * WAVE_MS
      return [leak.x - reach, leak.x + reach].map((x) => ({
        x,
        strength: x >= 0 && x <= SEGMENT_M ? amplitude(x) / LEAK_DROP : 0,
      }))
    },
    flowShare() {
      if (!leak) return [1, 1]
      const s = rise(leak.x, time)
      return [1 + LEAK_SHARE * 0.5 * s, 1 - LEAK_SHARE * s]
    },
    sample() {
      for (let i = 0; i < SAMPLES; i++) {
        const x = (i / (SAMPLES - 1)) * SEGMENT_M
        measured[i] = model[i] + ripple(x, time) - drop(x, time)
      }
      return measured
    },
  }
}
