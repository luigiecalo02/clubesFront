import { useEffect, useRef, useState, type ReactNode } from 'react'
import './app-tabs.css'

type TabPlacement = {
  stacked: boolean
  joinsStart: boolean
  joinsEnd: boolean
}

function readTabPlacement(list: HTMLElement): TabPlacement {
  const tabs = [...list.querySelectorAll<HTMLElement>(':scope > .app-tabs__tab')]
  if (tabs.length < 2) return { stacked: false, joinsStart: false, joinsEnd: false }
  const tops = tabs.map((tab) => tab.offsetTop)
  const stacked = Math.max(...tops) - Math.min(...tops) > 24
  const selected = tabs.find((tab) => tab.classList.contains('is-on'))
  if (!selected || !stacked) return { stacked, joinsStart: false, joinsEnd: false }
  const onLastRow = Math.abs(selected.offsetTop - Math.max(...tops)) < 28
  if (!onLastRow) return { stacked, joinsStart: false, joinsEnd: false }
  const bounds = list.getBoundingClientRect()
  const box = selected.getBoundingClientRect()
  return {
    stacked,
    joinsStart: box.left - bounds.left < 8,
    joinsEnd: bounds.right - box.right < 8,
  }
}

export type AppTabItem<T extends string> = {
  id: T
  label: ReactNode
  paid?: boolean
}

type AppTabListProps<T extends string> = {
  label: string
  tabs: AppTabItem<T>[]
  value: T
  onChange: (id: T) => void
  disabled?: boolean
}

export function AppTabList<T extends string>({ label, tabs, value, onChange, disabled = false }: AppTabListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<TabPlacement>({ stacked: false, joinsStart: false, joinsEnd: false })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const next = readTabPlacement(list)
      setPlacement((current) =>
        current.stacked === next.stacked && current.joinsStart === next.joinsStart && current.joinsEnd === next.joinsEnd
          ? current
          : next,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [tabs, value, placement.stacked])

  const listClass = [
    'app-tabs__list',
    placement.stacked ? 'is-stacked' : '',
    placement.joinsStart ? 'joins-start' : '',
    placement.joinsEnd ? 'joins-end' : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={listRef} className={listClass} role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`app-tabs__tab${tab.paid ? ' is-paid' : ''}${selected ? ' is-on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

type AppTabsProps<T extends string> = AppTabListProps<T> & {
  children: ReactNode
  className?: string
  extra?: ReactNode
  disabled?: boolean
}

export function AppTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
  className,
  extra,
  disabled = false,
}: AppTabsProps<T>) {
  return (
    <div className={`app-tabs has-sheet${className ? ` ${className}` : ''}`}>
      <div className={`app-tabs__bar${extra ? ' has-extra' : ''}`}>
        <AppTabList label={label} tabs={tabs} value={value} onChange={onChange} disabled={disabled} />
        {extra}
      </div>
      <div className="app-tabs__body">{children}</div>
    </div>
  )
}
