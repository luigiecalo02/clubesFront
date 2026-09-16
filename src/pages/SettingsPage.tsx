import { useEffect, useState, type FormEvent } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import { isClubDirectorRole } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { ImageUpload, type ImageUploadVariant } from '../theme/ImageUpload'
import { BackgroundStylePicker } from '../theme/BackgroundStylePicker'
import { parseBackgroundStyle } from '../theme/backgroundStyle'
import { useNotice } from '../theme/NoticeProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'
import type { ClubesAppConfig, ClubesAssetKey, ClubesBackgroundStyle, MailSettings } from '../api/types'

type ClubesTextConfig = Omit<
  ClubesAppConfig,
  'source' | 'logo_url' | 'background_url' | 'banner_url' | 'background_night_url' | 'background_day_url'
>

const DEFAULT_PRIMARY = '#f0c14b'
const DEFAULT_SECONDARY = '#c4921a'

const INITIAL_MAIL: Omit<MailSettings, 'password_set' | 'configured'> = {
  host: '',
  port: 587,
  encryption: 'tls',
  username: '',
  from_address: '',
  from_name: '',
  password: '',
}

const INITIAL: ClubesTextConfig = {
  scene_theme: 'night',
  kicker: 'Club de Conquistadores',
  title: 'CONQUISTADORES',
  subtitle: 'Conectados con la misión',
  motto: 'Una misión, un propósito',
  values: 'Disciplina · Servicio · Amor',
  color_principal: DEFAULT_PRIMARY,
  color_secundario: DEFAULT_SECONDARY,
  background_style: 'cover',
  background_night_style: 'cover',
  background_day_style: 'cover',
}

function pickerValue(value?: string | null, fallback = DEFAULT_PRIMARY): string {
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback
}

function assetUrl(
  clubes: ClubesAppConfig | undefined,
  key: ClubesAssetKey,
): string | null | undefined {
  if (!clubes) return null
  if (key === 'logo') return clubes.logo_url
  if (key === 'background') return clubes.background_url
  if (key === 'banner') return clubes.banner_url
  if (key === 'background_night') return clubes.background_night_url
  return clubes.background_day_url
}

type ClubAssetItem = {
  key: ClubesAssetKey
  label: string
  hint: string
}

const CLUB_ASSETS: ClubAssetItem[] = [
  { key: 'logo', label: 'Logo del inicio', hint: 'Así se ve el emblema en la tarjeta de login. JPG, PNG o WebP.' },
  { key: 'background', label: 'Fondo del login', hint: 'Sustituye la escena ilustrada del inicio de sesión. JPG, PNG o WebP.' },
  { key: 'banner', label: 'Banner principal', hint: 'Opcional. Aparece en el inicio del panel si lo cargas.' },
]

const APP_BACKGROUNDS: ClubAssetItem[] = [
  { key: 'background_night', label: 'Fondo oscuro', hint: 'Panel en modo noche. Si la cargas, se omiten las animaciones y la app arranca más ligera.' },
  { key: 'background_day', label: 'Fondo claro', hint: 'Panel en modo día. Si la cargas, se omiten las animaciones y la app arranca más ligera.' },
]

type SettingsTab = 'apariencia' | 'imagenes' | 'correo'

function assetVariant(key: ClubesAssetKey): ImageUploadVariant {
  return key === 'logo' ? 'logo' : 'banner'
}

function backgroundStyleKey(
  key: ClubesAssetKey,
): 'background_night_style' | 'background_day_style' | null {
  if (key === 'background_night') return 'background_night_style'
  if (key === 'background_day') return 'background_day_style'
  return null
}

