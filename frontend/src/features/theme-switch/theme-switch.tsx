import { useTranslation } from "@/shared/i18n"
import { withViewTransition } from "@/shared/motion"
import { THEMES, type Theme, useTheme } from "@/shared/theme"
import { type IconName, Segmented, type SegmentedOption } from "@/shared/ui"
import { markRevealOrigin, revealOrigin } from "./theme-reveal"

const THEME_ICON: Readonly<Record<Theme, IconName>> = {
  light: "sun",
  dark: "moon",
}

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const options: SegmentedOption<Theme>[] = THEMES.map((value) => ({
    value,
    label: t(`common:theme.${value}`),
    icon: THEME_ICON[value],
  }))
  const change = (next: Theme) => {
    const focused = document.activeElement
    markRevealOrigin(revealOrigin(focused instanceof HTMLElement ? focused.closest("label") : null))
    void withViewTransition("theme", () => setTheme(next))
  }
  return (
    <Segmented
      label={t("common:theme.legend")}
      options={options}
      value={theme}
      display="icon"
      onChange={change}
    />
  )
}
