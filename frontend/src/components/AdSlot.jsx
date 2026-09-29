import { AD_SLOTS, AD_CDN } from '../config/ads'

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= 728
}

/**
 * Each ad slot renders in its own sandboxed iframe so atOptions configs
 * never interfere with each other on the same page.
 */
export function AdSlot({ slot, className = '' }) {
  const cfg = AD_SLOTS[slot]
  const mobile = isMobile()

  const key    = (mobile && cfg?.mkey) ? cfg.mkey : cfg?.key ?? ''
  const width  = (mobile && cfg?.mw)   ? cfg.mw   : cfg?.w ?? 728
  const height = (mobile && cfg?.mh)   ? cfg.mh   : cfg?.h ?? 90

  if (!key) {
    return (
      <div
        className={`ad-placeholder ${className}`}
        style={{ width, height, boxSizing: 'border-box' }}
        aria-hidden="true"
      />
    )
  }

  // Inline HTML written into a srcdoc iframe — each slot is fully isolated
  const srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;overflow:hidden"><script>atOptions={'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}}<\/script><script src="//${AD_CDN}/${key}/invoke.js"><\/script></body></html>`

  return (
    <div className={`ad-slot ${className}`} style={{ width, maxWidth: '100%', margin: '0 auto' }}>
      <iframe
        srcDoc={srcdoc}
        width={width}
        height={height}
        frameBorder="0"
        scrolling="no"
        style={{ display: 'block', border: 'none' }}
        title="Advertisement"
      />
    </div>
  )
}
