import "@fontsource-variable/onest"
import "@fontsource-variable/raleway/wght-italic.css"
import "./shared/styles/global.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app/app"

const root = document.getElementById("root")
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
