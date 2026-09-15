import type { ElementType, HTMLAttributes, ReactNode } from 'react'

type AppPanelProps = {
  as?: ElementType
  className?: string
  shine?: boolean
  narrow?: boolean
  children: ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'className'>

export function AppPanel({
  as: Tag = 'section',
  className,
  shine = true,
  narrow = false,
  children,
  ...rest
}: AppPanelProps) {
  const classes = ['app-panel', narrow ? 'app-panel--narrow' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} {...rest}>
      {shine ? <div className="app-panel__shine" aria-hidden="true" /> : null}
      {children}
    </Tag>
  )
}
