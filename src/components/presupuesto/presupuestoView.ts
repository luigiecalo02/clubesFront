import type { AdminIconName } from '../../admin/menu'
import type { PresupuestoDestinatario, PresupuestoDetalle, PresupuestoItem, PresupuestoTipo } from '../../api/types'
import { toIsoDate } from '../../theme/dates'

export function formatMoney(amount: number | null): string {
  const value = amount ?? 0
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  })
}

export function destLabel(destinatario: PresupuestoDestinatario): string {
  if (destinatario === 'ambos') return 'Ambos'
  return destinatario === 'miembros' ? 'Integrantes' : 'Acompañantes'
}

export function tipoLabel(tipo: PresupuestoTipo): string {
  return tipo === 'individual' ? 'Individual' : 'Grupal'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatLongDate(value?: string | null): string {
  const iso = toIsoDate(value ?? null)
  if (!iso) return 'Sin fecha'
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function itemKey(item: PresupuestoItem): string {
  return item.id != null ? `id:${item.id}` : `new:${item.concepto}:${item.destinatario}`
}

export function collectItems(detail: PresupuestoDetalle): PresupuestoItem[] {
  const byKey = new Map<string, PresupuestoItem>()
  for (const item of [...detail.bloques.miembros.items, ...detail.bloques.acompanantes.items]) {
    const key = itemKey(item)
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, { ...item })
      continue
    }
    byKey.set(key, {
      ...prev,
      monto_total: prev.monto_total + item.monto_total,
    })
  }
  return [...byKey.values()]
}

export function peopleFor(item: PresupuestoItem, detail: PresupuestoDetalle): number {
  if (item.destinatario === 'ambos') {
    return detail.cantidades.miembros + detail.cantidades.acompanantes
  }
  return detail.cantidades[item.destinatario] ?? 0
}

export function splitByTipo(items: PresupuestoItem[]) {
  return {
    individual: items.filter((item) => item.tipo === 'individual').reduce((sum, item) => sum + item.monto_total, 0),
    grupal: items.filter((item) => item.tipo === 'grupal').reduce((sum, item) => sum + item.monto_total, 0),
  }
}

export function conceptIcon(concepto: string): AdminIconName {
  const text = concepto.toLowerCase()
  if (text.includes('inscrip')) return 'check'
  if (text.includes('transpor') || text.includes('bus')) return 'compass'
  if (text.includes('aliment') || text.includes('comida')) return 'box'
  if (text.includes('aloj') || text.includes('hosped')) return 'building'
  if (text.includes('seguro') || text.includes('protec')) return 'shield'
  return 'tags'
}

export function perPerson(total: number, people: number): number {
  if (people <= 0) return total
  return total / people
}
