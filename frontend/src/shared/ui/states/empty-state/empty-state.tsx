import type { ReactNode } from "react"
import type { IconName } from "../../primitives/icon/icon"
import { StatePanel } from "../state-panel/state-panel"

export interface EmptyStateProps {
  readonly title: string
  readonly description?: string | undefined
  readonly icon: IconName
  readonly action?: ReactNode
  readonly className?: string | undefined
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <StatePanel
      icon={icon}
      title={title}
      description={description}
      actions={action}
      className={className}
    />
  )
}
