import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"
import { frame, LENGTH, radial } from "./route.js"

const TAU = Math.PI * 2

export function shell(o) {
  const a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU
  const full = a1 - a0 >= TAU - 1e-6
  const along = o.along ?? Math.max(1, Math.ceil((o.s1 - o.s0) * 260))
  const round = o.round ?? Math.max(8, Math.ceil(80 * (a1 - a0) / TAU))
  const frames = Array.from({ length: along + 1 }, (_, i) => frame(o.s0 + (o.s1 - o.s0) * i / along))
  const P = [], N = [], U = [], F = [], I = []
  const angle = (v) => a0 + (a1 - a0) * v
  function vertex(i, a, r, normal, uv) {
    const f = frames[i]
    const p = f.center.clone().addScaledVector(radial(f, a), r)
    P.push(p.x, p.y, p.z); N.push(normal.x, normal.y, normal.z); U.push(uv[0], uv[1]); F.push(f.tangent.x, f.tangent.y, f.tangent.z)
  }
  function sheet(rows, cols, make) {
    const base = P.length / 3
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) make(i, j)
    const at = (k) => new Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2])
    const probe = base + Math.floor(rows / 2) * (cols + 1) + Math.floor(cols / 2)
    const pa = at(probe), pb = at(probe + 1), pc = at(probe + cols + 2)
    const facing = pc.sub(pa).cross(pb.sub(pa)).dot(new Vector3(N[probe * 3], N[probe * 3 + 1], N[probe * 3 + 2]))
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = base + i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1
      if (facing >= 0) I.push(a, c, b, b, c, d)
      else I.push(a, b, c, b, d, c)
    }
  }
  const sAt = (i) => (o.s0 + (o.s1 - o.s0) * i / along) * LENGTH
  sheet(along, round, (i, j) => { const a = angle(j / round); vertex(i, a, o.outer, radial(frames[i], a), [sAt(i), a * o.outer]) })
  if (o.inner > 0 && o.inside !== false) sheet(along, round, (i, j) => { const a = angle(j / round); vertex(i, a, o.inner, radial(frames[i], a).negate(), [sAt(i), a * o.inner]) })
  for (const [index, sign, on] of [[0, -1, o.capStart ?? true], [along, 1, o.capEnd ?? true]]) {
    if (!on) continue
    sheet(round, 1, (j, k) => {
      const a = angle(j / round), r = k ? o.outer : o.inner ?? 0
      vertex(index, a, r, frames[index].tangent.clone().multiplyScalar(sign), [Math.cos(a) * r, Math.sin(a) * r])
    })
  }
  if (!full) for (const [a, sign] of [[a0, -1], [a1, 1]]) {
    sheet(along, 1, (i, k) => {
      const f = frames[i]
      const normal = f.up.clone().multiplyScalar(-Math.sin(a)).addScaledVector(f.side, Math.cos(a)).multiplyScalar(sign)
      vertex(i, a, k ? o.outer : o.inner ?? 0, normal, [sAt(i), k ? o.outer : o.inner ?? 0])
    })
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(P, 3))
  geometry.setAttribute("normal", new Float32BufferAttribute(N, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(U, 2))
  geometry.setAttribute("aFlow", new Float32BufferAttribute(F, 3))
  geometry.setIndex(I)
  return geometry
}
