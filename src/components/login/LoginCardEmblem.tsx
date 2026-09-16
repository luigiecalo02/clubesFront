type LoginCardEmblemProps = {
  logoUrl?: string | null
}

export function LoginCardEmblem({ logoUrl }: LoginCardEmblemProps) {
  if (logoUrl) {
    return <img className="login-card__emblem login-card__emblem--photo" src={logoUrl} alt="" />
  }

  return (
    <svg className="login-card__emblem" viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r="42" fill="#111827" stroke="#f0c14b" strokeWidth="2.2" />
      <circle cx="44" cy="44" r="36" fill="none" stroke="#c8102e" strokeWidth="1.4" />
      <polygon points="44,16 70,68 18,68" fill="#fffaf0" />
      <polygon
        points="44,22 64,64 24,64"
        fill="none"
        stroke="#c8102e"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect x="42" y="26" width="4" height="36" rx="1" fill="#1d4ed8" />
      <polygon points="44,20 48,30 40,30" fill="#c8102e" />
      <polygon points="36,40 44,34 52,40 48,42 44,38 40,42" fill="#f0c14b" />
    </svg>
  )
}
