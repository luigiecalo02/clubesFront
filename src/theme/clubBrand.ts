import type { CSSProperties } from 'react'

function normalizeHex(value: string): string | null {
  const raw = value.trim()
  if (/^#([0-9a-f]{3})$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase()
  }
  if (/^#([0-9a-f]{6})$/i.test(raw)) {
    return raw.toLowerCase()
  }
  return null
}

function toRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`
}

function mix(hex: string, toward: [number, number, number], amount: number): string {
  const [r, g, b] = toRgb(hex)
  return toHex(
    r + (toward[0] - r) * amount,
    g + (toward[1] - g) * amount,
    b + (toward[2] - b) * amount,
  )
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((n) => {
    const c = n / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function clubBrandStyle(principal?: string | null): CSSProperties | undefined {
  const primary = principal ? normalizeHex(principal) : null
  if (!primary) return undefined

  const text = luminance(primary) > 0.45 ? '#1a1408' : '#fff8e7'
  const [r, g, b] = toRgb(primary)

  return {
    '--panel-gold': primary,
    '--panel-gold-deep': mix(primary, [0, 0, 0], 0.28),
    '--panel-btn-bg': primary,
    '--panel-btn-text': text,
    '--panel-btn-shadow': `0 10px 24px rgb(${r} ${g} ${b} / 0.28)`,
    '--panel-focus': primary,
    '--panel-focus-ring': `rgb(${r} ${g} ${b} / 0.16)`,
    '--admin-gold': primary,
  } as CSSProperties
}
