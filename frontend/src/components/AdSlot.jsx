import { useEffect, useRef, useState } from 'react'
import { AD_SLOTS, AD_CDN } from '../config/ads'

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 728
}

export function AdSlot({ slot, className = '' }) {
  const cfg    = AD_SLOTS[slot]
  const mobile = isMobile()
  const key    = (mobile && cfg?.mkey) ? cfg.mkey : cfg?.key ?? ''
  const width  = (mobile && cfg?.mw)   ? cfg.mw   : cfg?.w ?? 728
  const height = (mobile && cfg?.mh)   ? cfg.mh   : cfg?.h ?? 90

  const containerRef = useRef(null)
  const [inView, setInView]   = useState(false)
  const [hidden, setHidden]   = useState(false)

  // Only inject the ad iframe when the slot is about to scroll into view
  useEffect(() => {
    if (!key) return
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); io.disconnect() } },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [key])

  if (!key || hidden) return null

  // Each slot is isolated in its own srcdoc iframe so atOptions globals
  // never overwrite each other on the same page.
  const srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;overflow:hidden"><script>atOptions={'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}}<\/script><script src="//${AD_CDN}/${key}/invoke.js"><\/script></body></html>`

  function handleLoad(e) {
    // Give Adsterra 1.5 s to fill the slot; if still empty, collapse the container
    setTimeout(() => {
      try {
        const body = e.target.contentDocument?.body
        if (body && !body.querySelector('iframe, img, ins')) setHidden(true)
      } catch (_) {}
    }, 1500)
  }

  return (
    <div ref={containerRef} className={`ad-slot ${className}`} style={{ width, maxWidth: '100%', margin: '0 auto' }}>
      {inView && (
        <iframe
          srcDoc={srcdoc}
          width={width}
          height={height}
          frameBorder="0"
          scrolling="no"
          sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-same-origin"
          style={{ display: 'block', border: 'none' }}
          title="Advertisement"
          onLoad={handleLoad}
        />
      )}
    </div>
  )
}
