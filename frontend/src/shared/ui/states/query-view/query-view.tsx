import { clsx } from "clsx"
import type { ReactNode } from "react"
import { useErrorText, useTranslation } from "../../../i18n"
import { useLoadingIndicator } from "../../../motion"
import { Button } from "../../primitives/button/button"
import { Banner } from "../banner/banner"
import { ErrorState } from "../error-state/error-state"
import styles from "./query-view.module.css"

export interface QueryLike<T> {
  readonly data: T | undefined
  readonly error: unknown
  readonly isError: boolean
  readonly isFetching: boolean
  readonly refetch: () => unknown
}

export interface QueryViewProps<T> {
  readonly query: QueryLike<T>
  readonly label: string
  readonly skeleton: ReactNode
  readonly children: (data: T) => ReactNode
  readonly className?: string | undefined
}

export function QueryView<T>({ query, label, skeleton, children, className }: QueryViewProps<T>) {
  const errorText = useErrorText()
  const { t } = useTranslation()
  const hasData = query.data !== undefined
  const indicator = useLoadingIndicator({ pending: query.isFetching && !query.isError, hasData })
  if (query.isError && !hasData) {
    return (
      <ErrorState
        className={className}
        title={errorText(query.error)}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }
  if (query.data === undefined) {
    return (
      <div className={clsx(styles.loading, className)} role="status" aria-label={label}>
        {indicator === "skeleton" ? skeleton : null}
      </div>
    )
  }
  return (
    <div
      className={clsx(styles.ready, indicator === "stale" && styles.stale, className)}
      aria-busy={indicator === "stale" || undefined}
    >
      {query.isError ? (
        <Banner
          tone="warning"
          title={t("common:state.stale")}
          actions={
            <Button
              variant="secondary"
              size="compact"
              icon="refresh"
              onClick={() => {
                void query.refetch()
              }}
            >
              {t("common:action.retry")}
            </Button>
          }
        />
      ) : null}
      {children(query.data)}
    </div>
  )
}
