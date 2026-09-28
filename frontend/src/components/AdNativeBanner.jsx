import { useEffect, useRef } from 'react'
import { NATIVE_BANNER } from '../config/ads'

export function AdNativeBanner({ className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !NATIVE_BANNER.src) return
    if (document.querySelector(`script[src="${NATIVE_BANNER.src}"]`)) return

    const s = document.createElement('script')
    s.async = true
    s.setAttribute('data-cfasync', 'false')
    s.src = NATIVE_BANNER.src
    ref.current.appendChild(s)

    return () => { if (s.parentNode) s.parentNode.removeChild(s) }
  }, [])

  if (!NATIVE_BANNER.src) return null

  return (
    <div className={`ad-native ${className}`}>
      <div id={NATIVE_BANNER.containerId} ref={ref} />
    </div>
  )
}
