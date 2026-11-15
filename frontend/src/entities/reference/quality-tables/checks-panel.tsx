import { useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { EmptyState, Segmented } from "@/shared/ui"
import type { Quality } from "../reference.types"
import { ChecksTable } from "./checks-table"
import { type CheckStatus, checkStatus } from "./quality-model"
import styles from "./quality-tables.module.css"

type ChecksFilter = "attention" | "info" | "passed" | "all"

const MATCH: Readonly<Record<ChecksFilter, readonly CheckStatus[]>> = {
  attention: ["failed", "warning"],
  info: ["info"],
  passed: ["passed"],
  all: ["failed", "warning", "info", "passed"],
}

export function ChecksPanel({ checks }: { readonly checks: Quality["checks"] }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<ChecksFilter>("attention")
  const count = (value: ChecksFilter) =>
    checks.filter((check) => MATCH[value].includes(checkStatus(check))).length
  const visible = checks.filter((check) => MATCH[filter].includes(checkStatus(check)))
  return (
    <div className={styles.panel}>
      <Segmented
        label={t("quality:checks.filter")}
        value={filter}
        onChange={setFilter}
        options={[
          {
            value: "attention",
            label: t("quality:checks.attention", { count: count("attention") }),
          },
          { value: "info", label: t("quality:checks.infoTab", { count: count("info") }) },
          { value: "passed", label: t("quality:checks.passedTab", { count: count("passed") }) },
          { value: "all", label: t("quality:checks.all", { count: checks.length }) },
        ]}
      />
      {visible.length === 0 ? (
        <EmptyState icon="info" title={t("quality:checks.empty")} />
      ) : (
        <ChecksTable checks={visible} />
      )}
    </div>
  )
}
