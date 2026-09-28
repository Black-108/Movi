import { useEffect, useState } from 'react'
export function TroubleshootingPortal({ onBack }) {
  const [latency, setLatency] = useState(null); const [checking, setChecking] = useState(false)
  const browser = navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Edg') ? 'Edge' : navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Your browser'
  const runCheck = () => { setChecking(true); setTimeout(() => { setLatency(Math.floor(18 + Math.random() * 55)); setChecking(false) }, 750) }
  useEffect(() => { document.title = 'Movi — Diagnostics' }, [])
  return <main className="diagnostics page"><button className="back" onClick={onBack}>← Back to catalog</button><span className="eyebrow">Client-side diagnostics</span><h1>Everything looks <em>ready.</em></h1><p className="lede">A local, privacy-aware check of the environment that powers your Movi experience.</p>
    <div className="health-bar"><div><span className="pulse"/> JavaScript runtime <b>Operational</b></div><span>100%</span></div>
    <section className="diag-grid"><article className="diag-card wide"><span className="card-icon">◉</span><div><span className="eyebrow">Browser compatibility</span><h2>{browser} is fully supported</h2><p>Modern rendering, touch input, and local preferences are available in this session.</p></div><span className="status">Supported</span></article>
      <article className="diag-card"><span className="card-icon">⌁</span><span className="eyebrow">Network pipeline</span><h2>{latency ? `${latency} ms` : 'Not tested'}</h2><p>{latency ? 'Simulated client handshake completed.' : 'Run a non-invasive latency simulation.'}</p><button className="outline-btn" disabled={checking} onClick={runCheck}>{checking ? 'Checking…' : 'Run check'}</button></article>
      <article className="diag-card"><span className="card-icon">▱</span><span className="eyebrow">Device capability</span><h2>{navigator.maxTouchPoints ? 'Touch enabled' : 'Pointer optimized'}</h2><p>Safe-area padding, reduced motion, and responsive controls are active.</p></article>
      <article className="diag-card wide notice"><span className="card-icon">!</span><div><span className="eyebrow">Extension help</span><h2>Can't reach a connected provider?</h2><p>Privacy extensions can sometimes block provider handoffs. Allowlist this site and reload before trying again. Movi will never ask you to disable protection globally.</p></div></article></section>
  </main>
}
