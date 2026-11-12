import { CanvasTexture, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace } from "three"

function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function field(size, { cells = 4, sx = 1, sy = 1, octaves = 4, seed = 1 }) {
  const out = new Float32Array(size * size)
  let amplitude = 0.5, total = 0
  for (let o = 0; o < octaves; o++) {
    const nx = Math.max(1, Math.round(cells * sx * 2 ** o)), ny = Math.max(1, Math.round(cells * sy * 2 ** o))
    const next = random(seed * 977 + o * 131)
    const lattice = Float32Array.from({ length: nx * ny }, next)
    for (let y = 0; y < size; y++) {
      const fy = y / size * ny, y0 = Math.floor(fy), ty = fy - y0, wy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < size; x++) {
        const fx = x / size * nx, x0 = Math.floor(fx), tx = fx - x0, wx = tx * tx * (3 - 2 * tx)
        const a = lattice[(y0 % ny) * nx + (x0 % nx)], b = lattice[(y0 % ny) * nx + ((x0 + 1) % nx)]
        const c = lattice[((y0 + 1) % ny) * nx + (x0 % nx)], d = lattice[((y0 + 1) % ny) * nx + ((x0 + 1) % nx)]
        out[y * size + x] += amplitude * (a + (b - a) * wx + (c - a + (a - b + d - c) * wx) * wy)
      }
    }
    total += amplitude
    amplitude *= 0.5
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

export function strokes(size, count, seed) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const context = canvas.getContext("2d")
  const next = random(seed)
  context.fillStyle = "#000"
  context.fillRect(0, 0, size, size)
  context.lineCap = "round"
  for (let i = 0; i < count; i++) {
    const x = next() * size, y = next() * size, angle = (next() - 0.5) * (next() < 0.7 ? 0.5 : 3), length = 6 + next() ** 3 * 150
    context.strokeStyle = `rgba(255,255,255,${0.15 + next() * 0.55})`
    context.lineWidth = 0.6 + next() ** 4 * 2.2
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      context.beginPath()
      context.moveTo(x + ox, y + oy)
      context.quadraticCurveTo(x + ox + Math.cos(angle) * length * 0.5 + (next() - 0.5) * 8, y + oy + Math.sin(angle) * length * 0.5, x + ox + Math.cos(angle) * length, y + oy + Math.sin(angle) * length)
      context.stroke()
    }
  }
  const data = context.getImageData(0, 0, size, size).data
  return Float32Array.from({ length: size * size }, (_, i) => data[i * 4] / 255)
}

function texture(size, paint, color) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const context = canvas.getContext("2d")
  const image = context.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const [r, g, b] = paint(i)
    image.data[i * 4] = r; image.data[i * 4 + 1] = g; image.data[i * 4 + 2] = b; image.data[i * 4 + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const map = new CanvasTexture(canvas)
  map.wrapS = map.wrapT = RepeatWrapping
  map.colorSpace = color ? SRGBColorSpace : LinearSRGBColorSpace
  map.anisotropy = 8
  return map
}

export function normalMap(size, height, strength) {
  return texture(size, (i) => {
    const x = i % size, y = (i - x) / size
    const dx = height[y * size + (x + 1) % size] - height[y * size + (x + size - 1) % size]
    const dy = height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x]
    const nx = -dx * strength, ny = -dy * strength, l = Math.hypot(nx, ny, 1)
    return [(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255]
  })
}

export const surfaceMap = (size, rough, metal) => texture(size, (i) => [0, Math.min(1, Math.max(0, rough(i))) * 255, metal * 255])
export const colorMap = (size, paint) => texture(size, paint, true)

export function tile(map, x, y) {
  map.repeat.set(1 / x, 1 / y)
  return map
}

export function createTextures() {
  const size = 512
  const brush = field(size, { cells: 3, sx: 1, sy: 42, octaves: 3, seed: 3 })
  const cloud = field(size, { cells: 3, octaves: 5, seed: 7 })
  const grain = field(size, { cells: 48, octaves: 2, seed: 11 })
  const scratch = field(size, { cells: 2, sx: 60, sy: 1, octaves: 3, seed: 17 })
  const fibre = field(size, { cells: 6, sx: 1, sy: 18, octaves: 3, seed: 23 })
  const fibreAcross = field(size, { cells: 6, sx: 14, sy: 1, octaves: 3, seed: 29 })
  const pores = field(size, { cells: 70, octaves: 2, seed: 31 })
  const mix = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k)
  const scuff = strokes(size, 420, 41), wear = strokes(size, 260, 53)
  const jacketHeight = mix(mix(cloud, brush, 0.3), grain, 0.06).map((v, i) => v - scuff[i] * 0.16)
  const steelHeight = mix(mix(cloud, scratch, 0.35), grain, 0.04).map((v, i) => v - wear[i] * 0.22)
  const woolHeight = mix(mix(fibre, fibreAcross, 0.5), grain, 0.35)
  const concreteHeight = mix(cloud, pores, 0.45)
  return {
    jacket: { normal: tile(normalMap(size, jacketHeight, 3), 1.4, 2.6), surface: tile(surfaceMap(size, (i) => 0.27 + cloud[i] * 0.22 + brush[i] * 0.14 + scuff[i] * 0.3, 1), 1.4, 2.6) },
    steel: {
      normal: tile(normalMap(size, steelHeight, 2.5), 1.6, 1.6),
      surface: tile(surfaceMap(size, (i) => 0.3 + cloud[i] * 0.34 + scratch[i] * 0.12 + wear[i] * 0.28, 1), 1.6, 1.6),
      color: tile(colorMap(size, (i) => { const v = 175 + cloud[i] * 70 + grain[i] * 10 + wear[i] * 40; return [v, v * 0.99, v * 0.98] }), 1.6, 1.6),
    },
    wool: {
      normal: tile(normalMap(size, woolHeight, 26), 0.9, 0.9),
      color: tile(colorMap(size, (i) => { const v = 150 + woolHeight[i] * 120; return [v, v * 0.965, v * 0.9] }), 0.9, 0.9),
    },
    concrete: {
      normal: tile(normalMap(size, concreteHeight, 7), 5, 5),
      surface: tile(surfaceMap(size, (i) => 0.72 + cloud[i] * 0.22 - pores[i] * 0.1, 0), 5, 5),
      color: tile(colorMap(size, (i) => { const v = 170 + cloud[i] * 70 - pores[i] * 28; return [v, v * 0.99, v * 0.975] }), 5, 5),
    },
  }
}

export function disposeTextures(set) {
  for (const group of Object.values(set)) for (const map of Object.values(group)) map.dispose()
}
