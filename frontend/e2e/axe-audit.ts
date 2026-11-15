import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

const CLIPPED_INDICATOR_LABELS = 'fieldset > label[data-checked="false"]'

export interface AuditViolation {
  readonly id: string
  readonly impact: string | null | undefined
  readonly targets: readonly string[]
}

export async function auditViolations(
  page: Page,
  tags?: readonly string[],
  include?: string,
): Promise<AuditViolation[]> {
  const scoped = (builder: AxeBuilder) => (include ? builder.include(include) : builder)
  const structure = scoped(new AxeBuilder({ page })).disableRules(["color-contrast"])
  const contrast = scoped(new AxeBuilder({ page }))
    .withRules(["color-contrast"])
    .exclude(CLIPPED_INDICATOR_LABELS)
  const structural = await (tags ? structure.withTags([...tags]) : structure).analyze()
  const contrasting = await contrast.analyze()
  return [structural, contrasting]
    .flatMap((result) => result.violations)
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
    }))
}
