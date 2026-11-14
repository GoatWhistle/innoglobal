import { makeExample, priorityIds, segmentAt } from './data.js'

export function createStore(caseId = 1, example = 'ready') {
  let pipeline = makeExample(caseId, example)
  let selected = Math.min(630, pipeline.segments.length - 1), priority = false
  let status = ['loading', 'error', 'empty'].includes(example) ? example : 'ready'
  let priorities = priorityIds(pipeline)
  const listeners = new Set()
  const snapshot = () => ({ pipeline, selected, segment: pipeline.segments[selected] ?? null, priority, priorities, status })
  const publish = () => listeners.forEach((fn) => fn(snapshot()))
  return {
    snapshot,
    subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn) },
    select(id) {
      if (!Number.isFinite(id) || status !== 'ready' || !pipeline.segments.length) return
      selected = Math.max(0, Math.min(pipeline.segments.length - 1, Math.trunc(id))); publish()
    },
    at(meters) { this.select(segmentAt(pipeline, meters)) },
    switchCase(id) {
      pipeline = makeExample(id, example === 'missing' ? 'missing' : 'ready')
      priorities = priorityIds(pipeline); selected = 0; status = 'ready'; publish()
    },
    togglePriority() { priority = !priority; publish() },
    recover() { example = 'ready'; this.switchCase(pipeline.caseId) },
  }
}
