import { useEffect, useState } from 'react'
import portraitFUrl from '../assets/sprites/f_portrait.png'
import portraitUrl from '../assets/sprites/s_portrait.png'
import { applyAppearance } from '../game/appearance'
import type { PlayerAppearance } from '../state/save'

/**
 * Retrato do SEU craque como URL pronta para <img>: a arte base recolorida
 * com a aparência escolhida no Perfil. Recalcula só quando a aparência muda.
 */
export const usePlayerPortrait = (appearance: PlayerAppearance): string | null => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const holder = { img, w: img.naturalWidth, h: img.naturalHeight }
      const recolored = applyAppearance(holder, appearance)
      const source = recolored?.img
      if (source instanceof HTMLCanvasElement) {
        setUrl(source.toDataURL())
        return
      }
      // sem recoloração a arte original já serve
      setUrl(img.src)
    }
    img.onerror = () => {
      if (!cancelled) setUrl(null)
    }
    img.src = appearance.gender === 'feminino' ? portraitFUrl : portraitUrl
    return () => {
      cancelled = true
    }
  }, [appearance])

  return url
}
