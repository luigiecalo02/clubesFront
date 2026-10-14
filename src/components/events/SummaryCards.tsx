import type { CSSProperties, ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import type { AdminIconName } from '../../admin/menu'
import '../../theme/event-summary.css'

export type SummaryTone = 'gold' | 'ok' | 'info' | 'danger'

export function summaryPercent(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

export function SummaryIcon({ name, tone }: { name: AdminIconName; tone: SummaryTone }) {
  return (
    <span className={`event-summary__icon is-${tone}`} aria-hidden="true">
      <AdminIcon name={name} />
    </span>
  )
}

export function ProgressBar({ value, tone = 'ok' }: { value: number; tone?: SummaryTone }) {
  return (
    <span className={`event-summary__bar is-${tone}`} aria-hidden="true">
      <span style={{ width: `${value}%` }} />
    </span>
  )
}

type SummaryKpiProps = {
  icon: AdminIconName
  tone: SummaryTone
  label: string
  value: ReactNode
  className?: string
  children?: ReactNode
}

export function SummaryKpi({ icon, tone, label, value, className, children }: SummaryKpiProps) {
  return (
    <article className={['event-summary__kpi', className].filter(Boolean).join(' ')}>
      <SummaryIcon name={icon} tone={tone} />
      <p>
        <span>{label}</span>
        <strong>{value}</strong>
      </p>
      {children}
    </article>
  )
}

export function SummaryDonut({ value, label, tone = 'danger' }: { value: number; label: string; tone?: SummaryTone }) {
  return (
    <span
      className={`event-summary__donut is-${tone}`}
      style={{ '--pct': `${value}%` } as CSSProperties}
      aria-label={`${value}% ${label}`}
    >
      <b>{value}%</b>
      <small>{label}</small>
    </span>
  )
}
