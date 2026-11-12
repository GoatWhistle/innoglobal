import { useTranslation } from "@/shared/i18n"
import { THEMES, type Theme, useTheme } from "@/shared/theme"
import { type IconName, Segmented, type SegmentedOption } from "@/shared/ui"

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
  return (
    <Segmented
      label={t("common:theme.legend")}
      options={options}
      value={theme}
      display="icon"
      onChange={setTheme}
    />
  )
}
