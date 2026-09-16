declare global {
  interface Window {
    __CLUBES_API_URL__?: string
    __CLUBES_ROOT_ID__?: string | number
    __CLUBES_HOSTS__?: string
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
  const hostname = currentHostname()
  if (hostname) {
    const fromHost = parseClubHosts(clubHostsSource()).get(hostname)
    if (fromHost) return fromHost
  }

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

function clubHostsSource(): string | undefined {
  if (typeof window !== 'undefined' && window.__CLUBES_HOSTS__) {
    return String(window.__CLUBES_HOSTS__)
  }

  return import.meta.env.VITE_CLUB_HOSTS
}

function parseClubHosts(raw: string | undefined): Map<string, number> {
  const map = new Map<string, number>()
  if (!raw?.trim()) return map

  for (const part of raw.split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const colon = trimmed.lastIndexOf(':')
    if (colon <= 0) continue

    const host = normalizeHost(trimmed.slice(0, colon))
    const id = Number(trimmed.slice(colon + 1).trim())
    if (host && Number.isInteger(id) && id > 0) {
      map.set(host, id)
    }
  }

  return map
}

function currentHostname(): string | null {
  if (typeof window === 'undefined') return null
  return normalizeHost(window.location.hostname) || null
}

function normalizeHost(value: string): string {
  let host = value.trim().toLowerCase()
  if (!host) return ''

  if (host.includes('://')) {
    try {
      return new URL(host).hostname.toLowerCase()
    } catch {
      return ''
    }
  }

  const slash = host.indexOf('/')
  if (slash >= 0) host = host.slice(0, slash)

  const colon = host.indexOf(':')
  if (colon >= 0) host = host.slice(0, colon)

  return host
}
