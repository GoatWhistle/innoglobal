import assert from 'node:assert/strict'
import test from 'node:test'
import { makeExample, makePipeline, priorityIds, segmentAt } from '../data.js'
import { createStore } from '../state.js'

test('segments cover both pipes without gaps, including a partial tail',()=>{
  for(const id of [1,2]){
    const p=makePipeline(id)
    assert.equal(p.segments.length,Math.ceil(p.lengthM/10))
    assert.equal(p.segments.at(-1).endM,p.lengthM)
    p.segments.forEach((s,i)=>{assert.equal(s.startM,i*10);assert.ok(s.endM>s.startM);assert.ok(s.predictedMm>0&&s.predictedMm<=s.baselineMm);assert.ok(s.p10Mm<s.predictedMm&&s.p90Mm>s.predictedMm)})
  }
  assert.equal(makePipeline(2).segments.at(-1).endM-makePipeline(2).segments.at(-1).startM,5)
})
test('coordinate mapping includes exact boundaries and clamps safely',()=>{
  const p=makePipeline(2)
  for(const [m,id] of [[-1,0],[0,0],[9.999,0],[10,1],[8370,837],[8375,837],[10000,837],[NaN,0]])assert.equal(segmentAt(p,m),id)
})
test('priority has exactly the top ten percent, with deterministic ties',()=>{
  const p=makePipeline(),ids=priorityIds(p)
  assert.equal(ids.size,120)
  const ranked=[...ids].map((id)=>p.segments[id].predictedMm)
  assert.ok(ranked.every((v,i)=>i===0||v>=ranked[i-1]))
  const tied={segments:Array.from({length:20},(_,id)=>({id,predictedMm:1}))}
  assert.deepEqual([...priorityIds(tied)],[0,1])
})
test('case two starts from nominal thickness without fabricated VTD',()=>{
  const p=makePipeline(2)
  assert.ok(p.segments.every((s)=>s.observedMm===null&&s.baselineMm===p.nominalMm))
})
test('missing data stays absent rather than becoming zero',()=>{
  const s=makeExample(1,'missing').segments[0]
  assert.equal(s.baselineMm,null);assert.equal(s.p10Mm,null);assert.equal(s.factors,null)
  assert.ok(s.predictedMm>0)
})
test('selection, case changes and recovery publish one consistent snapshot',()=>{
  const store=createStore(),events=[]
  store.subscribe((s)=>events.push(s))
  store.at(10);assert.equal(store.snapshot().segment.id,1)
  store.togglePriority();store.switchCase(2)
  assert.equal(store.snapshot().segment.id,0);assert.equal(store.snapshot().priority,true)
  store.select(Infinity);assert.equal(store.snapshot().selected,0)
  store.select(9999);assert.equal(store.snapshot().selected,837)
  const empty=createStore(1,'empty');assert.equal(empty.snapshot().segment,null)
  empty.select(1);assert.equal(empty.snapshot().segment,null)
  empty.recover();assert.equal(empty.snapshot().status,'ready');assert.equal(empty.snapshot().segment.id,0)
  assert.equal(events.length,5)
})
test('demo generation is reproducible',()=>assert.deepEqual(makePipeline(1),makePipeline(1)))
