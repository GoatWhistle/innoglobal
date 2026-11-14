import { useQuery } from "@tanstack/react-query"
import { api, unwrap } from "@/shared/api"
import { parseNetwork } from "./network-response"

export const referenceKeys = {
  network: ["network"] as const,
  quality: ["data-quality"] as const,
  model: ["model-validation"] as const,
}

export function useNetwork() {
  return useQuery({
    queryKey: referenceKeys.network,
    queryFn: ({ signal }) => unwrap(api.GET("/api/v1/network", { signal })).then(parseNetwork),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useQuality() {
  return useQuery({
    queryKey: referenceKeys.quality,
    queryFn: ({ signal }) => unwrap(api.GET("/api/v1/data-quality", { signal })),
  })
}

export function useModelValidation() {
  return useQuery({
    queryKey: referenceKeys.model,
    queryFn: ({ signal }) => unwrap(api.GET("/api/v1/model/validation", { signal })),
  })
}
