let locks = 0
let previousBody = ''
let previousHtml = ''

export function lockBodyScroll() {
  if (locks === 0) {
    previousBody = document.body.style.overflow
    previousHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }
  locks += 1
}

export function unlockBodyScroll() {
  locks = Math.max(0, locks - 1)
  if (locks > 0) return
  document.body.style.overflow = previousBody
  document.documentElement.style.overflow = previousHtml
  previousBody = ''
  previousHtml = ''
}
