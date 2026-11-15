# Routes
/ Inspection; /data data quality; /model model validation. RootLayout shared.
## frontend/src/app/router.tsx

```tsx
import { createBrowserRouter } from "react-router"
import { lazyPage } from "./lazy-page"
import { RootError } from "./root-error/root-error"
import { RootLayout } from "./root-layout/root-layout"
import { RouteFallback } from "./route-fallback/route-fallback"

const workspace = lazyPage(
  () => import("@/pages/design-variants/design-variants-page"),
  "DesignVariantsPage",
)

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootError />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { index: true, lazy: workspace },
      { path: "design/variants/inspection", lazy: workspace },
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

```