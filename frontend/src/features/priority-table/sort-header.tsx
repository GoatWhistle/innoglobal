import { useTranslation } from "@/shared/i18n"
import { Button } from "@/shared/ui"
import type { SortKey, SortOrder } from "./priority-sort"

export interface SortHeaderProps {
  readonly label: string
  readonly sortKey: SortKey
  readonly active: SortKey
  readonly order: SortOrder
  readonly onSort: (key: SortKey) => void
  readonly numeric?: boolean
}

export function SortHeader({
  label,
  sortKey,
  active,
  order,
  onSort,
  numeric = false,
}: SortHeaderProps) {
  const { t } = useTranslation()
  const isActive = active === sortKey
  const icon = isActive ? (order === "asc" ? "sort-asc" : "sort-desc") : "sort"
  return (
    <th
      scope="col"
      data-numeric={numeric ? "" : undefined}
      aria-sort={isActive ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <Button variant="quiet" size="compact" icon={icon} onClick={() => onSort(sortKey)}>
        {label}
        <span className="visually-hidden">{t("priorities:sortHint")}</span>
      </Button>
    </th>
  )
}
