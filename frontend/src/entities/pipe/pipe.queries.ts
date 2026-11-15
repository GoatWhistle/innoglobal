import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api, unwrap } from "@/shared/api"

export const pipeKeys = {
  all: ["pipes"] as const,
  list: () => [...pipeKeys.all, "list"] as const,
  profile: (pipeId: number) => [...pipeKeys.all, pipeId, "profile"] as const,
  priorities: (pipeId: number) => [...pipeKeys.all, pipeId, "priorities"] as const,
  segment: (pipeId: number, segmentId: number) =>
    [...pipeKeys.all, pipeId, "segment", segmentId] as const,
}

export function usePipes() {
  return useQuery({
    queryKey: pipeKeys.list(),
    queryFn: ({ signal }) => unwrap(api.GET("/api/v1/pipes", { signal })),
  })
}

export function useProfile(pipeId: number | null) {
  return useQuery({
    queryKey: pipeKeys.profile(pipeId ?? -1),
    enabled: pipeId !== null,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/pipes/{pipe_id}/profile", {
          params: { path: { pipe_id: pipeId ?? 0 } },
          signal,
        }),
      ),
  })
}

export function usePriorities(pipeId: number) {
  return useQuery({
    queryKey: pipeKeys.priorities(pipeId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/pipes/{pipe_id}/priorities", {
          params: { path: { pipe_id: pipeId } },
          signal,
        }),
      ),
  })
}

export function useSegment(pipeId: number, segmentId: number | null) {
  return useQuery({
    queryKey: pipeKeys.segment(pipeId, segmentId ?? -1),
    enabled: segmentId !== null,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/api/v1/pipes/{pipe_id}/segments/{segment_id}", {
          params: { path: { pipe_id: pipeId, segment_id: segmentId ?? 0 } },
          signal,
        }),
      ),
  })
}
