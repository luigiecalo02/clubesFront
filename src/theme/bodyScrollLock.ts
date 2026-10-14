let locks = 0
let lastTouchY = 0

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

function drawerScroller(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const node = target.closest('.create-drawer__body, .image-crop, .admin-calendar-pick__list')
  return node instanceof HTMLElement ? node : null
}

function scrollInside(scroller: HTMLElement, delta: number) {
  const max = scroller.scrollHeight - scroller.clientHeight
  if (max <= 0) return
  scroller.scrollTop = Math.max(0, Math.min(max, scroller.scrollTop + delta))
}

function onWheel(event: WheelEvent) {
  const scroller = drawerScroller(event.target)
  if (scroller) scrollInside(scroller, event.deltaY)
  event.preventDefault()
}

function onTouchStart(event: TouchEvent) {
  lastTouchY = event.touches[0]?.clientY ?? 0
}

function onTouchMove(event: TouchEvent) {
  const y = event.touches[0]?.clientY ?? lastTouchY
  const delta = lastTouchY - y
  lastTouchY = y
  const scroller = drawerScroller(event.target)
  if (scroller) scrollInside(scroller, delta)
  event.preventDefault()
}

function onKeyDown(event: KeyboardEvent) {
  if (!SCROLL_KEYS.has(event.key)) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select'))
  ) {
    return
  }
  const scroller = drawerScroller(event.target)
  if (scroller) {
    const step = event.key === 'PageDown' || event.key === 'PageUp' ? scroller.clientHeight : 48
    const down = event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'End' || event.key === ' '
    if (event.key === 'Home') scroller.scrollTop = 0
    else if (event.key === 'End') scroller.scrollTop = scroller.scrollHeight
    else scrollInside(scroller, down ? step : -step)
  }
  event.preventDefault()
}

export function lockBodyScroll() {
  if (locks === 0) {
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
  }
  locks += 1
}

export function unlockBodyScroll() {
  locks = Math.max(0, locks - 1)
  if (locks > 0) return
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('keydown', onKeyDown)
}
