import { type DashboardStore, validStore } from "./model"

const KEY = "duppel.dashboards.v1"
export const emptyStore = (): DashboardStore => ({ version: 1, boards: [], definitions: [] })
export const dashboardRepository = {
  read(): DashboardStore {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return emptyStore()
    const parsed: unknown = JSON.parse(raw)
    if (!validStore(parsed)) throw new Error("invalid_dashboard_store")
    return parsed
  },
  write(data: DashboardStore) {
    localStorage.setItem(KEY, JSON.stringify(data))
  },
}
