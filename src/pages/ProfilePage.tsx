import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { resolveFileUrl } from '../api/baseUrl'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import type { PersonaIdType } from '../api/types'
import { usersApi } from '../api/users'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { ImageUpload } from '../theme/ImageUpload'
import { useNotice } from '../theme/NoticeProvider'

type ProfileForm = {
  tipo_identificacion: PersonaIdType
  identificacion: string
  nombre1: string
  nombre2: string
  apellido1: string
  apellido2: string
  fecha_nacimiento: string
  sexo: 'M' | 'F' | ''
  telefono: string
  correo: string
}

const emptyForm = (): ProfileForm => ({
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

function fieldErrorsFromApi(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const raw = (error.response?.data as { errors?: Record<string, string[] | string> } | undefined)?.errors
  if (!raw) return {}
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const message = Array.isArray(value) ? value[0] : value
    if (message) next[key.replace(/^persona\./, '')] = String(message)
  }
  return next
}

export function ProfilePage() {
  const auth = useAuth()
  const user = auth.user
  const [form, setForm] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const notices = useNotice()

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    usersApi
      .show(user.id)
      .then((profile) => {
        if (cancelled) return
        const persona = profile.persona
        const tipo = (persona?.tipo_identificacion ?? 'CC').toUpperCase()
        setForm({
          tipo_identificacion: tipo === 'TI' || tipo === 'CE' || tipo === 'PA' ? tipo : 'CC',
          identificacion: persona?.identificacion ?? '',
          nombre1: persona?.nombre1 ?? '',
          nombre2: persona?.nombre2 ?? '',
          apellido1: persona?.apellido1 ?? '',
          apellido2: persona?.apellido2 ?? '',
          fecha_nacimiento: (persona?.fecha_nacimiento ?? '').slice(0, 10),
          sexo: persona?.sexo === 'M' || persona?.sexo === 'F' ? persona.sexo : '',
          telefono: persona?.telefono ?? '',
          correo: persona?.correo ?? profile.email ?? '',
        })
        setPhotoPreview(resolveFileUrl(profile.avatar_url))
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar tu perfil'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!user) return null

  const userId = user.id
  const currentName = user.name
  const currentEmail = user.email

  async function refreshSession() {
    auth.applyUser(await authApi.me())
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    setSavingProfile(true)
    try {
      const nombre = [form.nombre1.trim(), form.apellido1.trim()].filter(Boolean).join(' ')
      await usersApi.update(userId, {
        name: nombre || currentName,
        email: form.correo.trim().toLowerCase() || currentEmail,
        persona: {
          tipo_identificacion: form.tipo_identificacion,
          identificacion: form.identificacion.trim(),
          nombre1: form.nombre1.trim(),
          nombre2: form.nombre2.trim(),
          apellido1: form.apellido1.trim(),
          apellido2: form.apellido2.trim(),
          telefono: form.telefono.trim(),
          correo: form.correo.trim().toLowerCase(),
          fecha_nacimiento: form.fecha_nacimiento,
          sexo: form.sexo,
        },
      })
      if (photoFile) {
        const uploaded = await usersApi.uploadAvatar(userId, photoFile)
        setPhotoFile(null)
        setPhotoPreview(resolveFileUrl(uploaded.avatar_url))
      }
      await refreshSession()
      notices.success('Tus datos se actualizaron.')
    } catch (err) {
      setFieldErrors(fieldErrorsFromApi(err))
      notices.error(getApiErrorMessage(err, 'No se pudieron guardar tus datos'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function onSavePassword(event: FormEvent) {
    event.preventDefault()
    if (password !== passwordConfirmation) {
      notices.warning('Las contraseñas no coinciden.')
      return
    }
    setSavingPassword(true)
    try {
      await usersApi.update(userId, {
        password,
        password_confirmation: passwordConfirmation,
      })
      setPassword('')
      setPasswordConfirmation('')
      notices.success('Tu contraseña se actualizó.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <section className="admin-page admin-profile">
      <AppPanel>
        <p className="app-panel__kicker">Cuenta</p>
        <h2 className="app-panel__title">Mis datos</h2>
        <p className="app-panel__subtitle">Actualiza tu ficha. Estos datos se usan en el club y en tu sesión.</p>
        {loading ? <p className="app-panel__muted">Cargando tu perfil…</p> : null}
        <form className="admin-form admin-profile__fields" onSubmit={(event) => void onSaveProfile(event)}>
          <ImageUpload
            label="Foto"
            hint="Se muestra en tu menú de cuenta. JPG, PNG o WebP."
            variant="avatar"
            file={photoFile}
            previewUrl={photoPreview}
            emptyText="Sin foto"
            onSelect={setPhotoFile}
          />
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
              maxLength={50}
              onChange={(event) => setForm((current) => ({ ...current, identificacion: event.target.value }))}
            />
            {fieldErrors.identificacion ? <small>{fieldErrors.identificacion}</small> : null}
          </label>
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
            Fecha de nacimiento
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(event) => setForm((current) => ({ ...current, fecha_nacimiento: event.target.value }))}
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
              required
              maxLength={255}
              onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
            />
            {fieldErrors.correo ? <small>{fieldErrors.correo}</small> : null}
          </label>
          <div className="admin-profile__full admin-form__actions">
            <button type="submit" className="app-panel__btn--primary" disabled={savingProfile || loading}>
              {savingProfile ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>
        </form>
      </AppPanel>

      <AppPanel>
        <p className="app-panel__kicker">Seguridad</p>
        <h2 className="app-panel__title">Cambiar contraseña</h2>
        <p className="app-panel__subtitle">Mínimo 6 caracteres, una mayúscula y un símbolo.</p>
        <form className="admin-form" onSubmit={(event) => void onSavePassword(event)}>
          <label>
            Nueva contraseña
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
          <div className="admin-form__actions">
            <button type="submit" className="app-panel__btn--primary" disabled={savingPassword}>
              {savingPassword ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </AppPanel>
    </section>
  )
}
