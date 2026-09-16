import type { AdminIconName } from './menu'

const PATHS: Record<AdminIconName, string> = {
  home: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  users:
    'M8 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8.5-1a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM3.2 19.2C4.4 16.6 6.8 15 9 15c1.5 0 2.9.6 4 1.6.7-.4 1.5-.6 2.4-.6 2 0 4.1 1.3 5.3 3.6',
  shield:
    'M12 3 5 6v6.2c0 4.2 2.8 7.9 7 8.8 4.2-.9 7-4.6 7-8.8V6l-7-3z',
  cog: 'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 13a7.8 7.8 0 0 0 .1-2l2-1.5-2-3.4-2.3.7a8 8 0 0 0-1.7-1L15 3.2h-4l-.5 2.6a8 8 0 0 0-1.7 1l-2.3-.7-2 3.4L6.5 11a7.8 7.8 0 0 0 .1 2l-2 1.5 2 3.4 2.3-.7a8 8 0 0 0 1.7 1l.5 2.6h4l.5-2.6a8 8 0 0 0 1.7-1l2.3.7 2-3.4z',
  building:
    'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M9 8h2M9 12h2M9 16h2M14 21h6V10h-4',
  flag: 'M5 21V4m0 0h10l-2 4 2 4H5',
  sitemap:
    'M10 4h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4zM12 8v4m0 0H6v4m6-4h6v4',
  idCard:
    'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm3 4h4M7 14h2m6-4h4m-4 3h4',
  group:
    'M8 11a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM3 19c1.2-2.6 3.6-4 6-4s4.8 1.4 6 4M14 15c1.6 0 3.3.8 4.6 2.4',
  calendar:
    'M7 4v2m10-2v2M5 8h14M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  check: 'M9 11l3 3 8-8M5 19V5a1 1 0 0 1 1-1h8',
  tags: 'M4 10.5 10.5 4H16v5.5L9.5 16 4 10.5zM14 7.5h.01',
  box: 'M4 8l8-4 8 4v10l-8 4-8-4zM4 8l8 4 8-4M12 12v10',
  map: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.2C6.2 17.4 8.8 16 12 16s5.8 1.4 7.5 4.2',
  sun: 'M12 4v2m0 12v2m8-8h-2M6 12H4m12.07-5.07-.7.7M7.63 16.37l-.7.7m10.14 0-.7-.7M7.63 7.63l-.7-.7M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  moon: 'M16.5 13.1A6.5 6.5 0 0 1 10 4.4 7.5 7.5 0 1 0 18.6 14a6.4 6.4 0 0 1-2.1-.9z',
  logout: 'M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h11m-4-4 4 4-4 4',
  download: 'M12 4v10m0 0 4-4m-4 4-4-4M5 19h14',
  undo: 'M9 8H5V4m.2 4A8 8 0 1 1 4 12',
  crown: 'M4 18h16M5 18 7 8l5 5 5-5 2 10',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.2 3 14.8 0 18m0-18c-3 3.2-3 14.8 0 18',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.2 8.8 13.3 13.3 8.8 15.2 10.7 10.7z',
  star: 'M12 4l2.1 5.3H20l-4.4 3.4 1.7 5.3L12 15.8 6.7 18l1.7-5.3L4 9.3h5.9z',
  eye: 'M2.5 12S6.2 6 12 6s9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6zM12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4z',
  wallet: 'M4 8h16v11H4zM4 8V6.5A1.5 1.5 0 0 1 5.5 5H16M16 13.5h3',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
}

const PRIME_TO_NAME: Record<string, AdminIconName> = {
  home: 'home',
  users: 'users',
  user: 'user',
  shield: 'shield',
  cog: 'cog',
  building: 'building',
  flag: 'flag',
  sitemap: 'sitemap',
  'id-card': 'idCard',
  calendar: 'calendar',
  check: 'check',
  'check-square': 'check',
  tags: 'tags',
  tag: 'tags',
  box: 'box',
  map: 'map',
  'map-marker': 'map',
  'th-large': 'grid',
  sun: 'sun',
  moon: 'moon',
  'sign-out': 'logout',
  download: 'download',
  replay: 'undo',
  undo: 'undo',
  crown: 'crown',
  globe: 'globe',
  compass: 'compass',
  star: 'star',
  eye: 'eye',
  wallet: 'wallet',
}

const ROLE_TO_NAME: Record<string, AdminIconName> = {
  director: 'crown',
  subdirector: 'shield',
  secretario: 'idCard',
  tesorero: 'wallet',
  miembro: 'user',
  juez: 'eye',
  pastor: 'building',
  invitado: 'users',
  admin: 'cog',
  super_admin: 'shield',
  supervisor: 'compass',
}

function slugFromPrime(icon?: string | null): string {
  return (icon ?? '')
    .trim()
    .replace(/^pi\s+/i, '')
    .replace(/^pi-/i, '')
    .toLowerCase()
}

export function adminIconFromPrime(icon?: string | null): AdminIconName | null {
  const slug = slugFromPrime(icon)
  return slug ? (PRIME_TO_NAME[slug] ?? null) : null
}

export function roleIconName(option: { icon?: string | null; rol_name?: string | null }): AdminIconName {
  const fromRole = option.rol_name ? ROLE_TO_NAME[option.rol_name] : undefined
  const fromPrime = adminIconFromPrime(option.icon)
  if (fromPrime && fromPrime !== 'flag') return fromPrime
  return fromRole ?? fromPrime ?? 'flag'
}

export function AdminIcon({ name }: { name: AdminIconName }) {
  return (
    <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
