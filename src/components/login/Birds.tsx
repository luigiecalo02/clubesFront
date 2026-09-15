const FLOCK = [
  { id: 'lead', x: 98, y: 46, size: 40 },
  { id: 'l1', x: 64, y: 18, size: 34 },
  { id: 'r1', x: 64, y: 74, size: 34 },
  { id: 'l2', x: 32, y: 4, size: 30 },
  { id: 'r2', x: 32, y: 90, size: 30 },
  { id: 'l3', x: 0, y: 0, size: 26 },
  { id: 'r3', x: 0, y: 104, size: 26 },
] as const

function BirdMark() {
  return (
    <svg viewBox="0 0 36 16" fill="currentColor">
      <path
        className="login-bird__wing login-bird__wing--l"
        d="M18 9C12 8.2 6.4 3.4 0.8 7.2 6.6 6.6 12.2 9.4 18 9z"
      />
      <path
        className="login-bird__wing login-bird__wing--r"
        d="M18 9c6-.8 11.6-5.6 17.2-1.8C29.4 6.6 23.8 9.4 18 9z"
      />
    </svg>
  )
}

export function Birds() {
  return (
    <div className="login-birds" aria-hidden="true">
      <div className="login-flock">
        {FLOCK.map((bird) => (
          <span
            key={bird.id}
            className={`login-bird login-bird--${bird.id}`}
            style={{ left: bird.x, top: bird.y, width: bird.size }}
          >
            <BirdMark />
          </span>
        ))}
      </div>
    </div>
  )
}
