import { useEffect, useRef } from 'react'
import { AD_SLOTS, AD_CDN } from '../config/ads'

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 728
}

export function AdSlot({ slot, className = '' }) {
  const container = useRef(null)
  const cfg = AD_SLOTS[slot]

  const mobile = isMobile()
  // Use mobile key+size when on phone AND the slot has a mobile variant
  const key    = (mobile && cfg?.mkey) ? cfg.mkey : cfg?.key ?? ''
  const width  = (mobile && cfg?.mw)   ? cfg.mw   : cfg?.w ?? 728
  const height = (mobile && cfg?.mh)   ? cfg.mh   : cfg?.h ?? 90

  useEffect(() => {
    if (!key || !container.current) return
    container.current.innerHTML = ''

    const optScript = document.createElement('script')
    optScript.type = 'text/javascript'
    optScript.text = `atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`
    container.current.appendChild(optScript)

    const loaderScript = document.createElement('script')
    loaderScript.type = 'text/javascript'
    loaderScript.src  = `//${AD_CDN}/${key}/invoke.js`
    container.current.appendChild(loaderScript)

    return () => { if (container.current) container.current.innerHTML = '' }
  }, [key, width, height])

  if (!key) {
    return (
      <div
        className={`ad-placeholder ${className}`}
        style={{ width, height, boxSizing: 'border-box' }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      ref={container}
      className={`ad-slot ${className}`}
      style={{ width, height, overflow: 'hidden', display: 'block' }}
    />
  )
}
