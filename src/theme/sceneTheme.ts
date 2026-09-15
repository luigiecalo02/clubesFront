import { useCallback, useEffect, useState } from 'react'

export type SceneTheme = 'night' | 'day'

const STORAGE_KEY = 'clubes_scene_theme'
const THEME_EVENT = 'clubes-scene-theme'

function readTheme(): SceneTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'day' ? 'day' : 'night'
  } catch {
    return 'night'
  }
}

export function applySceneTheme(theme: SceneTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new CustomEvent<SceneTheme>(THEME_EVENT, { detail: theme }))
}

export function useSceneTheme() {
  const [theme, setThemeState] = useState<SceneTheme>(readTheme)

  const setTheme = useCallback((next: SceneTheme) => {
    setThemeState(next)
    applySceneTheme(next)
  }, [])

  useEffect(() => {
    function onTheme(event: Event) {
      const next = (event as CustomEvent<SceneTheme>).detail
      if (next === 'day' || next === 'night') {
        setThemeState(next)
      }
    }
    window.addEventListener(THEME_EVENT, onTheme)
    return () => window.removeEventListener(THEME_EVENT, onTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'night' ? 'day' : 'night')
  }, [setTheme, theme])

  return {
    theme,
    isDay: theme === 'day',
    setTheme,
    toggleTheme,
  }
}
