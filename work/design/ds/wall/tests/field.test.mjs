import assert from 'node:assert/strict'
import test from 'node:test'
import { makeExample } from '../../scanner/data.js'
import { clock, fieldData, HOURS, lossHour, picket, relative, ring, thinnest, wallAt } from '../field.js'
import { createWallStore } from '../state.js'

test('ring minimum equals the segment forecast at the loss hour', () => {
  for (const caseId of [1, 2]) {
    const p = makeExample(caseId)
    for (const s of [p.segments[0], p.segments[630], p.segments.at(-1)]) {
      const h = lossHour(p, s)
      assert.ok(Math.abs(wallAt(p, s, h) - s.predictedMm) < 1e-9)
      assert.ok(Math.min(...ring(p, s, 480)) >= s.predictedMm - 1e-9)
      assert.ok(Math.max(...ring(p, s, 96)) <= p.nominalMm)
    }
  }
})

test('field texture is relative to the thinnest segment of the pipe', () => {
  const p = makeExample(2), field = fieldData(p)
  assert.equal(field.width, 838); assert.equal(field.height, HOURS)
  assert.equal(relative(p, p.nominalMm), 0); assert.equal(relative(p, thinnest(p)), 1)
  assert.equal(Math.max(...field.data.filter((_, i) => i % 4 === 0)), 255)
})

test('labels: pickets and clock positions', () => {
  assert.equal(picket(6300), 'ПК 63+00'); assert.equal(picket(8375), 'ПК 83+75'); assert.equal(picket(0), 'ПК 0+00')
  assert.equal(clock(0), '12:00'); assert.equal(clock(6.9), '7:00'); assert.equal(clock(3.4), '3:30'); assert.equal(clock(11.9), '12:00')
})

test('store keeps the selected segment across scales and resets the picked hour', () => {
  const store = createWallStore(1, 'ready', 'unroll')
  assert.equal(store.snapshot().mode, 'unroll')
  store.at(6305, 2.5); assert.equal(store.snapshot().selected, 630); assert.equal(store.snapshot().hour, 2.5); assert.equal(store.snapshot().hourPicked, true)
  store.setMode('section'); assert.equal(store.snapshot().selected, 630)
  store.setMode('bogus'); assert.equal(store.snapshot().mode, 'section')
  store.select(631); assert.equal(store.snapshot().hourPicked, false)
  store.switchCase(2); assert.equal(store.snapshot().selected, 0); assert.equal(store.snapshot().mode, 'section')
  store.at(8375); assert.equal(store.snapshot().selected, 837)
  const empty = createWallStore(1, 'empty'); empty.select(3); assert.equal(empty.snapshot().segment, null)
})
