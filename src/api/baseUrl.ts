declare global {
  interface Window {
    __CLUBES_API_URL__?: string
  }
}

export function resolveApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__CLUBES_API_URL__?.trim() : ''
  if (runtime) return runtime.replace(/\/$/, '')

  const fromEnv = import.meta.env.VITE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  return 'http://127.0.0.1:8000'
}
