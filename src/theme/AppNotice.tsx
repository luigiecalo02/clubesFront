export type NoticeKind = 'success' | 'warning' | 'error'

type AppNoticeProps = {
  kind: NoticeKind
  title: string
  message: string
  ttl: number
  leaving?: boolean
  onClose: () => void
}

const ICONS: Record<NoticeKind, string> = {
  success: 'M5 12.5 9.2 17 19 7',
  warning: 'M12 8v5m0 3.2h.01M12 3 3.6 18h16.8L12 3z',
  error: 'M8 8l8 8M16 8l-8 8',
}

export function AppNotice({ kind, title, message, ttl, leaving = false, onClose }: AppNoticeProps) {
  return (
    <article
      className={`app-notice app-notice--${kind}${leaving ? ' is-leaving' : ''}`}
      role={kind === 'error' || kind === 'warning' ? 'alert' : 'status'}
      style={{ ['--notice-ttl' as string]: `${ttl}ms` }}
    >
      <span className="app-notice__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d={ICONS[kind]}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="app-notice__copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="app-notice__close" onClick={onClose} aria-label="Cerrar aviso">
        Cerrar
      </button>
      <span className="app-notice__timer" aria-hidden="true" />
    </article>
  )
}
