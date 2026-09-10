type PineProps = {
  x: number
  y: number
  scale: number
  delay: string
  duration: string
}

function Pine({ x, y, scale, delay, duration }: PineProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g
        className="login-forest__tree"
        style={{ animationDelay: delay, animationDuration: duration }}
      >
        <polygon points="0,-86 -22,-38 22,-38" />
        <polygon points="0,-62 -30,-16 30,-16" />
        <polygon points="0,-36 -38,18 38,18" />
        <rect x="-5" y="16" width="10" height="22" rx="1" />
      </g>
    </g>
  )
}

export function Forest() {
  return (
    <div className="login-forest" aria-hidden="true">
      <svg className="login-forest__svg" viewBox="0 0 1400 320" preserveAspectRatio="xMidYMax meet">
        <Pine x={40} y={248} scale={1.15} delay="0s" duration="7.2s" />
        <Pine x={110} y={256} scale={0.82} delay="0.6s" duration="6.4s" />
        <Pine x={176} y={250} scale={1.05} delay="1.1s" duration="8s" />
        <Pine x={248} y={260} scale={0.7} delay="0.3s" duration="5.8s" />
        <Pine x={310} y={246} scale={1.28} delay="1.4s" duration="7.6s" />
        <Pine x={390} y={258} scale={0.88} delay="0.8s" duration="6.8s" />
        <Pine x={470} y={252} scale={1.1} delay="1.8s" duration="7s" />
        <Pine x={1180} y={250} scale={0.95} delay="0.4s" duration="6.6s" />
        <Pine x={1260} y={244} scale={1.2} delay="1.2s" duration="7.8s" />
        <Pine x={1340} y={256} scale={0.78} delay="0.9s" duration="6.2s" />
      </svg>
    </div>
  )
}
