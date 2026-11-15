import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { loadArtifactRows } from "@/shared/api/assistant-artifact"
import { useTranslation } from "@/shared/i18n"
import { Button, Disclosure, ScrollArea } from "@/shared/ui"
import styles from "./research-layout.module.css"

export function ArtifactTable({ id }: { readonly id: string }) {
  const { t } = useTranslation()
  const [offset, setOffset] = useState(0)
  const query = useQuery({
    queryKey: ["artifact-rows", id, offset],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadArtifactRows(id, offset, signal),
  })
  if (query.isError) return <p role="alert">{t("assistant:error")}</p>
  if (!query.data) return <p role="status">{t("assistant:reading")}</p>
  const page = query.data
  return (
    <Disclosure title={t("assistant:data")}>
      <ScrollArea className={styles.tableScroll} aria-label={t("assistant:data")}>
        <table>
          <thead>
            <tr>
              {page.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.items.map((row, index) => (
              <tr key={String(offset + index)}>
                {page.columns.map((column) => (
                  <td key={column}>{String(row[column] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
      <p role="status">
        {t("assistant:pageRows", {
          from: page.total ? page.offset + 1 : 0,
          to: Math.min(page.offset + page.limit, page.total),
          total: page.total,
        })}
      </p>
      <Button
        disabled={offset === 0 || query.isFetching}
        onClick={() => setOffset(Math.max(0, offset - 100))}
      >
        {t("assistant:previousPage")}
      </Button>
      <Button
        disabled={offset + page.limit >= page.total || query.isFetching}
        onClick={() => setOffset(offset + 100)}
      >
        {t("assistant:nextPage")}
      </Button>
    </Disclosure>
  )
}
