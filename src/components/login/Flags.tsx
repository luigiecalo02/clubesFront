function PathfinderFlag({ className }: { className: string }) {
  return (
    <div className={`login-flag ${className}`}>
      <span className="login-flag__pole" />
      <span className="login-flag__finial" />
      <div className="login-flag__cloth">
        <svg viewBox="0 0 72 48" className="login-flag__emblem">
          <polygon points="36,8 60,40 12,40" fill="#fff" stroke="#c8102e" strokeWidth="3" />
          <rect x="34" y="10" width="4" height="28" rx="1" fill="#1d4ed8" />
          <polygon points="36,8 40,16 32,16" fill="#c8102e" />
        </svg>
      </div>
    </div>
  )
}

export function Flags() {
  return (
    <div className="login-flags" aria-hidden="true">
      <PathfinderFlag className="login-flag--left" />
      <PathfinderFlag className="login-flag--mid" />
    </div>
  )
}
