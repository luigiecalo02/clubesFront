import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { personasApi } from '../../api/personas'
import type { ClubPerson, CreatePersonaPayload, PersonaIdType } from '../../api/types'
import {
  canCreateClubMember,
  canImpersonateClubMember,
  canManageMemberPhotos,
  canUpdateClubMember,
} from '../../admin/menu'
import { useAuth } from '../../auth/AuthProvider'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { ImageUpload } from '../../theme/ImageUpload'
import { useNotice } from '../../theme/NoticeProvider'
import { memberUserId } from './MemberActions'

export type MemberDrawerMode = 'create' | 'edit' | 'password' | 'impersonate'

type MemberDrawerProps = {
  mode: MemberDrawerMode | null
  persona: ClubPerson | null
  organizacionId?: number | null
  onClose: () => void
  onCreated?: (persona: ClubPerson) => void
  onUpdated?: (persona: ClubPerson) => void
  onError?: (message: string) => void
  onNotice?: (message: string) => void
}

const emptyForm = (): CreatePersonaPayload => ({
  tipo_identificacion: 'CC',
  identificacion: '',
  nombre1: '',
  nombre2: '',
  apellido1: '',
  apellido2: '',
  fecha_nacimiento: '',
  sexo: '',
  telefono: '',
  correo: '',
})

function personaInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

function formFromPersona(persona: ClubPerson): CreatePersonaPayload {
  return {
    tipo_identificacion: (persona.tipo_identificacion as PersonaIdType) || 'CC',
    identificacion: persona.identificacion || '',
    nombre1: persona.nombre1 || '',
    nombre2: persona.nombre2 || '',
    apellido1: persona.apellido1 || '',
    apellido2: persona.apellido2 || '',
    fecha_nacimiento: persona.fecha_nacimiento || '',
    sexo: (persona.sexo as 'M' | 'F' | '') || '',
    telefono: persona.telefono || '',
    correo: persona.correo || '',
  }
}

function personaPayload(form: CreatePersonaPayload) {
  return {
    ...form,
    identificacion: form.identificacion.trim(),
    nombre2: form.nombre2?.trim() || undefined,
    apellido2: form.apellido2?.trim() || undefined,
    fecha_nacimiento: form.fecha_nacimiento || undefined,
    sexo: form.sexo || undefined,
    telefono: form.telefono?.trim() || undefined,
    correo: form.correo?.trim().toLowerCase() || undefined,
  }
}

function validateMemberIdentity(form: CreatePersonaPayload): Record<string, string> {
  const errors: Record<string, string> = {}
  const identificacion = form.identificacion.trim()
  if (!identificacion) {
    errors.identificacion = 'Escribe el número de identificación.'
  } else if (identificacion.length < 5) {
    errors.identificacion = 'La identificación debe tener al menos 5 caracteres.'
  } else if (!/^[A-Za-z0-9.-]+$/.test(identificacion)) {
    errors.identificacion = 'La identificación solo admite letras, números, punto o guion.'
  }

  const correo = form.correo?.trim()
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errors.correo = 'El correo no es válido.'
  }
  return errors
}

function fieldErrorsFromApi(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const raw = (error.response?.data as { errors?: Record<string, string[] | string> } | undefined)?.errors
  if (!raw) return {}
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const message = Array.isArray(value) ? value[0] : value
    if (message) next[key] = String(message)
  }
  return next
}

