import type { MessageKey } from "@/shared/i18n"

const FEATURE_KEY: Readonly<Record<string, MessageKey>> = {
  dist_m: "model:feature.dist_m",
  dist_frac: "model:feature.dist_frac",
  z: "model:feature.z",
  z_rel: "model:feature.z_rel",
  slope: "model:feature.slope",
  lowness_250m: "model:feature.lowness_250m",
  lowness_1km: "model:feature.lowness_1km",
  rise_500m: "model:feature.rise_500m",
  climb_pos: "model:feature.climb_pos",
  climb_rise: "model:feature.climb_rise",
  climb_len: "model:feature.climb_len",
  p_at: "model:feature.p_at",
  t_at: "model:feature.t_at",
  prev_min: "model:feature.prev_min",
  prev_min_sm5: "model:feature.prev_min_sm5",
  prev_min_sm21: "model:feature.prev_min_sm21",
  prev_ndef_sm21: "model:feature.prev_ndef_sm21",
  prev_ndef: "model:feature.prev_ndef",
  rg_v_mean: "model:feature.rg_v_mean",
  rg_share_slow: "model:feature.rg_share_slow",
  rg_watercut_mean: "model:feature.rg_watercut_mean",
  uzt_dist: "model:feature.uzt_dist",
  uzt_min_250: "model:feature.uzt_min_250",
}

export function featureKey(name: string): MessageKey | null {
  return FEATURE_KEY[name] ?? null
}
