export function Squirrel() {
  return (
    <div className="login-squirrel" aria-hidden="true">
      <svg className="login-squirrel__svg" viewBox="0 0 92 64">
        <path
          className="login-squirrel__tail"
          d="M38 42c-8 2-18 1-24-8-6-10-2-22 8-26 4-1 7 2 6 6-1 6-6 8-4 14 2 7 10 10 16 10"
        />
        <ellipse className="login-squirrel__body" cx="52" cy="38" rx="16" ry="11" />
        <ellipse className="login-squirrel__head" cx="70" cy="28" rx="9" ry="8" />
        <path className="login-squirrel__ear" d="M68 16l3 8h-7z" />
        <circle className="login-squirrel__eye" cx="74" cy="26" r="1.3" />
        <path className="login-squirrel__leg login-squirrel__leg--hind" d="M44 44c-1 6-2 10-3 13" />
        <path className="login-squirrel__leg login-squirrel__leg--hind-alt" d="M49 44c0 6-1 10-2 13" />
        <path className="login-squirrel__leg login-squirrel__leg--fore" d="M64 43c0 6 1 10 2 13" />
        <path className="login-squirrel__leg login-squirrel__leg--fore-alt" d="M66 43c1 6 3 10 4 13" />
      </svg>
    </div>
  )
}
