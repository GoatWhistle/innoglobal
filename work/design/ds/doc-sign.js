for (const list of document.querySelectorAll("[data-picks]")) {
  list.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return
    for (const other of list.querySelectorAll("button")) {
      other.setAttribute("aria-pressed", String(other === button))
      other.classList.toggle("marked", other === button)
    }
  })
}
