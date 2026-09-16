import { api } from './client'
import type { ApiEnvelope, ClubPerson, PersonaIdType } from './types'

export type ProfilePersona = Pick<
  ClubPerson,
  | 'id'
  | 'tipo_identificacion'
  | 'identificacion'
  | 'nombre1'
  | 'nombre2'
  | 'apellido1'
  | 'apellido2'
  | 'correo'
  | 'telefono'
  | 'full_name'
> & {
  fecha_nacimiento?: string | null
  sexo?: string | null
  direccion_actual?: string | null
}

export type ProfileUser = {
  id: number
  name: string
  email: string
  avatar_url: string | null
  persona_id: number | null
  persona: ProfilePersona | null
}

export type UpdateProfilePayload = {
  name?: string
  email?: string
  password?: string
  password_confirmation?: string
  persona?: {
    tipo_identificacion?: PersonaIdType | string
    identificacion?: string
    nombre1?: string
    nombre2?: string
    apellido1?: string
    apellido2?: string
    telefono?: string
    correo?: string
    fecha_nacimiento?: string
    sexo?: string
    direccion_actual?: string
  }
}

export const usersApi = {
  async show(id: number): Promise<ProfileUser> {
    const { data } = await api.get<ApiEnvelope<ProfileUser>>(`/api/v1/users/${id}`)
    return data.data
  },

  async update(id: number, payload: UpdateProfilePayload): Promise<ProfileUser> {
    const { data } = await api.put<ApiEnvelope<ProfileUser>>(`/api/v1/users/${id}`, payload)
    return data.data
  },

  async uploadAvatar(id: number, file: File): Promise<ProfileUser> {
    const body = new FormData()
    body.append('avatar', file)
    const { data } = await api.post<ApiEnvelope<ProfileUser>>(`/api/v1/users/${id}/avatar`, body, {
      transformRequest: [
        (value, headers) => {
          if (value instanceof FormData) {
            delete headers['Content-Type']
          }
          return value
        },
      ],
    })
    return data.data
  },
}
