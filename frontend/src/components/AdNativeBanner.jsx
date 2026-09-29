import { useEffect, useRef, useState } from 'react'
import { NATIVE_BANNER } from '../config/ads'

export function AdNativeBanner({ className = '' }) {
  const containerRef = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !NATIVE_BANNER.src) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); io.disconnect() } },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!NATIVE_BANNER.src) return null

  const srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;background:transparent}</style></head><body><div id="${NATIVE_BANNER.containerId}"></div><script async data-cfasync="false" src="${NATIVE_BANNER.src}"><\/script></body></html>`

  return (
    <div ref={containerRef} className={`ad-native ${className}`} style={{ width: '100%' }}>
      {inView && (
        <iframe
          srcDoc={srcdoc}
          width="100%"
          height="280"
          frameBorder="0"
          scrolling="no"
          sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-same-origin"
          style={{ display: 'block', border: 'none', width: '100%' }}
          title="Advertisement"
        />
      )}
    </div>
  )
}
