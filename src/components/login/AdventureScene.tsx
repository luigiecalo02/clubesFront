import { useEffect, useRef, type ReactNode } from 'react'
import type { SceneTheme } from '../../theme/sceneTheme'
import { backgroundStyleCss, type ClubesBackgroundStyle } from '../../theme/backgroundStyle'
import { AnimatedSky } from './AnimatedSky'
import { Birds } from './Birds'
import { Campfire } from './Campfire'
import { Flags } from './Flags'
import { Fog } from './Fog'
import { Forest } from './Forest'
import { Moon } from './Moon'
import { Mountains } from './Mountains'
import { Particles } from './Particles'
import { Squirrel } from './Squirrel'
import { Stars } from './Stars'
import { Tent } from './Tent'
import { Sun } from './Sun'
import './login-scene.css'

type AdventureSceneCopy = {
  values: string
  motto: string
}

type AdventureSceneProps = {
  theme: SceneTheme
  variant?: 'page' | 'backdrop'
  showCopy?: boolean
  copy?: AdventureSceneCopy
  backgroundUrl?: string | null
  backgroundStyle?: ClubesBackgroundStyle | null
  children?: ReactNode
}

const DEFAULT_COPY: AdventureSceneCopy = {
  values: 'Disciplina · Servicio · Amor',
  motto: 'Una misión, un propósito',
}

export function AdventureScene({
  theme,
  variant = 'page',
  showCopy = false,
  copy = DEFAULT_COPY,
  backgroundUrl,
  backgroundStyle,
  children,
}: AdventureSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const isDay = theme === 'day'

  useEffect(() => {
    const root = sceneRef.current
    if (!root) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)')
    if (reduced.matches) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2
        const y = (event.clientY / window.innerHeight - 0.5) * 2
        root.style.setProperty('--px', x.toFixed(3))
        root.style.setProperty('--py', y.toFixed(3))
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const classes = [
    'login-scene',
    isDay ? 'login-scene--day' : 'login-scene--night',
    variant === 'backdrop' ? 'login-scene--backdrop' : '',
    variant === 'backdrop' ? 'login-scene--static' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const photo = Boolean(backgroundUrl)

  return (
    <div className={classes} ref={sceneRef} data-theme={theme}>
      {photo ? (
        <div
          className="login-scene__photo"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            ...backgroundStyleCss(backgroundStyle),
          }}
          aria-hidden="true"
        />
      ) : (
        <>
          <AnimatedSky />
          {isDay ? <Sun /> : <Stars />}
          {isDay ? <Birds /> : null}
          {isDay ? null : <Moon />}
          <Mountains />
          <Forest />
          <Fog />
          <Flags />
          <div className="login-scene__ground" aria-hidden="true" />
          <Tent />
          {isDay ? <Squirrel /> : null}
          {isDay ? null : <Campfire />}
          {isDay ? null : <Particles />}
        </>
      )}

      {showCopy ? (
        <div className="login-scene__copy">
          <p>{copy.values}</p>
          <h2>{copy.motto}</h2>
        </div>
      ) : null}

      {children}
    </div>
  )
}
