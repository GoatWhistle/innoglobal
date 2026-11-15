import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  catalogDefinition,
  createDashboard,
  createItem,
  useDashboards,
  validStore,
} from "@/entities/dashboard"
import { dashboardRepository } from "@/entities/dashboard/repository"

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})
const definition = catalogDefinition("forecast", "Forecast")
const makeBoard = () => createDashboard(10, "Overview", [createItem(definition)])
describe("dashboard persistence", () => {
  it("restores definitions and layout without persisting measurements", () => {
    const first = renderHook(useDashboards),
      board = makeBoard()
    act(() => first.result.current.save(board, [definition]))
    first.unmount()
    const second = renderHook(useDashboards)
    expect(second.result.current.boards).toEqual([board])
    expect(second.result.current.definitions).toEqual([definition])
    expect(localStorage.getItem("duppel.dashboards.v1")).not.toContain("forecast_mm")
  })
  it("retains definitions when a placement is removed and restores removal with undo", () => {
    const hook = renderHook(useDashboards),
      board = makeBoard()
    act(() => hook.result.current.save(board, [definition]))
    act(() => hook.result.current.save({ ...board, items: [] }))
    expect(hook.result.current.definitions).toEqual([definition])
    act(() => hook.result.current.undo())
    expect(hook.result.current.boards[0]?.items).toEqual(board.items)
  })
  it("does not overwrite incompatible storage until explicit reset", () => {
    localStorage.setItem("duppel.dashboards.v1", '{"version":99}')
    const hook = renderHook(useDashboards)
    act(() => hook.result.current.save(makeBoard(), [definition]))
    expect(hook.result.current.blocked).toBe(true)
    expect(localStorage.getItem("duppel.dashboards.v1")).toBe('{"version":99}')
    act(() => hook.result.current.reset())
    expect(hook.result.current.error).toBe(false)
    expect(dashboardRepository.read().boards).toHaveLength(1)
  })
  it("keeps changes in memory when storage fails, then retries", () => {
    const hook = renderHook(useDashboards),
      board = makeBoard()
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })
    act(() => hook.result.current.save(board, [definition]))
    expect(hook.result.current.error).toBe(true)
    expect(hook.result.current.boards).toEqual([board])
    write.mockRestore()
    act(() => hook.result.current.retry())
    expect(hook.result.current.error).toBe(false)
    expect(dashboardRepository.read().boards).toEqual([board])
  })
  it("rejects dangling references, invalid spans, duplicate ids and malformed contexts", () => {
    const board = makeBoard()
    const store = { version: 1, boards: [board], definitions: [definition] }
    expect(validStore(store)).toBe(true)
    expect(validStore({ ...store, definitions: [] })).toBe(false)
    expect(validStore({ ...store, boards: [board, board] })).toBe(false)
    expect(
      validStore({ ...store, boards: [{ ...board, items: [{ ...board.items[0], span: 3 }] }] }),
    ).toBe(false)
    expect(validStore({ ...store, boards: [{ ...board, context: { from: 4, to: 3 } }] })).toBe(
      false,
    )
  })
})
