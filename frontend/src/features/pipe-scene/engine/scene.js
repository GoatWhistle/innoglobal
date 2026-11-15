import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three"
import { ANGLES, DIM } from "./geometry.js"
import { createProps } from "./props.js"
import { wallFragment, wallVertex } from "./shaders.js"
import { capFragment, capVertex, oilFragment, oilVertex } from "./shaders-cut.js"
export function createSceneParts(scene, textures) {
  const uniforms = {
    uField: { value: null },
    uUnroll: { value: 0 },
    uL: { value: DIM.L },
    uR: { value: DIM.R },
    uCut: { value: 2 },
    uDissolve: { value: 0 },
    uSel: { value: 0.5 },
    uHalf: { value: 0 },
    uHover: { value: -1 },
    uTexScale: { value: 1 },
    uLength: { value: 12000 },
    uSteel: { value: new Vector3() },
    uRust: { value: new Vector3() },
    uAmber: { value: new Vector3() },
    uInside: { value: new Vector3() },
    uMark: { value: new Vector3() },
    uGrid: { value: new Vector3() },
    uLight: { value: new Vector3(-0.35, 0.85, 0.55) },
    uAmbient: { value: 0.4 },
    uSpec: { value: 0.8 },
    uEnv: { value: null },
    uEnvPower: { value: 1 },
    uJoints: { value: 16 },
    uSteelMap: { value: textures.steel.color },
    uSteelNormal: { value: textures.steel.normal },
    uSteelSurface: { value: textures.steel.surface },
  }
  const wall = new Mesh(
    new PlaneGeometry(1, 1, 720, 96).translate(0.5, 0.5, 0),
    new ShaderMaterial({
      uniforms,
      vertexShader: wallVertex,
      fragmentShader: wallFragment,
      side: DoubleSide,
    }),
  )
  wall.frustumCulled = false
  wall.geometry.attributes.uv.array.set(
    wall.geometry.attributes.position.array.filter((_, i) => i % 3 !== 2),
  )
  const capUniforms = {
    uSteel: uniforms.uSteel,
    uRust: uniforms.uRust,
    uAmber: uniforms.uAmber,
    uLight: uniforms.uLight,
    uAmbient: uniforms.uAmbient,
    uSpec: uniforms.uSpec,
    uPaper: { value: new Vector3() },
    uInk: { value: new Vector3() },
    uDrawing: { value: 0 },
    uOpacity: { value: 0 },
    uEnv: uniforms.uEnv,
    uEnvPower: uniforms.uEnvPower,
  }
  const capGeometry = new BufferGeometry(),
    oilGeometry = new BufferGeometry()
  capGeometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array((ANGLES + 1) * 2 * 3), 3),
  )
  capGeometry.setIndex(
    Array.from({ length: ANGLES }, (_, i) => [
      i * 2,
      i * 2 + 1,
      i * 2 + 2,
      i * 2 + 1,
      i * 2 + 3,
      i * 2 + 2,
    ]).flat(),
  )
  capGeometry.setAttribute(
    "aEdge",
    new BufferAttribute(
      Float32Array.from({ length: (ANGLES + 1) * 2 }, (_, i) => i % 2),
      1,
    ),
  )
  oilGeometry.setAttribute("position", new BufferAttribute(new Float32Array((ANGLES + 2) * 3), 3))
  oilGeometry.setAttribute(
    "aRim",
    new BufferAttribute(
      Float32Array.from({ length: ANGLES + 2 }, (_, i) => (i ? 1 : 0)),
      1,
    ),
  )
  oilGeometry.setIndex(Array.from({ length: ANGLES }, (_, i) => [0, i + 1, i + 2]).flat())
  const cap = new Mesh(
    capGeometry,
    new ShaderMaterial({
      uniforms: capUniforms,
      vertexShader: capVertex,
      fragmentShader: capFragment,
      side: DoubleSide,
      transparent: true,
    }),
  )
  const oilUniforms = {
    uCrude: { value: new Vector3() },
    uSheen: { value: new Vector3() },
    uLight: uniforms.uLight,
    uOpacity: capUniforms.uOpacity,
    uDrawing: capUniforms.uDrawing,
    uEnv: uniforms.uEnv,
    uEnvPower: uniforms.uEnvPower,
    uTime: { value: 0 },
  }
  const oil = new Mesh(
    oilGeometry,
    new ShaderMaterial({
      uniforms: oilUniforms,
      vertexShader: oilVertex,
      fragmentShader: oilFragment,
      side: DoubleSide,
      transparent: true,
    }),
  )
  const outline = [
    new LineLoop(new BufferGeometry(), new LineBasicMaterial({ transparent: true })),
    new LineLoop(new BufferGeometry(), new LineBasicMaterial({ transparent: true })),
  ]
  for (const line of outline)
    line.geometry.setAttribute("position", new BufferAttribute(new Float32Array(ANGLES * 3), 3))
  const props = createProps({
    L: DIM.L,
    R: DIM.R,
    concrete: textures.concrete.color,
    shared: uniforms,
  })
  scene.add(...props.meshes, wall, cap, oil, ...outline)
  return {
    uniforms,
    wall,
    capUniforms,
    capGeometry,
    oilGeometry,
    cap,
    oilUniforms,
    oil,
    outline,
    props,
  }
}
