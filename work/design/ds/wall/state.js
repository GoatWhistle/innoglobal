import { makeExample, priorityIds, segmentAt } from '../scanner/data.js'
import { lossHour } from './field.js'

export const MODES = ['route', 'unroll', 'section']

export function createWallStore(caseId = 1, example = 'ready', initialMode = 'route') {
  let pipeline = makeExample(caseId, example)
  let selected = Math.min(630, Math.max(0, pipeline.segments.length - 1)), hour = null, priority = false
  let mode = MODES.includes(initialMode) ? initialMode : 'route'
  let status = ['loading', 'error', 'empty'].includes(example) ? example : 'ready'
  let priorities = priorityIds(pipeline)
  const listeners = new Set()
  const snapshot = () => {
    const segment = pipeline.segments[selected] ?? null
    return { pipeline, selected, segment, mode, priority, priorities, status,
      hour: hour ?? (segment ? lossHour(pipeline, segment) : 6), hourPicked: hour !== null }
  }
  const publish = () => listeners.forEach((fn) => fn(snapshot()))
  return {
    snapshot,
    subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn) },
    select(id, pickedHour = null) {
      if (!Number.isFinite(id) || status !== 'ready' || !pipeline.segments.length) return
      selected = Math.max(0, Math.min(pipeline.segments.length - 1, Math.trunc(id)))
      hour = Number.isFinite(pickedHour) ? pickedHour : null
      publish()
    },
    at(meters, pickedHour = null) { this.select(segmentAt(pipeline, meters), pickedHour) },
    setMode(next) { if (MODES.includes(next) && next !== mode) { mode = next; publish() } },
    switchCase(id) {
      pipeline = makeExample(id, example === 'missing' ? 'missing' : 'ready')
      priorities = priorityIds(pipeline); selected = 0; hour = null; status = 'ready'; publish()
    },
    togglePriority() { priority = !priority; publish() },
    recover() { example = 'ready'; this.switchCase(pipeline.caseId) },
  }
}
