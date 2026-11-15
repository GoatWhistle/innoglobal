import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "../../../i18n"
import { ToastCard } from "./toast-card"
import styles from "./toast-provider.module.css"
import { addToast, leaveToast, removeToast, type ToastEntry, type ToastInput } from "./toast-store"

export interface ToastApi {
  readonly show: (toast: ToastInput) => number
  readonly dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export interface ToastProviderProps {
  readonly children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<readonly ToastEntry[]>([])
  const counter = useRef(0)

  const show = useCallback((toast: ToastInput) => {
    counter.current += 1
    const id = counter.current
    setEntries((current) => addToast(current, toast, id))
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setEntries((current) => leaveToast(current, id))
  }, [])

  const remove = useCallback((id: number) => {
    setEntries((current) => removeToast(current, id))
  }, [])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext value={api}>
      {children}
      <section className={styles.region} aria-label={t("common:toast.region")} aria-live="polite">
        {entries.map((entry) => (
          <ToastCard key={entry.id} entry={entry} onDismiss={dismiss} onRemoved={remove} />
        ))}
      </section>
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (api === null) throw new Error("useToast must be used within ToastProvider")
  return api
}
