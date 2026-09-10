export function Explorer() {
  return (
    <div className="login-explorer" aria-hidden="true">
      <svg className="login-explorer__svg" viewBox="0 0 220 400" fill="none">
        <defs>
          <linearGradient id="explorerFill" x1="30" y1="20" x2="200" y2="390" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0c1018" />
            <stop offset="58%" stopColor="#16110c" />
            <stop offset="100%" stopColor="#4a2d12" />
          </linearGradient>
        </defs>

        <g className="login-explorer__body">
          <path
            fill="url(#explorerFill)"
            d="M168 168c18 38 16 96 6 148-2 8 2 16 12 14 6-22 10-70-2-122-6-24-12-36-16-40z"
          />
          <path
            fill="url(#explorerFill)"
            d="M78 74c-20 2-34 16-36 28-1 8 6 12 14 10 18-4 36-2 52 0 4-14-4-32-30-38z"
          />
          <path
            fill="url(#explorerFill)"
            d="M92 58c8-28 40-32 52-12 4 8 2 18-4 24-16-10-34-8-48-12z"
          />
          <ellipse cx="118" cy="104" rx="23" ry="26" fill="url(#explorerFill)" />

          <path
            className="login-explorer__scarf"
            fill="#c8102e"
            d="M96 128c10 8 18 10 26 8 10-2 16-8 20-14 2 20 10 36 26 50 5 4-2 10-8 6-18-14-28-8-34 6-8-12-16-18-34-4-6 4-12-1-7-7 14-16 16-30 11-45z"
          />
          <path fill="#f0c14b" d="M104 132h30c1 9-6 13-16 13s-15-4-14-13z" />

          <path
            fill="url(#explorerFill)"
            d="M86 136c-10 22-12 50-4 78l22 6 16-14 20 12 16-8c8-28 4-54-6-74-12 12-26 16-38 16s-18-4-26-16z"
          />
          <path
            fill="url(#explorerFill)"
            d="M84 176c-20 18-28 38-22 54 8 3 16-10 22-24 6-12 10-24 12-32-6 2-10 2-12 2z"
          />
          <path
            fill="url(#explorerFill)"
            d="M154 172c8 8 18 8 22 2 6 16-2 36-16 48-8 6-16-2-14-10 4-12 8-26 8-40z"
          />

          <path
            fill="url(#explorerFill)"
            d="M98 214 86 322c-2 10 6 16 15 13l14-90 12 96c2 11 14 14 19 6l-10-126-16-10-22 3z"
          />
          <path fill="#1a120a" d="M82 320c-8 6-6 18 4 22h20c5-8-1-18-8-22z" />
          <path fill="#1a120a" d="M128 328c-4 8 2 16 10 18h18c8-5 6-15-2-20z" />
        </g>
      </svg>
    </div>
  )
}
