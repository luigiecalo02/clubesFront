const FIREFLIES = [
  { top: '58%', left: '18%', size: 4, delay: '0s', duration: '11s', variant: 'a' },
  { top: '64%', left: '32%', size: 3, delay: '1.4s', duration: '13s', variant: 'b' },
  { top: '52%', left: '8%', size: 5, delay: '2.8s', duration: '10s', variant: 'c' },
  { top: '70%', left: '42%', size: 3.5, delay: '0.6s', duration: '14s', variant: 'a' },
  { top: '48%', left: '26%', size: 2.5, delay: '3.2s', duration: '12s', variant: 'b' },
  { top: '62%', left: '54%', size: 4, delay: '1.8s', duration: '15s', variant: 'c' },
  { top: '74%', left: '14%', size: 3, delay: '4s', duration: '9s', variant: 'a' },
  { top: '56%', left: '38%', size: 2.8, delay: '2.2s', duration: '12.5s', variant: 'b' },
] as const

export function Particles() {
  return (
    <div className="login-particles" aria-hidden="true">
      {FIREFLIES.map((fly, index) => (
        <span
          key={index}
          className={`login-firefly login-firefly--${fly.variant}`}
          style={{
            top: fly.top,
            left: fly.left,
            width: fly.size,
            height: fly.size,
            animationDelay: fly.delay,
            animationDuration: fly.duration,
          }}
        />
      ))}
    </div>
  )
}
