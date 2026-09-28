import { useEffect, useRef } from 'react'

export function AdSlot({ zoneKey, width = 728, height = 90, className = '' }) {
  const container = useRef(null)

  useEffect(() => {
    if (!zoneKey || !container.current) return
    container.current.innerHTML = ''
    const cfg = document.createElement('script')
    cfg.type = 'text/javascript'
    cfg.text = `atOptions = { 'key': '${zoneKey}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`
    container.current.appendChild(cfg)
    const loader = document.createElement('script')
    loader.type = 'text/javascript'
    loader.src  = `//www.highperformanceformat.com/${zoneKey}/invoke.js`
    container.current.appendChild(loader)
    return () => { if (container.current) container.current.innerHTML = '' }
  }, [zoneKey, width, height])

  if (!zoneKey) {
    return (
      <div className={className} style={{ width, height, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'1px dashed #444', color:'#666', fontSize:12, boxSizing:'border-box' }} aria-hidden="true">
        Ad {width}×{height}
      </div>
    )
  }

  return <div ref={container} className={className} style={{ width, height, overflow:'hidden', display:'block' }} />
}
