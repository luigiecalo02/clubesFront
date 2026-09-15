export function Tent() {
  return (
    <div className="login-tent" aria-hidden="true">
      <svg className="login-tent__svg" viewBox="0 0 220 150">
        <ellipse className="login-tent__shadow" cx="112" cy="136" rx="82" ry="9" />
        <path className="login-tent__line" d="M110 24L18 142" />
        <path className="login-tent__line" d="M110 24L202 142" />
        <path className="login-tent__back" d="M62 128L110 28L162 128Z" />
        <path className="login-tent__left" d="M28 128L110 24L78 128Z" />
        <path className="login-tent__right" d="M110 24L196 126L142 128Z" />
        <path className="login-tent__floor" d="M78 128H142L110 118Z" />
        <path className="login-tent__glow" d="M92 128L110 42L132 128Z" />
        <path className="login-tent__door" d="M86 128L110 48L128 128Z" />
        <path className="login-tent__flap" d="M110 48L148 122L128 128L110 48Z" />
        <path className="login-tent__ridge" d="M110 24L110 48" />
        <path className="login-tent__fold" d="M110 24L96 128" />
        <circle className="login-tent__peg" cx="24" cy="136" r="2.4" />
        <circle className="login-tent__peg" cx="198" cy="136" r="2.4" />
      </svg>
    </div>
  )
}