export function MemberDrawer({
  mode,
  persona,
  organizacionId,
  onClose,
  onCreated,
  onUpdated,
  onError,
  onNotice,
}: MemberDrawerProps) {
  const auth = useAuth()
  const notices = useNotice()
  const navigate = useNavigate()
  const ctx = auth.user?.contexto
  const access = {
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: organizacionId ?? ctx?.organizacion_id,
  }
  const canCreate = canCreateClubMember(access)
  const canUpdate = canUpdateClubMember(access)
  const canImpersonate = canImpersonateClubMember(access)
  const canManagePhotos = canManageMemberPhotos(access)
  const [form, setForm] = useState(emptyForm)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (mode === 'create') {
      setForm(emptyForm())
      setPhotoFile(null)
      setPhotoPreview(null)
      setRemovePhoto(false)
      return
    }
    if ((mode === 'edit' || mode === 'password' || mode === 'impersonate') && persona) {
      setForm(formFromPersona(persona))
      setPhotoFile(null)
      setPhotoPreview(resolveFileUrl(persona.foto_url))
      setRemovePhoto(false)
    }
    setPassword('')
    setPasswordConfirmation('')
    setFieldErrors({})
  }, [mode, persona])

  useEffect(() => {
    if ((mode !== 'edit' && mode !== 'impersonate') || !persona?.id) return
    let cancelled = false
    personasApi
      .show(persona.id)
      .then((next) => {
        if (cancelled) return
        setForm(formFromPersona(next))
        setPhotoPreview(resolveFileUrl(next.foto_url))
      })
      .catch(() => {
        // El formulario ya tiene los datos de la fila.
      })
    return () => {
      cancelled = true
    }
  }, [mode, persona?.id])

  const drawerTitle =
    mode === 'edit'
      ? 'Editar integrante'
      : mode === 'password'
        ? 'Cambiar contraseña'
        : mode === 'impersonate'
          ? 'Entrar como usuario'
          : 'Crear integrante'

  function closeAndReset() {
    setForm(emptyForm())
    setPassword('')
    setPasswordConfirmation('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setRemovePhoto(false)
    setFieldErrors({})
    setSubmitting(false)
    onClose()
  }

  async function applyPhoto(personaId: number, current: ClubPerson): Promise<ClubPerson> {
    if (!canManagePhotos) return current
    if (photoFile) {
      return personasApi.uploadFoto(personaId, photoFile)
    }
    if (removePhoto && current.foto_url) {
      return personasApi.deleteFoto(personaId)
    }
    return current
  }

  async function onSaveMember(event: FormEvent) {
    event.preventDefault()
    if (mode === 'create' && !canCreate) return
    if (mode === 'edit' && !canUpdate) return
    const nextErrors = validateMemberIdentity(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      notices.warning(Object.values(nextErrors).join(' '))
      onError?.(Object.values(nextErrors).join(' '))
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'edit' && persona) {
        let next = await personasApi.update(persona.id, personaPayload(form))
        next = await applyPhoto(persona.id, next)
        notices.success('Integrante actualizado.')
        onNotice?.('Integrante actualizado.')
        onUpdated?.(next)
      } else {
        let next = await personasApi.create({
          ...personaPayload(form),
          solo_tipo_club: true,
          organizacion_ids: access.organizacionId ? [access.organizacionId] : undefined,
        })
        next = await applyPhoto(next.id, next)
        notices.success('Integrante creado.')
        onNotice?.('Integrante creado.')
        onCreated?.(next)
      }
      closeAndReset()
    } catch (err) {
      setFieldErrors(fieldErrorsFromApi(err))
      const message = getApiErrorMessage(
        err,
        mode === 'edit' ? 'No se pudo actualizar el integrante' : 'No se pudo crear el integrante',
      )
      notices.error(message)
      onError?.(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSavePassword(event: FormEvent) {
    event.preventDefault()
    if (!persona || !canUpdate) return
    if (password !== passwordConfirmation) {
      notices.warning('Las contraseñas no coinciden.')
      onError?.('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      await personasApi.updatePassword(persona.id, {
        password,
        password_confirmation: passwordConfirmation,
      })
      notices.success(`Contraseña actualizada para ${persona.full_name}.`)
      onNotice?.(`Contraseña actualizada para ${persona.full_name}.`)
      closeAndReset()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'))
      onError?.(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onImpersonate() {
    const userId = persona ? memberUserId(persona) : null
    if (!userId || !canImpersonate) return
    setSubmitting(true)
    try {
      await auth.impersonate(userId)
      closeAndReset()
      navigate('/')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo entrar como este usuario'))
      onError?.(getApiErrorMessage(err, 'No se pudo entrar como este usuario'))
      setSubmitting(false)
    }
  }

  return (
    <CreateDrawer
      open={mode !== null}
      title={drawerTitle}
      onClose={closeAndReset}
      footer={
        mode === 'impersonate' ? (
          <button
            type="button"
            className="app-panel__btn--primary"
            disabled={submitting}
            onClick={() => void onImpersonate()}
          >
            {submitting ? 'Entrando…' : 'Entrar como este usuario'}
          </button>
        ) : mode === 'password' ? (
          <button type="submit" form="member-password-form" className="app-panel__btn--primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        ) : (
          <button type="submit" form="member-form" className="app-panel__btn--primary" disabled={submitting}>
            {submitting ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar integrante'}
          </button>
        )
      }
    >
      {mode === 'impersonate' && persona ? (
        <div className="admin-form admin-member-impersonate">
          <span className="admin-member-impersonate__photo" aria-hidden="true">
            {photoPreview ? (
              <img src={photoPreview} alt="" />
            ) : (
              <span>{personaInitials(persona.full_name)}</span>
            )}
          </span>
          <p className="app-panel__subtitle">
            Vas a usar la cuenta de <strong>{persona.full_name}</strong>
            {persona.correo ? ` (${persona.correo})` : ''}. Luego podrás volver a tu usuario desde la
            barra superior.
          </p>
        </div>
      ) : null}

      {mode === 'password' && persona ? (
        <form id="member-password-form" className="admin-form admin-form--compact" onSubmit={onSavePassword}>
          <p className="app-panel__subtitle">
            Nueva contraseña para {persona.full_name}. Mínimo 6 caracteres, una mayúscula y un
            símbolo.
          </p>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              required
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirmar contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              required
              minLength={6}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
            />
          </label>
        </form>
      ) : null}

      {mode === 'create' || mode === 'edit' ? (
        <form id="member-form" className="admin-form" onSubmit={onSaveMember}>
          {canManagePhotos ? (
            <ImageUpload
              label="Foto del usuario"
              hint="JPG, PNG o WebP. Se ve en el menú y en el club."
              variant="avatar"
              file={photoFile}
              previewUrl={removePhoto ? null : photoPreview}
              emptyText="Sin foto"
              onSelect={(next) => {
                setRemovePhoto(false)
                setPhotoFile(next)
              }}
              onClear={
                photoFile || photoPreview || persona?.foto_url
                  ? () => {
                      setPhotoFile(null)
                      setPhotoPreview(null)
                      setRemovePhoto(true)
                    }
                  : undefined
              }
            />
          ) : null}
          <label>
            Primer nombre
            <input
              value={form.nombre1}
              required
              maxLength={100}
              onChange={(event) => setForm((current) => ({ ...current, nombre1: event.target.value }))}
            />
          </label>
          <label>
            Segundo nombre
            <input
              value={form.nombre2}
              maxLength={100}
              onChange={(event) => setForm((current) => ({ ...current, nombre2: event.target.value }))}
            />
          </label>
          <label>
            Primer apellido
            <input
              value={form.apellido1}
              required
              maxLength={100}
              onChange={(event) => setForm((current) => ({ ...current, apellido1: event.target.value }))}
            />
          </label>
          <label>
            Segundo apellido
            <input
              value={form.apellido2}
              maxLength={100}
              onChange={(event) => setForm((current) => ({ ...current, apellido2: event.target.value }))}
            />
          </label>
          <label>
            Tipo de identificación
            <select
              value={form.tipo_identificacion}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tipo_identificacion: event.target.value as PersonaIdType,
                }))
              }
            >
              <option value="CC">Cédula</option>
              <option value="TI">Tarjeta de identidad</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </label>
          <label>
            Identificación
            <input
              value={form.identificacion}
              required
              minLength={5}
              maxLength={50}
              pattern="[A-Za-z0-9.\-]+"
              title="Solo letras, números, punto o guion"
              aria-invalid={Boolean(fieldErrors.identificacion)}
              onChange={(event) => {
                setFieldErrors((current) => ({ ...current, identificacion: '' }))
                setForm((current) => ({ ...current, identificacion: event.target.value }))
              }}
            />
            {fieldErrors.identificacion ? (
              <p className="app-panel__alert" role="alert">
                {fieldErrors.identificacion}
              </p>
            ) : null}
          </label>
          <label>
            Fecha de nacimiento
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(event) =>
                setForm((current) => ({ ...current, fecha_nacimiento: event.target.value }))
              }
            />
          </label>
          <label>
            Sexo
            <select
              value={form.sexo}
              onChange={(event) =>
                setForm((current) => ({ ...current, sexo: event.target.value as 'M' | 'F' | '' }))
              }
            >
              <option value="">Sin indicar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </label>
          <label>
            Teléfono
            <input
              value={form.telefono}
              maxLength={40}
              onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.correo}
              maxLength={255}
              aria-invalid={Boolean(fieldErrors.correo)}
              onChange={(event) => {
                setFieldErrors((current) => ({ ...current, correo: '' }))
                setForm((current) => ({ ...current, correo: event.target.value }))
              }}
            />
            {fieldErrors.correo ? (
              <p className="app-panel__alert" role="alert">
                {fieldErrors.correo}
              </p>
            ) : null}
          </label>
        </form>
      ) : null}
    </CreateDrawer>
  )
}
