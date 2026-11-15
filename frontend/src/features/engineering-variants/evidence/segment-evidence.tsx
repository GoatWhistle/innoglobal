import { type PipeSummary, useSegment } from "@/entities/pipe"
import { featureKey } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonLink, Disclosure, NoValue, QueryView, Skeleton } from "@/shared/ui"
import styles from "./segment-evidence.module.css"

export interface SegmentEvidenceProps {
  readonly pipe: PipeSummary
  readonly segment: number
}

export function SegmentEvidence({ pipe, segment }: SegmentEvidenceProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const query = useSegment(pipe.pipe_id, segment)
  return (
    <div className={styles.evidence}>
      <Disclosure title={t("variants:segmentEvidence")}>
        <QueryView
          query={query}
          label={t("variants:loadingEvidence")}
          skeleton={<Skeleton lines={6} />}
        >
          {(data) => (
            <>
              <p className={styles.note}>{t("variants:evidenceHint")}</p>
              {data.features.length ? (
                <dl
                  className={styles.features}
                  data-testid="segment-evidence-values"
                  data-segment={data.segment.segment_id}
                >
                  {data.features.map((feature) => {
                    const key = featureKey(feature.name)
                    return (
                      <div key={feature.name}>
                        <dt>{key ? t(key) : feature.name}</dt>
                        <dd>
                          <strong>
                            {feature.value === null ? <NoValue /> : format.number(feature.value, 2)}
                          </strong>
                          <span>
                            {t("variants:pipeMedian")}{" "}
                            {feature.pipe_median === null ? (
                              <NoValue />
                            ) : (
                              format.number(feature.pipe_median, 2)
                            )}
                          </span>
                          <span>
                            {t("variants:globalImportance", {
                              value: format.percent(feature.share, 1),
                            })}
                          </span>
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              ) : (
                <p className={styles.note}>{t("variants:noFeatures")}</p>
              )}
            </>
          )}
        </QueryView>
      </Disclosure>
      <ButtonLink
        className={styles.validation}
        variant="quiet"
        icon="chart"
        to={`/model#${pipe.case_id}`}
      >
        {t("variants:validationLink")}
      </ButtonLink>
    </div>
  )
}
