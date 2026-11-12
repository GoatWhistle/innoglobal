export function recording(button, status, canvas) {
  button.addEventListener("click", () => {
    if (!canvas.captureStream || !window.MediaRecorder) {
      status.textContent = "Запись недоступна в этом браузере."
      return
    }
    if (canvas.closest("[data-renderer]")?.dataset.renderer !== "ready") {
      status.textContent = "Для записи нужна работающая 3D-сцена."
      return
    }
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm"
    const stream = canvas.captureStream(30)
    let recorder
    try { recorder = new MediaRecorder(stream, { mimeType }) }
    catch { stream.getTracks().forEach((t) => t.stop()); status.textContent = "Браузер не смог начать запись."; return }
    const chunks = []
    button.disabled = true
    status.textContent = "Записываем 8 секунд движения сцены…"
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: mimeType }))
      const link = document.createElement("a")
      link.href = url; link.download = "pipetwin-pipeline.webm"; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      stream.getTracks().forEach((track) => track.stop())
      button.disabled = false
      status.textContent = "Запись сохранена. Это визуальная иллюстрация, время детекции берётся из расчёта."
    }
    recorder.start()
    setTimeout(() => { if (recorder.state !== "inactive") recorder.stop() }, 8000)
  })
}
