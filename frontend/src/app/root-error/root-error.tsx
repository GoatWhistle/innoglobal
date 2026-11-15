import { useEffect } from "react"
import { useRouteError } from "react-router"
import { useTranslation } from "@/shared/i18n"
import { BrandMark, Button, Disclosure, FailureScene, ScrollArea } from "@/shared/ui"
import styles from "./root-error.module.css"

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

export function RootError() {
  const { t } = useTranslation()
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <a href="/" className={styles.brand} aria-label={t("common:nav.home")}>
          <BrandMark variant="lockup" state="alarm" />
        </a>
      </header>
      <main className={styles.main}>
        <FailureScene
          leaking
          eyebrow={t("errors:boundary.eyebrow")}
          title={t("errors:boundary.title")}
          callout={t("errors:boundary.callout")}
          actions={
            <>
              <Button icon="refresh" onClick={() => window.location.reload()}>
                {t("errors:boundary.reload")}
              </Button>
              <Button variant="secondary" onClick={() => window.location.assign("/")}>
                {t("errors:boundary.home")}
              </Button>
            </>
          }
          details={
            <Disclosure title={t("errors:boundary.details")}>
              <ScrollArea className={styles.trace}>
                <pre>{describe(error)}</pre>
              </ScrollArea>
            </Disclosure>
          }
        >
          <p>{t("errors:boundary.description")}</p>
          <p>{t("errors:boundary.hint")}</p>
        </FailureScene>
      </main>
    </div>
  )
}
