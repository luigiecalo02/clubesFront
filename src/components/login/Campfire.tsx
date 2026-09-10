const SPARKS = [
  { left: '38%', delay: '0s', duration: '2.4s' },
  { left: '48%', delay: '0.5s', duration: '2.8s' },
  { left: '58%', delay: '1.1s', duration: '2.2s' },
  { left: '44%', delay: '1.7s', duration: '3s' },
  { left: '62%', delay: '0.8s', duration: '2.6s' },
] as const

export function Campfire() {
  return (
    <div className="login-campfire" aria-hidden="true">
      <div className="login-campfire__ambient" />
      <div className="login-campfire__sparks">
        {SPARKS.map((spark, index) => (
          <span
            key={index}
            className="login-campfire__spark"
            style={{
              left: spark.left,
              animationDelay: spark.delay,
              animationDuration: spark.duration,
            }}
          />
        ))}
      </div>
      <div className="login-campfire__flames">
        <span className="login-campfire__flame login-campfire__flame--back" />
        <span className="login-campfire__flame login-campfire__flame--mid" />
        <span className="login-campfire__flame login-campfire__flame--core" />
      </div>
      <div className="login-campfire__logs">
        <span className="login-campfire__log login-campfire__log--a" />
        <span className="login-campfire__log login-campfire__log--b" />
      </div>
    </div>
  )
}
