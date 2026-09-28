import { useEffect } from 'react'
import { SOCIAL_BAR_SRC } from '../config/ads'

export function AdSocialBar() {
  useEffect(() => {
    if (!SOCIAL_BAR_SRC) return
    if (document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`)) return

    const s = document.createElement('script')
    s.src   = SOCIAL_BAR_SRC
    document.head.appendChild(s)

    return () => { if (s.parentNode) s.parentNode.removeChild(s) }
  }, [])

  return null
}
