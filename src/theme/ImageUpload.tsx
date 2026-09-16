import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react'
import { ImageCropDialog } from './ImageCropDialog'
import './image-upload.css'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 8 * 1024 * 1024

export type ImageUploadVariant = 'avatar' | 'logo' | 'banner'

type ImageUploadProps = {
  label: string
  hint?: string
  variant?: ImageUploadVariant
  file?: File | null
  previewUrl?: string | null
  emptyText?: string
  disabled?: boolean
  onSelect: (file: File) => void
  onClear?: () => void
}

function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true
  return /\.(jpe?g|png|webp)$/i.test(file.name)
}

export function ImageUpload({
  label,
  hint,
  variant = 'logo',
  file = null,
  previewUrl = null,
  emptyText,
  disabled = false,
  onSelect,
  onClear,
}: ImageUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const localUrl = useObjectUrl(file)
  const shown = localUrl || previewUrl
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<File | null>(null)

  const empty = emptyText ?? (variant === 'avatar' ? 'Sin foto' : 'Sin imagen')
  const action = shown ? 'Cambiar' : 'Elegir imagen'

  function take(file: File | undefined | null) {
    if (!file || disabled) return
    if (!isAllowedImage(file)) {
      setError('Usa una imagen JPG, PNG o WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen no puede superar 8 MB. Al recortar se comprime sola.')
      return
    }
    setError('')
    setDraft(file)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setOver(false)
    take(event.dataTransfer.files?.[0] ?? null)
  }

  return (
    <div className={`image-upload image-upload--${variant}`}>
      <span className="image-upload__label">{label}</span>
      <label
        htmlFor={inputId}
        className={`image-upload__drop${over ? ' is-over' : ''}${shown ? ' has-file' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {shown ? (
          <img src={shown} alt="" className="image-upload__preview" />
        ) : (
          <span className="image-upload__empty">
            <svg className="image-upload__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2.2l.8-1.4A1 1 0 0 1 10.4 3h3.2a1 1 0 0 1 .9.6L15.3 5h2.2A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5zM12 16.2A4.2 4.2 0 1 0 12 7.8a4.2 4.2 0 0 0 0 8.4z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <strong>{empty}</strong>
            <em>Arrastra o haz clic</em>
          </span>
        )}
        {shown ? (
          <span className="image-upload__overlay">
            <strong>{action}</strong>
          </span>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files?.[0] ?? null)
            event.target.value = ''
          }}
        />
      </label>
      {hint ? <small className="image-upload__hint">{hint}</small> : null}
      {error ? (
        <small className="image-upload__error" role="alert">
          {error}
        </small>
      ) : null}
      {shown && onClear && !disabled ? (
        <button
          type="button"
          className="app-panel__btn--ghost image-upload__clear"
          onClick={() => {
            setError('')
            onClear()
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          Quitar
        </button>
      ) : null}
      {draft ? (
        <ImageCropDialog
          file={draft}
          variant={variant}
          onCancel={() => setDraft(null)}
          onConfirm={(cropped) => {
            setDraft(null)
            onSelect(cropped)
          }}
        />
      ) : null}
    </div>
  )
}
