import { useEffect, useRef } from 'react'
import { AD_SLOTS } from '../config/ads'

// Returns true when viewport width ≤ 728 px (i.e. phone / small tablet)
function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 728
}

/**
 * Adsterra banner ad slot.
 *
 * Props:
 *   slot      — key from AD_SLOTS in src/config/ads.js  (required)
 *   className — extra CSS class(es) on the wrapper div
 *
 * To activate: fill in the `key` for this slot in src/config/ads.js
 */
export function AdSlot({ slot, className = '' }) {
  const container = useRef(null)
  const cfg = AD_SLOTS[slot]

  // Pick desktop or mobile size
  const mobile = isMobile()
  const width  = (mobile && cfg?.mw) ? cfg.mw : cfg?.w ?? 728
  const height = (mobile && cfg?.mh) ? cfg.mh : cfg?.h ?? 90
  const key    = cfg?.key ?? ''

  useEffect(() => {
    if (!key || !container.current) return

    // Clear any previous render (React StrictMode / hot-reload safety)
    container.current.innerHTML = ''

    // 1. Inject atOptions config
    const optScript = document.createElement('script')
    optScript.type = 'text/javascript'
    optScript.text = `atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`
    container.current.appendChild(optScript)

    // 2. Inject Adsterra invoke.js loader
    const loaderScript = document.createElement('script')
    loaderScript.type = 'text/javascript'
    loaderScript.src  = `//www.highperformanceformat.com/${key}/invoke.js`
    container.current.appendChild(loaderScript)

    return () => {
      if (container.current) container.current.innerHTML = ''
    }
  }, [key, width, height])

  // No key configured — show a placeholder so layout is preserved
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
