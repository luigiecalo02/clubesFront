import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppNotice, type NoticeKind } from './AppNotice'
import { useSceneTheme } from './sceneTheme'

type NoticeRecord = {
  id: number
  kind: NoticeKind
  title: string
  message: string
  ttl: number
  leaving: boolean
}

type NoticeApi = {
  show: (kind: NoticeKind, message: string, title?: string) => void
  success: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
}

const TITLES: Record<NoticeKind, string> = {
  success: 'Listo',
  warning: 'Atención',
  error: 'Algo salió mal',
}

const TTL: Record<NoticeKind, number> = {
  success: 4200,
  warning: 5600,
  error: 7200,
}

const NoticeContext = createContext<NoticeApi | null>(null)

export function NoticeProvider({ children }: { children: ReactNode }) {
  const { theme } = useSceneTheme()
  const seq = useRef(1)
  const timers = useRef(new Map<number, number>())
  const [items, setItems] = useState<NoticeRecord[]>([])

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)))
      const timer = timers.current.get(id)
      if (timer) window.clearTimeout(timer)
      timers.current.set(
        id,
        window.setTimeout(() => remove(id), 280),
      )
    },
    [remove],
  )

  const show = useCallback(
    (kind: NoticeKind, message: string, title?: string) => {
      const text = message.trim()
      if (!text) return
      const id = seq.current
      seq.current += 1
      const ttl = TTL[kind]
      setItems((current) => [
        ...current.slice(-3),
        { id, kind, title: title?.trim() || TITLES[kind], message: text, ttl, leaving: false },
      ])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), ttl),
      )
    },
    [dismiss],
  )

  const api = useMemo<NoticeApi>(
    () => ({
      show,
      success: (message, title) => show('success', message, title),
      warning: (message, title) => show('warning', message, title),
      error: (message, title) => show('error', message, title),
    }),
    [show],
  )

  return (
    <NoticeContext.Provider value={api}>
      {children}
      {createPortal(
        <div className={`app-notice-host${theme === 'day' ? ' is-day' : ''}`} aria-live="polite">
          {items.map((item) => (
            <AppNotice
              key={item.id}
              kind={item.kind}
              title={item.title}
              message={item.message}
              ttl={item.ttl}
              leaving={item.leaving}
              onClose={() => dismiss(item.id)}
            />
          ))}
        </div>,
        document.body,
      )}
    </NoticeContext.Provider>
  )
}

export function useNotice(): NoticeApi {
  const ctx = useContext(NoticeContext)
  if (!ctx) {
    throw new Error('useNotice debe usarse dentro de NoticeProvider')
  }
  return ctx
}
