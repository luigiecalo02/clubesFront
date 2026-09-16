import { authApi } from '../api/auth'
import type { AuthContextOption, AuthUser } from '../api/types'

export function isRemoteContext(option: AuthContextOption): boolean {
  if (option.current_tenant === true) return false
  if (!option.origin) return false
  if (option.current_tenant === false) return true

  try {
    return new URL(option.origin).origin !== window.location.origin
  } catch {
    return false
  }
}

export async function activateContext(
  option: AuthContextOption,
  switchContext: (payload: { organizacion_id?: number | null; rol_id: number }) => Promise<AuthUser>,
): Promise<'local' | 'remote'> {
  if (!isRemoteContext(option)) {
    await switchContext({
      organizacion_id: option.organizacion_id,
      rol_id: option.rol_id,
    })
    return 'local'
  }

  if (!option.origin) {
    throw new Error('Este rol está en otro club que no tiene dominio configurado.')
  }

  const issued = await authApi.issueHandoff({
    organizacion_id: option.organizacion_id,
    rol_id: option.rol_id,
  })
  const target = new URL('/entrar', issued.origin)
  target.searchParams.set('code', issued.code)
  window.location.assign(target.toString())
  return 'remote'
}
