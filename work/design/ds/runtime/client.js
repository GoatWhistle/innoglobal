export function createClient(state, update, fail) {
  const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" })
  const sim = { sensors: [], model: [], measured: [], time: 0, leak: null, detection: null,
    flowShare: () => sim.flow ?? [1, 1], fronts: () => sim.wave ?? null }
  const send = (type, extra = {}) => worker.postMessage({ type, ...extra })
  worker.onmessage = ({ data }) => {
    const { fronts, ...rest } = data
    Object.assign(sim, rest, { wave: fronts })
    update(sim)
  }
  worker.onerror = fail
  send("init", { state })
  addEventListener("pagehide", () => worker.terminate(), { once: true })
  return { sim, send }
}
