import type { MessageKey } from "@/shared/i18n"

const MODEL_KEY: Readonly<Record<string, MessageKey>> = {
  b1_nominal_minus_rate: "model:name.b1_nominal_minus_rate",
  b2_prev_smoothed: "model:name.b2_prev_smoothed",
  lgbm: "model:name.lgbm",
  xgb: "model:name.xgb",
  aft: "model:name.aft",
  ensemble: "model:name.ensemble",
  ens_blend: "model:name.ens_blend",
  dens_quant: "model:name.dens_quant",
  dens_quant_cal: "model:name.dens_quant_cal",
  ens_prior: "model:name.ens_prior",
  ens_prior_cal: "model:name.ens_prior_cal",
}

export function modelKey(name: string): MessageKey | null {
  return MODEL_KEY[name] ?? null
}
