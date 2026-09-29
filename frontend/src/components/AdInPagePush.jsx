import { useEffect, useRef, useState } from 'react'
import { AD_CDN } from '../config/ads'

const PUSH_KEY = 'fb6711ca50cf928f929294d5004a45bc'
const PUSH_W   = 300
const PUSH_H   = 250
const DELAY_MS = 8000
const SESSION_KEY = 'movi_ipp_shown'

function isTooSmall() {
  return typeof window !== 'undefined' && window.innerWidth < 480
}

export function AdInPagePush() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isTooSmall()) return
    try { if (sessionStorage.getItem(SESSION_KEY)) return } catch (_) {}

    timerRef.current = setTimeout(() => {
      setVisible(true)
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch (_) {}
    }, DELAY_MS)

    return () => clearTimeout(timerRef.current)
  }, [])

  if (!visible || dismissed) return null

  const srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;overflow:hidden"><script>atOptions={'key':'${PUSH_KEY}','format':'iframe','height':${PUSH_H},'width':${PUSH_W},'params':{}}<\/script><script src="//${AD_CDN}/${PUSH_KEY}/invoke.js"><\/script></body></html>`

  return (
    <div className="ipp-wrap" role="complementary" aria-label="Sponsored">
      <div className="ipp-header">
        <span className="ipp-label">Sponsored</span>
        <button
          className="ipp-close"
          onClick={() => setDismissed(true)}
          aria-label="Close ad"
        >✕</button>
      </div>
      <iframe
        srcDoc={srcdoc}
        width={PUSH_W}
        height={PUSH_H}
        frameBorder="0"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        style={{ display: 'block', border: 'none' }}
        title="Advertisement"
      />
    </div>
  )
}
