import { useEffect, useRef, useState } from 'react'

export function reduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useTweenNumber(target: number, duration = 560): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    if (reduceMotion() || target === valueRef.current) {
      cancelAnimationFrame(rafRef.current)
      valueRef.current = target
      setValue(target)
      return undefined
    }

    const from = valueRef.current
    const start = performance.now()
    const ease = (progress: number) => 1 - (1 - progress) ** 3

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const next = from + (target - from) * ease(progress)
      valueRef.current = next
      setValue(next)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration, target])

  return value
}
