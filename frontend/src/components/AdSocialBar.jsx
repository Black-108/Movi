import { useEffect } from 'react'
import { SOCIAL_BAR_SRC } from '../config/ads'

/**
 * Adsterra Social Bar — injects the sticky floating ad bar once into <head>.
 * Place this component once in App.jsx or the root layout.
 * Activate by filling in SOCIAL_BAR_SRC in src/config/ads.js
 */
export function AdSocialBar() {
  useEffect(() => {
    if (!SOCIAL_BAR_SRC) return
    if (document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`)) return

    const s = document.createElement('script')
    s.type  = 'text/javascript'
    s.src   = SOCIAL_BAR_SRC
    document.head.appendChild(s)

    return () => {
      if (s.parentNode) s.parentNode.removeChild(s)
    }
  }, [])

  return null
}
