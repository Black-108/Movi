import { useEffect, useRef } from 'react'
import { NATIVE_BANNER } from '../config/ads'

let injected = false

export function AdNativeBanner({ className = '' }) {
  const divRef = useRef(null)

  useEffect(() => {
    if (!NATIVE_BANNER.src || injected) return
    injected = true

    const s = document.createElement('script')
    s.async = true
    s.setAttribute('data-cfasync', 'false')
    s.src = NATIVE_BANNER.src
    document.head.appendChild(s)
  }, [])

  if (!NATIVE_BANNER.src) return null

  return (
    <div className={`ad-native ${className}`}>
      <div id={NATIVE_BANNER.containerId} ref={divRef} />
    </div>
  )
}
