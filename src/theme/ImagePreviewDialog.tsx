import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AdminIcon } from '../admin/AdminIcon'
import { AppPanel } from './AppPanel'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock'

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const STEP = 0.5

type ImagePreviewDialogProps = {
  src: string
  alt: string
  onClose: () => void
}

type Size = { width: number; height: number }

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function fitSize(natural: Size, box: Size): Size {
  if (!natural.width || !natural.height || !box.width || !box.height) return { width: 0, height: 0 }
  const scale = Math.min(box.width / natural.width, box.height / natural.height, 1)
  return { width: natural.width * scale, height: natural.height * scale }
}

export function ImagePreviewDialog({ src, alt, onClose }: ImagePreviewDialogProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const [natural, setNatural] = useState<Size>({ width: 0, height: 0 })
  const [box, setBox] = useState<Size>({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const zoomRef = useRef(zoom)
  onCloseRef.current = onClose
  zoomRef.current = zoom

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockBodyScroll()
    }
  }, [])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return undefined
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const zoomAt = useCallback((next: number, clientX?: number, clientY?: number) => {
    const node = stageRef.current
    const previous = zoomRef.current
    const target = clampZoom(next)
    if (!node || target === previous) return
    const rect = node.getBoundingClientRect()
    const x = (clientX ?? rect.left + rect.width / 2) - rect.left
    const y = (clientY ?? rect.top + rect.height / 2) - rect.top
    const ratio = target / previous
    const left = (node.scrollLeft + x) * ratio - x
    const top = (node.scrollTop + y) * ratio - y
    zoomRef.current = target
    setZoom(target)
    requestAnimationFrame(() => {
      node.scrollLeft = left
      node.scrollTop = top
    })
  }, [])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return undefined
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        zoomAt(zoomRef.current * (event.deltaY < 0 ? 1.15 : 1 / 1.15), event.clientX, event.clientY)
        return
      }
      node!.scrollLeft += event.deltaX
      node!.scrollTop += event.deltaY
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current }
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const last = pointers.current.get(event.pointerId)
    if (!last) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const node = event.currentTarget
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      zoomAt(pinch.current.zoom * (distance / Math.max(1, pinch.current.distance)), (a.x + b.x) / 2, (a.y + b.y) / 2)
      return
    }
    node.scrollLeft -= event.clientX - last.x
    node.scrollTop -= event.clientY - last.y
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const fitted = fitSize(natural, box)
  const imageStyle = fitted.width
    ? { width: `${fitted.width * zoom}px`, height: `${fitted.height * zoom}px` }
    : undefined

  return createPortal(
    <div className="image-preview" role="dialog" aria-modal="true" aria-label={alt}>
      <button type="button" className="image-preview__backdrop" aria-label="Cerrar" onClick={onClose} />
      <AppPanel className="image-preview__panel" shine={false}>
        <div className="image-preview__head">
          <p className="app-panel__kicker">Pantallazo</p>
          <div className="image-preview__zoom" role="group" aria-label="Zoom">
            <button type="button" aria-label="Alejar" disabled={zoom <= MIN_ZOOM} onClick={() => zoomAt(zoom - STEP)}>
              −
            </button>
            <button type="button" className="is-level" aria-label="Ajustar a la pantalla" onClick={() => zoomAt(MIN_ZOOM)}>
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" aria-label="Acercar" disabled={zoom >= MAX_ZOOM} onClick={() => zoomAt(zoom + STEP)}>
              +
            </button>
          </div>
          <button type="button" className="image-preview__close" aria-label="Cerrar" onClick={onClose}>
            <AdminIcon name="x" />
          </button>
        </div>
        <div
          ref={stageRef}
          className={`image-preview__stage${zoom > MIN_ZOOM ? ' is-zoomed' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={(event) => zoomAt(zoom > MIN_ZOOM ? MIN_ZOOM : 2.5, event.clientX, event.clientY)}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={imageStyle}
            onLoad={(event) =>
              setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
          />
        </div>
        <p className="image-preview__hint">Doble toque o pellizca para acercar. Arrastra para moverte.</p>
      </AppPanel>
    </div>,
    document.querySelector('.create-drawer') ?? document.body,
  )
}
