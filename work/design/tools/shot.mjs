import { createRequire } from "node:module"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(resolve(here, "../../../frontend/package.json"))
const { chromium } = require("playwright")

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []))

const url = args[0]
const out = resolve(args[1])
const width = Number(option("width", 1440))
const height = Number(option("height", 900))
const theme = option("theme", "dark")
const wait = Number(option("wait", 2500))
const full = args.includes("--full")
const selector = option("selector", null)

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
const errors = []
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 300)}`))
await page.addInitScript((t) => {
  try {
    localStorage.setItem("ds-theme", t)
  } catch {}
  if (document.documentElement) document.documentElement.dataset.theme = t
}, theme)
await page.goto(url, { waitUntil: "load" })
await page.waitForTimeout(wait)
for (const step of all("click")) {
  if (/^\d+,\d+$/.test(step)) {
    const [x, y] = step.split(",").map(Number)
    await page.mouse.click(x, y)
  } else await page.click(step)
  await page.waitForTimeout(Number(option("after", 1500)))
}
for (const step of all("hover")) {
  await page.hover(step)
  await page.waitForTimeout(500)
}
for (const key of all("press")) {
  await page.keyboard.press(key)
  await page.waitForTimeout(300)
}
mkdirSync(dirname(out), { recursive: true })
if (selector) await page.locator(selector).first().screenshot({ path: out, timeout: 30000 })
else await page.screenshot({ path: out, fullPage: full, timeout: 30000 })
await browser.close()
console.log(errors.length ? errors.join("\n") : "ok")
