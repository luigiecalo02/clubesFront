import type { CSSProperties } from 'react'
import type { ClubesBackgroundStyle } from '../api/types'

export type { ClubesBackgroundStyle }

export const BACKGROUND_STYLES: { id: ClubesBackgroundStyle; label: string; hint: string }[] = [
  { id: 'cover', label: 'Cubrir', hint: 'Llena toda la pantalla, recortando si hace falta.' },
  { id: 'contain', label: 'Contener', hint: 'Se ve la imagen completa, con márgenes si no calza.' },
  { id: 'mosaic', label: 'Mosaico', hint: 'Se repite en teselas por todo el fondo.' },
  { id: 'stack', label: 'Apilada', hint: 'Se apila de arriba abajo a lo ancho.' },
  { id: 'stretch', label: 'Estirar', hint: 'Se deforma para ocupar todo el recuadro.' },
]

export function parseBackgroundStyle(value: string | null | undefined): ClubesBackgroundStyle {
  return BACKGROUND_STYLES.some((item) => item.id === value) ? (value as ClubesBackgroundStyle) : 'cover'
}

export function backgroundStyleCss(style: ClubesBackgroundStyle | null | undefined): CSSProperties {
  switch (parseBackgroundStyle(style)) {
    case 'contain':
      return { backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    case 'mosaic':
      return { backgroundSize: '12rem auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left' }
    case 'stack':
      return { backgroundSize: '100% auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center' }
    case 'stretch':
      return { backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    default:
      return { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
  }
}
