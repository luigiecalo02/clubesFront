import { AdminIcon, adminIconFromPrime, isAdminIconName } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import { FOOD_ICONS, isFoodIcon } from './foodIcons'

function isPrimeClass(value?: string | null): boolean {
  return Boolean(value?.trim().startsWith('pi '))
}

function isImagePath(value?: string | null): boolean {
  const raw = (value ?? '').trim()
  if (!raw || raw.startsWith('pi ') || isFoodIcon(raw)) return false
  return (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith('/') ||
    raw.startsWith('iconos/') ||
    raw.startsWith('data:') ||
    /\.(gif|png|jpe?g|webp|svg)(\?|$)/i.test(raw)
  )
}

type CatalogIconProps = {
  value?: string | null
  url?: string | null
  tipo?: string | null
}

export function CatalogIcon({ value, url, tipo }: CatalogIconProps) {
  const photo = resolveFileUrl(url)
  if (photo) {
    return <img src={photo} alt="" className="catalog-icon-img" />
  }

  if (tipo === 'trazo' || isFoodIcon(value)) {
    const Icon = value ? FOOD_ICONS[value] : undefined
    if (Icon) {
      return <Icon className="catalog-icon catalog-icon--food" size={18} strokeWidth={1.8} aria-hidden="true" />
    }
  }

  if (isPrimeClass(value)) {
    return <i className={`catalog-icon ${value}`} aria-hidden="true" />
  }

  if (isAdminIconName(value)) {
    return <AdminIcon name={value} />
  }

  const fromPrime = adminIconFromPrime(value)
  if (fromPrime) {
    return <AdminIcon name={fromPrime} />
  }

  if (isImagePath(value)) {
    const storedImage = resolveFileUrl(value)
    if (storedImage) {
      return <img src={storedImage} alt="" className="catalog-icon-img" />
    }
  }

  return <AdminIcon name="box" />
}
