import { createSession, preview } from "./session.js"

let session = createSession()
let anchor = performance.now()
let paused = false
let running = false
const queue = []

function pump() {
  if (running) return
  running = true
  function chunk() {
    const target = performance.now()
    if (!paused && target - anchor > 1) {
      const ms = Math.min(target - anchor, 500)
      session.advance(ms / 1000)
      anchor += ms
      if (target - anchor > 1) return setTimeout(chunk, 0)
    }
    for (const cmd of queue.splice(0)) {
      if (cmd.type === "init") {
        session = preview(cmd.state)
        paused = ["watch", "leak", "ack", "search"].includes(cmd.state)
      }
      if (cmd.type === "reset") { session = createSession(); paused = false }
      if (cmd.type === "insert") session.insert(cmd.x)
      if (cmd.type === "accept") session.accept()
      if (cmd.type === "play") paused = false
    }
    anchor = target
    postMessage({ ...session.snapshot(), paused })
    running = false
  }
  chunk()
}

onmessage = ({ data }) => { queue.push(data); pump() }
setInterval(pump, 100)
