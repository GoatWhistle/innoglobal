import { useState } from "react"
import type { Dashboard, DashboardStore, WidgetDefinition } from "./model"
import { dashboardRepository, emptyStore } from "./repository"

function read() {
  try {
    return { data: dashboardRepository.read(), error: false }
  } catch {
    return { data: emptyStore(), error: true }
  }
}
export function useDashboards() {
  const [initial] = useState(read)
  const [data, setData] = useState(initial.data)
  const [error, setError] = useState(initial.error)
  const [blocked, setBlocked] = useState(initial.error)
  const [previous, setPrevious] = useState<DashboardStore | null>(null)
  const persist = (next: DashboardStore, force = false) => {
    if (blocked && !force) return
    try {
      dashboardRepository.write(next)
      setError(false)
      setBlocked(false)
    } catch {
      setError(true)
    }
  }
  const change = (next: DashboardStore, remember = true) => {
    if (remember) setPrevious(data)
    setData(next)
    persist(next)
  }
  const save = (board: Dashboard, definitions: WidgetDefinition[] = [], remember = true) => {
    const merged = new Map([...data.definitions, ...definitions].map((d) => [d.id, d]))
    change(
      {
        ...data,
        definitions: [...merged.values()],
        boards: data.boards.some((b) => b.id === board.id)
          ? data.boards.map((b) => (b.id === board.id ? board : b))
          : [...data.boards, board],
      },
      remember,
    )
  }
  return {
    ...data,
    error,
    blocked,
    save,
    remove: (id: string) => change({ ...data, boards: data.boards.filter((b) => b.id !== id) }),
    removeDefinition: (id: string) =>
      change({
        ...data,
        definitions: data.definitions.filter((d) => d.id !== id),
        boards: data.boards.map((b) => ({
          ...b,
          items: b.items.filter((i) => i.definitionId !== id),
        })),
      }),
    retry: () => persist(data),
    reset: () => persist(data, true),
    canUndo: previous !== null,
    undo: () => {
      if (previous) {
        setData(previous)
        persist(previous)
        setPrevious(null)
      }
    },
  }
}
