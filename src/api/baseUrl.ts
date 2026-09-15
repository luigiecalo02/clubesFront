declare global {
  interface Window {
    __CLUBES_API_URL__?: string
    __CLUBES_ROOT_ID__?: string | number
  }
}

export function resolveApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__CLUBES_API_URL__?.trim() : ''
  if (runtime) return runtime.replace(/\/$/, '')

  const fromEnv = import.meta.env.VITE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  return 'http://127.0.0.1:8000'
}

export function resolveClubRootId(): number | null {
  const runtime = typeof window !== 'undefined' ? window.__CLUBES_ROOT_ID__ : undefined
  const fromRuntime = Number(runtime)
  if (Number.isInteger(fromRuntime) && fromRuntime > 0) return fromRuntime

  const fromEnv = Number(import.meta.env.VITE_CLUB_ID)
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv

  return null
}

export function resolveFileUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value
  const base = resolveApiBaseUrl()
  return `${base}${value.startsWith('/') ? value : `/${value}`}`
}
