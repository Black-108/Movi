import { useEffect, useRef } from 'react'

/**
 * Adsterra banner ad slot.
 *
 * How to use:
 *   1. In Adsterra dashboard create a "Display Banner" zone.
 *   2. Copy the numeric Zone Key from the code Adsterra gives you.
 *      Example code from Adsterra:
 *        <script type="text/javascript">
 *          atOptions = { 'key': '1a2b3c4d5e...', 'format': 'iframe', 'height': 90, 'width': 728, 'params': {} };
 *        </script>
 *        <script type="text/javascript" src="//www.highperformanceformat.com/1a2b3c4d5e.../invoke.js"></script>
 *      The KEY is the long hex string: '1a2b3c4d5e...'
 *
 *   3. Place the component anywhere in your JSX:
 *        <AdSlot zoneKey="1a2b3c4d5e..." width={728} height={90} />
 *        <AdSlot zoneKey="1a2b3c4d5e..." width={300} height={250} />
 *
 * Props:
 *   zoneKey  — the Adsterra zone key string (required)
 *   width    — ad width in px  (default 728)
 *   height   — ad height in px (default 90)
 */
export function AdSlot({ zoneKey, width = 728, height = 90, className = '' }) {
  const container = useRef(null)

  useEffect(() => {
    if (!zoneKey || !container.current) return

    // Clear any previous render (React StrictMode / hot-reload safety)
    container.current.innerHTML = ''

    // Inject atOptions config script
    const cfg = document.createElement('script')
    cfg.type = 'text/javascript'
    cfg.text = `atOptions = { 'key': '${zoneKey}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`
    container.current.appendChild(cfg)

    // Inject the invoke.js loader script
    const loader = document.createElement('script')
    loader.type = 'text/javascript'
    loader.src  = `//www.highperformanceformat.com/${zoneKey}/invoke.js`
    container.current.appendChild(loader)

    return () => {
      if (container.current) container.current.innerHTML = ''
    }
  }, [zoneKey, width, height])

  // Show a placeholder box when no key is configured yet
  if (!zoneKey) {
    return (
      <div
        className={className}
        style={{
          width, height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: '1px dashed #444',
          color: '#666', fontSize: 12, boxSizing: 'border-box',
        }}
        aria-hidden="true"
      >
        Ad {width}×{height}
      </div>
    )
  }

  return (
    <div
      ref={container}
      className={className}
      style={{ width, height, overflow: 'hidden', display: 'block' }}
    />
  )
}
