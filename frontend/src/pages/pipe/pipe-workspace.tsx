import { useState } from "react"
import { type PipeSummary, type Profile, useSegment } from "@/entities/pipe"
import { useNetwork } from "@/entities/reference"
import { ProfileChart, ProfileLegend } from "@/features/profile-chart"
import { type RouteFocus, RouteMap } from "@/features/route-map"
import { SegmentInspector } from "@/features/segment-inspector"
import { SegmentStrip } from "@/features/segment-strip"
import { WallSection } from "@/features/wall-section"
import { useTranslation } from "@/shared/i18n"
import { Banner, Button, Card, QueryView, Segmented, Skeleton } from "@/shared/ui"
import styles from "./pipe-page.module.css"
import { PipePassport } from "./pipe-passport"
import { useWorkspaceState } from "./use-workspace-state"

export interface PipeWorkspaceProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
}

type SceneView = "route" | "network" | "section"

export function PipeWorkspace({ pipe, profile }: PipeWorkspaceProps) {
  const { t } = useTranslation()
  const state = useWorkspaceState(profile.rows, pipe.thinnest_segment_id)
  const [scene, setScene] = useState<SceneView>("route")
  const network = useNetwork()
  const detail = useSegment(pipe.pipe_id, state.segment)
  const row = profile.rows[state.segment]
  const reject = pipe.passport.reject_wall_mm
  const focus: RouteFocus = scene === "network" ? "network" : "pipe"
  return (
    <div className={styles.workspace}>
      {state.invalid ? (
        <Banner tone="warning" title={t("pipe:invalidSegment.title")}>
          {t("pipe:invalidSegment.body", { last: profile.rows.length - 1 })}
        </Banner>
      ) : null}
      <PipePassport pipe={pipe} />
      <div className={styles.grid}>
        <Card
          className={styles.scene}
          title={t(`pipe:scene.${scene}`)}
          actions={
            <Segmented<SceneView>
              label={t("pipe:scene.label")}
              value={scene}
              onChange={setScene}
              options={[
                { value: "route", label: t("pipe:scene.route"), icon: "map-pin" },
                { value: "network", label: t("pipe:scene.network"), icon: "layers" },
                { value: "section", label: t("pipe:scene.section"), icon: "cube" },
              ]}
            />
          }
        >
          {scene === "section" ? (
            row === undefined ? null : (
              <WallSection
                forecast={row.forecast_mm}
                p10={row.p10_mm}
                nominal={pipe.passport.nominal_wall_mm}
                diameter={pipe.passport.diameter_mm}
              />
            )
          ) : (
            <QueryView
              query={network}
              label={t("pipe:loadingMap")}
              skeleton={<Skeleton shape="block" />}
            >
              {(data) => (
                <>
                  <RouteMap
                    lines={data.lines}
                    pipeId={pipe.pipe_id}
                    rows={profile.rows}
                    nominal={pipe.passport.nominal_wall_mm}
                    thinnest={pipe.thinnest_mm}
                    selected={state.segment}
                    focus={focus}
                    onSelect={state.select}
                  />
                  <p className={styles.caption}>{t("route:caption")}</p>
                </>
              )}
            </QueryView>
          )}
        </Card>
        <section className={styles.inspector} aria-label={t("inspector:region")}>
          <QueryView
            query={detail}
            label={t("inspector:loading")}
            skeleton={<Skeleton lines={8} />}
          >
            {(data) => (
              <SegmentInspector
                pipe={pipe}
                detail={data}
                stale={detail.isPlaceholderData}
                onSelect={state.select}
              />
            )}
          </QueryView>
        </section>
      </div>
      <Card
        title={t("profile:title")}
        description={t("profile:description")}
        actions={
          <Button
            variant="secondary"
            size="compact"
            icon="expand"
            disabled={!state.isZoomed}
            onClick={state.reset}
          >
            {t("profile:reset")}
          </Button>
        }
      >
        <ProfileLegend
          runDates={profile.run_dates}
          targetDate={pipe.target_date}
          hasReject={reject !== null}
        />
        <ProfileChart
          rows={profile.rows}
          runDates={profile.run_dates}
          nominal={profile.nominal_wall_mm}
          reject={reject}
          selected={state.segment}
          range={state.range}
          onSelect={state.select}
          onRange={state.zoom}
        />
        <SegmentStrip
          rows={profile.rows}
          nominal={profile.nominal_wall_mm}
          thinnest={pipe.thinnest_mm}
          selected={state.segment}
          range={state.range}
          onSelect={state.select}
          onRange={state.zoom}
        />
        <p className={styles.caption}>{t("profile:hint")}</p>
      </Card>
    </div>
  )
}
