import type { ClubIcono } from '../../api/types'

export const ICON_CATEGORY_LABELS: Record<string, string> = {
  comidas: 'Comidas',
  eventos: 'Eventos',
  clubes: 'Clubes',
  deportes: 'Deportes',
  naturaleza: 'Naturaleza',
  personas: 'Personas',
  tiempo: 'Tiempo',
  comunicacion: 'Comunicación',
  archivos: 'Archivos',
  orientacion: 'Orientación',
  sistema: 'Sistema',
  personalizado: 'Personalizado',
}

export function iconSearchText(icon: ClubIcono): string {
  return [icon.nombre, icon.categoria, icon.slug, icon.valor, ...(icon.etiquetas ?? [])]
    .join(' ')
    .toLowerCase()
}

export function matchesClubIcon(icon: ClubIcono, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return iconSearchText(icon).includes(needle)
}

export function findClubIcon(icons: ClubIcono[], stored?: string | null): ClubIcono | undefined {
  const value = stored?.trim()
  if (!value) return undefined
  return icons.find(
    (icon) =>
      icon.valor === value ||
      icon.slug === value ||
      icon.nombre.toLowerCase() === value.toLowerCase(),
  )
}

export function groupClubIcons(icons: ClubIcono[]): { key: string; label: string; items: ClubIcono[] }[] {
  const order = Object.keys(ICON_CATEGORY_LABELS)
  const map = new Map<string, ClubIcono[]>()
  for (const icon of icons) {
    const key = icon.categoria || 'personalizado'
    const list = map.get(key) ?? []
    list.push(icon)
    map.set(key, list)
  }
  const extra = [...map.keys()].filter((key) => !order.includes(key))
  return [...order, ...extra]
    .filter((key) => map.has(key))
    .map((key) => ({
      key,
      label: ICON_CATEGORY_LABELS[key] ?? key,
      items: map.get(key) ?? [],
    }))
}
