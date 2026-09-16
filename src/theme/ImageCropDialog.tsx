import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSceneTheme } from './sceneTheme'
import { AppPanel } from './AppPanel'
import {
  clampOffset,
  containZoom,
  cropAndOptimize,
  displayedSize,
  prepareImageForCrop,
  releasePreparedImage,
  type PreparedCropImage,
} from './cropImage'
import './image-upload.css'

type ImageUploadVariant = 'avatar' | 'logo' | 'banner'

const ASPECT: Record<ImageUploadVariant, number> = {
  avatar: 1,
  logo: 1,
  banner: 16 / 7,
}

const OUTPUT: Record<ImageUploadVariant, { width: number; quality: number; maxBytes: number }> = {
  avatar: { width: 480, quality: 0.78, maxBytes: 120_000 },
  logo: { width: 512, quality: 0.82, maxBytes: 160_000 },
  banner: { width: 1600, quality: 0.72, maxBytes: 280_000 },
}

const CROP_COPY: Record<ImageUploadVariant, string> = {
  avatar: 'Arrastra para moverla. Aleja para verla entera o acerca para un recorte. Se comprime al guardar.',
  logo: 'Así queda el emblema del login. Arrastra y usa el tamaño para encuadrarlo. Se comprime al guardar.',
  banner: 'Arrastra para moverla. Aleja para verla entera o acerca para un recorte. Se comprime al guardar.',
}

type ImageCropDialogProps = {
  file: File
  variant: ImageUploadVariant
  onCancel: () => void
  onConfirm: (file: File) => void
}

export function ImageCropDialog({ file, variant, onCancel, onConfirm }: ImageCropDialogProps) {
  const { theme } = useSceneTheme()
  const aspect = ASPECT[variant]
  const stageRef = useRef<HTMLDivElement>(null)
  const preparedRef = useRef<PreparedCropImage | null>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ width: 280, height: 280 / aspect })

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError('')
    setPreviewUrl('')
    void prepareImageForCrop(file)
      .then((prepared) => {
        if (cancelled) {
          releasePreparedImage(prepared)
          return
        }
        preparedRef.current = prepared
        setNatural({ width: prepared.width, height: prepared.height })
        setPreviewUrl(prepared.previewUrl)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo leer la imagen.')
      })
    return () => {
      cancelled = true
      releasePreparedImage(preparedRef.current)
      preparedRef.current = null
    }
  }, [file])

  useEffect(() => {
    function measure() {
      const node = stageRef.current
      if (!node) return
      const width = node.clientWidth
      if (width <= 0) return
      setViewport({ width, height: width / aspect })
    }
    measure()
    const frame = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [aspect, ready, previewUrl])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onCancel()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onCancel, saving])

  const minZoom = containZoom(natural.width, natural.height, viewport.width, viewport.height)
  const display = displayedSize(natural.width, natural.height, viewport.width, viewport.height, zoom)
  const imageStyle = {
    width: `${display.width}px`,
    height: `${display.height}px`,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
  }

  function confine(nextZoom: number, nextX: number, nextY: number) {
    const size = displayedSize(natural.width, natural.height, viewport.width, viewport.height, nextZoom)
    return clampOffset(nextX, nextY, size.width, size.height, viewport.width, viewport.height)
  }

  function changeZoom(nextZoom: number) {
    const clampedZoom = Math.min(3, Math.max(minZoom, nextZoom))
    setZoom(clampedZoom)
    setOffset((current) => confine(clampedZoom, current.x, current.y))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!ready || saving) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const next = confine(
      zoom,
      drag.current.ox + (event.clientX - drag.current.x),
      drag.current.oy + (event.clientY - drag.current.y),
    )
    setOffset(next)
  }

  function endDrag() {
    drag.current = null
  }

  useEffect(() => {
    const node = stageRef.current
    if (!node) return undefined
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const delta = event.deltaY < 0 ? 0.12 : -0.12
      const nextZoom = Math.min(3, Math.max(minZoom, zoom + delta))
      setZoom(nextZoom)
      setOffset((offsetNow) => confine(nextZoom, offsetNow.x, offsetNow.y))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [minZoom, natural.height, natural.width, viewport.height, viewport.width, zoom])

  async function confirm() {
    const prepared = preparedRef.current
    if (!prepared || !ready) return
    setSaving(true)
    setError('')
    try {
      const base = file.name.replace(/\.[^.]+$/, '') || 'imagen'
      const cropped = await cropAndOptimize(
        prepared.bitmap,
        {
          offsetX: offset.x,
          offsetY: offset.y,
          zoom,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        },
        {
          outputWidth: OUTPUT[variant].width,
          mime: 'image/webp',
          quality: OUTPUT[variant].quality,
          maxBytes: OUTPUT[variant].maxBytes,
          fileName: `${base}-recorte`,
        },
      )
      onConfirm(cropped)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo recortar la imagen.')
      setSaving(false)
    }
  }

  return createPortal(
    <div className={`image-crop${theme === 'day' ? ' is-day' : ''}`} role="dialog" aria-modal="true" aria-label="Encuadrar imagen">
      <button
        type="button"
        className="image-crop__backdrop"
        aria-label="Cerrar"
        onClick={() => {
          if (!saving) onCancel()
        }}
      />
      <AppPanel className={`image-crop__panel${theme === 'day' ? ' is-day' : ''}`} shine={false} narrow>
        <p className="app-panel__kicker">Imagen</p>
        <h2 className="app-panel__title">Encuadra la imagen</h2>
        <p className="app-panel__subtitle">{CROP_COPY[variant]}</p>
        <div
          ref={stageRef}
          className={`image-crop__stage image-crop__stage--${variant}`}
          style={{ aspectRatio: `${aspect}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" draggable={false} className="image-crop__image" style={imageStyle} />
          ) : (
            <span className="image-crop__loading">Cargando foto…</span>
          )}
          <span className="image-crop__mask" aria-hidden="true" />
        </div>
        <label className="image-crop__zoom">
          Tamaño
          <input
            type="range"
            min={minZoom}
            max={3}
            step={0.01}
            value={zoom}
            disabled={!ready || saving}
            onChange={(event) => changeZoom(Number(event.target.value))}
          />
        </label>
        {error ? <p className="app-panel__alert">{error}</p> : null}
        <div className="image-crop__actions">
          <button type="button" className="app-panel__btn--ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="app-panel__btn--primary" onClick={() => void confirm()} disabled={!ready || saving}>
            {saving ? 'Optimizando…' : 'Usar recorte'}
          </button>
        </div>
      </AppPanel>
    </div>,
    document.body,
  )
}
