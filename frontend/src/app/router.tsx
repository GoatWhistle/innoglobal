import { createBrowserRouter } from "react-router"
import { lazyPage } from "./lazy-page"
import { RootError } from "./root-error/root-error"
import { RootLayout } from "./root-layout/root-layout"
import { RouteFallback } from "./route-fallback/route-fallback"

const redirect = lazyPage(
  () => import("@/pages/pipe-redirect/pipe-redirect-page"),
  "PipeRedirectPage",
)

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      {
        index: true,
        lazy: lazyPage(() => import("@/pages/overview/overview-page"), "OverviewPage"),
      },
      { path: "pipes", lazy: redirect },
      { path: "priorities", lazy: redirect },
      { path: "pipes/:pipeId", lazy: lazyPage(() => import("@/pages/pipe/pipe-page"), "PipePage") },
      {
        path: "pipes/:pipeId/priorities",
        lazy: lazyPage(() => import("@/pages/priorities/priorities-page"), "PrioritiesPage"),
      },
      {
        path: "data",
        lazy: lazyPage(() => import("@/pages/data-quality/data-quality-page"), "DataQualityPage"),
      },
      { path: "model", lazy: lazyPage(() => import("@/pages/model/model-page"), "ModelPage") },
      {
        path: "*",
        lazy: lazyPage(() => import("@/pages/not-found/not-found-page"), "NotFoundPage"),
      },
    ],
  },
])