function ClubAssetFields({
  assets,
  clubes,
  canUpdate,
  onUpload,
  onReset,
  onStyle,
}: {
  assets: ClubAssetItem[]
  clubes: ClubesAppConfig | undefined
  canUpdate: boolean
  onUpload: (key: ClubesAssetKey, file: File) => void
  onReset: (key: ClubesAssetKey) => void
  onStyle?: (key: ClubesAssetKey, style: ClubesBackgroundStyle) => void
}) {
  return (
    <div className="admin-assets">
      {assets.map((asset) => {
        const url = resolveFileUrl(assetUrl(clubes, asset.key))
        const styleField = backgroundStyleKey(asset.key)
        return (
          <div key={asset.key} className="admin-assets__item">
            <ImageUpload
              label={asset.label}
              hint={asset.hint}
              variant={assetVariant(asset.key)}
              previewUrl={url}
              emptyText="Sin imagen"
              disabled={!canUpdate}
              onSelect={(file) => onUpload(asset.key, file)}
              onClear={url ? () => onReset(asset.key) : undefined}
            />
            {styleField && onStyle ? (
              <BackgroundStylePicker
                value={clubes?.[styleField]}
                disabled={!canUpdate}
                onChange={(style) => onStyle(asset.key, style)}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function SettingsPage() {
  const auth = useAuth()
  const { settings, loading, update, uploadAsset, resetAsset } = useClubesSettings()
  const canUpdate =
    auth.can('settings.update') || isClubDirectorRole(auth.user?.contexto?.rol_name)
  const [form, setForm] = useState(INITIAL)
  const [mail, setMail] = useState(INITIAL_MAIL)
  const [mailSet, setMailSet] = useState(false)
  const [mailConfigured, setMailConfigured] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingMail, setSavingMail] = useState(false)
  const [testingMail, setTestingMail] = useState(false)
  const [showMailPassword, setShowMailPassword] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('apariencia')
  const notices = useNotice()

  useEffect(() => {
    if (!settings) return
    setForm({
      scene_theme: settings.clubes.scene_theme,
      kicker: settings.clubes.kicker,
      title: settings.clubes.title,
      subtitle: settings.clubes.subtitle,
      motto: settings.clubes.motto,
      values: settings.clubes.values,
      color_principal: settings.clubes.color_principal || auth.user?.contexto?.color_principal || DEFAULT_PRIMARY,
      color_secundario: settings.clubes.color_secundario || auth.user?.contexto?.color_secundario || DEFAULT_SECONDARY,
      background_style: parseBackgroundStyle(settings.clubes.background_style),
      background_night_style: parseBackgroundStyle(settings.clubes.background_night_style),
      background_day_style: parseBackgroundStyle(settings.clubes.background_day_style),
    })
  }, [auth.user?.contexto?.color_principal, auth.user?.contexto?.color_secundario, settings])

  useEffect(() => {
    let cancelled = false
    settingsApi
      .mail()
      .then((next) => {
        if (cancelled) return
        setMail({
          host: next.host,
          port: next.port || 587,
          encryption: next.encryption || 'tls',
          username: next.username,
          from_address: next.from_address,
          from_name: next.from_name,
          password: next.password || '',
        })
        setMailSet(next.password_set)
        setMailConfigured(next.configured)
      })
      .catch(() => {
        if (!cancelled) setMail(INITIAL_MAIL)
      })
    return () => {
      cancelled = true
    }
  }, [settings?.organizacion_id])

  async function onUpload(asset: ClubesAssetKey, file: File) {
    try {
      await uploadAsset(asset, file)
      notices.success('Imagen actualizada.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo subir la imagen'))
    }
  }

  async function onReset(asset: ClubesAssetKey) {
    try {
      await resetAsset(asset)
      notices.success('Imagen restaurada.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo quitar la imagen'))
    }
  }

  async function onBackgroundStyle(key: ClubesAssetKey, style: ClubesBackgroundStyle) {
    const field = backgroundStyleKey(key)
    if (!field || !canUpdate) return
    const next = { ...form, [field]: style }
    setForm(next)
    try {
      await update(next)
      notices.success('Estilo del fondo actualizado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar el estilo'))
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate) return
    setSubmitting(true)
    try {
      await update(form)
      notices.success('Configuración del club guardada.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la configuración'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onSaveMail(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate) return
    setSavingMail(true)
    try {
      const next = await settingsApi.updateMail(mail)
      setMail((current) => ({ ...current, password: next.password || current.password }))
      setMailSet(next.password_set)
      setMailConfigured(next.configured)
      notices.success('Correo de recuperación guardado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar el correo'))
    } finally {
      setSavingMail(false)
    }
  }

  async function onTestMail() {
    const to = mail.from_address.trim() || auth.user?.email
    if (!to) {
      notices.warning('Indica un correo remitente para enviar la prueba.')
      return
    }
    setTestingMail(true)
    try {
      await settingsApi.testMail(to)
      notices.success(`Correo de prueba enviado a ${to}.`)
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo enviar el correo de prueba'))
    } finally {
      setTestingMail(false)
    }
  }

  const orgName = settings?.organizacion_nombre || auth.user?.contexto?.organizacion_nombre || 'Plataforma'

  return (
    <section className="admin-page">
      <div className="admin-stats">
        <article>
          <small>Organización</small>
          <strong>{orgName}</strong>
        </article>
        <article>
          <small>Alcance</small>
          <strong>{settings?.is_platform ? 'Plataforma' : 'Club / organización'}</strong>
        </article>
        <article>
          <small>Estado</small>
          <strong>{settings?.initialized ? 'Preset inicial creado' : 'Configuración propia'}</strong>
        </article>
      </div>

      <div className="admin-event-tabs" role="tablist" aria-label="Secciones de configuración">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'apariencia'}
          className={`admin-events__view${tab === 'apariencia' ? ' is-on' : ''}`}
          onClick={() => setTab('apariencia')}
        >
          Apariencia
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'imagenes'}
          className={`admin-events__view${tab === 'imagenes' ? ' is-on' : ''}`}
          onClick={() => setTab('imagenes')}
        >
          Imágenes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'correo'}
          className={`admin-events__view${tab === 'correo' ? ' is-on' : ''}`}
          onClick={() => setTab('correo')}
        >
          Correo
        </button>
      </div>

      {tab === 'apariencia' ? (
      <form className="app-panel admin-panel admin-form" onSubmit={onSubmit}>
        <h3>Apariencia de este front</h3>
        {loading && !settings ? <p>Cargando configuración…</p> : null}

        <label className="admin-field">
          Tema inicial
          <select
            value={form.scene_theme}
            disabled={!canUpdate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                scene_theme: event.target.value === 'day' ? 'day' : 'night',
              }))
            }
          >
            <option value="night">Noche</option>
            <option value="day">Día</option>
          </select>
        </label>

        <label className="admin-field">
          Encabezado
          <input
            value={form.kicker}
            disabled={!canUpdate}
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, kicker: event.target.value }))}
          />
        </label>

        <label className="admin-field">
          Título
          <input
            value={form.title}
            disabled={!canUpdate}
            maxLength={80}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </label>

        <label className="admin-field">
          Subtítulo
          <input
            value={form.subtitle}
            disabled={!canUpdate}
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
          />
        </label>

        <label className="admin-field">
          Lema
          <input
            value={form.motto}
            disabled={!canUpdate}
            maxLength={120}
            onChange={(event) => setForm((current) => ({ ...current, motto: event.target.value }))}
          />
        </label>

        <label className="admin-field">
          Valores
          <input
            value={form.values}
            disabled={!canUpdate}
            maxLength={160}
            onChange={(event) => setForm((current) => ({ ...current, values: event.target.value }))}
          />
        </label>

        <h3>Colores del club</h3>
        <p className="admin-form__hint">Los botones del panel usan el color principal. Puedes elegir cualquiera.</p>
        <div className="admin-color-grid">
          <label className="admin-field">
            Color principal
            <div className="admin-color-field">
              <input
                type="color"
                disabled={!canUpdate}
                value={pickerValue(form.color_principal)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, color_principal: event.target.value }))
                }
              />
              <input
                value={form.color_principal ?? ''}
                disabled={!canUpdate}
                maxLength={7}
                placeholder="#f0c14b"
                onChange={(event) =>
                  setForm((current) => ({ ...current, color_principal: event.target.value }))
                }
              />
            </div>
          </label>
          <label className="admin-field">
            Color secundario
            <div className="admin-color-field">
              <input
                type="color"
                disabled={!canUpdate}
                value={pickerValue(form.color_secundario, DEFAULT_SECONDARY)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, color_secundario: event.target.value }))
                }
              />
              <input
                value={form.color_secundario ?? ''}
                disabled={!canUpdate}
                maxLength={7}
                placeholder="#c4921a"
                onChange={(event) =>
                  setForm((current) => ({ ...current, color_secundario: event.target.value }))
                }
              />
            </div>
          </label>
        </div>

        <div className="admin-form__actions">
          <button
            type="button"
            className="admin-ghost"
            disabled={!canUpdate}
            onClick={() => setForm(INITIAL)}
          >
            Restaurar preset
          </button>
          {canUpdate ? (
            <button type="submit" className="admin-form__submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          ) : (
            <p className="admin-form__hint">Tu rol puede ver esta configuración, pero no editarla.</p>
          )}
        </div>
      </form>
      ) : null}

      {tab === 'imagenes' ? (
        <div className="app-panel admin-panel admin-form">
          <h3>Imágenes del club</h3>
          <ClubAssetFields
            assets={CLUB_ASSETS}
            clubes={settings?.clubes ? { ...settings.clubes, ...form } : settings?.clubes}
            canUpdate={canUpdate}
            onUpload={(key, file) => void onUpload(key, file)}
            onReset={(key) => void onReset(key)}
          />

          <h3>Fondo de la aplicación</h3>
          <p className="app-panel__muted">
            Una foto por tema sustituye la escena animada. Elige si se cubre, se contiene, se mosaica o se apila; el recuadro y el panel muestran el resultado.
          </p>
          <ClubAssetFields
            assets={APP_BACKGROUNDS}
            clubes={settings?.clubes ? { ...settings.clubes, ...form } : settings?.clubes}
            canUpdate={canUpdate}
            onUpload={(key, file) => void onUpload(key, file)}
            onReset={(key) => void onReset(key)}
            onStyle={(key, style) => void onBackgroundStyle(key, style)}
          />
          {!canUpdate ? (
            <p className="admin-form__hint">Tu rol puede ver esta configuración, pero no editarla.</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'correo' ? (
      <form className="app-panel admin-panel admin-form" onSubmit={onSaveMail}>
        <h3>Correo para recuperar contraseñas</h3>
        <p className="admin-form__hint">
          Este SMTP envía el enlace de “olvidé mi contraseña” desde este front.
          {mailConfigured ? ' El correo ya está configurado.' : ' Aún no hay una cuenta lista.'}
        </p>
        <div className="app-panel__hint admin-mail-legend">
          <p>Cómo configurar un correo de Google (Gmail) para SMTP:</p>
          <ol>
            <li>Entra a tu cuenta de Google y activa la verificación en 2 pasos.</li>
            <li>
              Ve a <strong>Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones</strong>.
            </li>
            <li>Crea una contraseña de aplicación (16 letras). No uses la contraseña normal de Gmail.</li>
            <li>
              Completa así: servidor <strong>smtp.gmail.com</strong>, puerto <strong>587</strong>, cifrado{' '}
              <strong>TLS</strong>.
            </li>
            <li>Usuario y remitente: tu Gmail completo. Contraseña SMTP: la de 16 letras.</li>
          </ol>
        </div>

        <div className="admin-color-grid">
          <label className="admin-field">
            Servidor SMTP
            <input
              value={mail.host}
              disabled={!canUpdate}
              placeholder="smtp.gmail.com"
              onChange={(event) => setMail((current) => ({ ...current, host: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            Puerto
            <input
              type="number"
              min={1}
              max={65535}
              value={mail.port}
              disabled={!canUpdate}
              onChange={(event) =>
                setMail((current) => ({ ...current, port: Number(event.target.value) || 587 }))
              }
            />
          </label>
          <label className="admin-field">
            Cifrado
            <select
              value={mail.encryption}
              disabled={!canUpdate}
              onChange={(event) =>
                setMail((current) => ({
                  ...current,
                  encryption: event.target.value === 'ssl' || event.target.value === 'none'
                    ? event.target.value
                    : 'tls',
                }))
              }
            >
              <option value="tls">TLS</option>
              <option value="ssl">SSL</option>
              <option value="none">Ninguno</option>
            </select>
          </label>
          <label className="admin-field">
            Usuario
            <input
              value={mail.username}
              disabled={!canUpdate}
              autoComplete="off"
              onChange={(event) => setMail((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label className="admin-field">
            Contraseña SMTP
            <span className="app-panel__field admin-field__secret">
              <input
                type={showMailPassword ? 'text' : 'password'}
                value={mail.password}
                disabled={!canUpdate}
                autoComplete="new-password"
                placeholder={mailSet && !mail.password ? 'Hay una contraseña guardada' : 'Contraseña de la cuenta'}
                onChange={(event) => setMail((current) => ({ ...current, password: event.target.value }))}
              />
              <button
                type="button"
                className="app-panel__reveal"
                disabled={!canUpdate}
                onClick={() => setShowMailPassword((open) => !open)}
                aria-label={showMailPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showMailPassword ? 'Ocultar' : 'Ver'}
              </button>
            </span>
          </label>
          <label className="admin-field">
            Correo remitente
            <input
              type="email"
              value={mail.from_address}
              disabled={!canUpdate}
              placeholder="noreply@club.com"
              onChange={(event) =>
                setMail((current) => ({ ...current, from_address: event.target.value }))
              }
            />
          </label>
          <label className="admin-field">
            Nombre remitente
            <input
              value={mail.from_name}
              disabled={!canUpdate}
              placeholder="Clubes"
              onChange={(event) => setMail((current) => ({ ...current, from_name: event.target.value }))}
            />
          </label>
        </div>

        <div className="admin-form__actions">
          <button
            type="button"
            className="admin-ghost"
            disabled={!canUpdate || testingMail || !mailConfigured}
            onClick={() => void onTestMail()}
          >
            {testingMail ? 'Enviando…' : 'Enviar prueba'}
          </button>
          {canUpdate ? (
            <button type="submit" className="admin-form__submit" disabled={savingMail}>
              {savingMail ? 'Guardando…' : 'Guardar correo'}
            </button>
          ) : (
            <p className="admin-form__hint">Tu rol puede ver esta configuración, pero no editarla.</p>
          )}
        </div>
      </form>
      ) : null}
    </section>
  )
}
