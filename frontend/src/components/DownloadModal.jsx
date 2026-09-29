import { useEffect } from 'react'

export function DownloadModal({ url, label, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="dlmodal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Download page (JavaScript disabled)"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="dlmodal-panel">

        <div className="dlmodal-header">
          <div className="dlmodal-meta">
            <span className="dlmodal-badge">⚡ JS Disabled</span>
            <span className="dlmodal-name">{label || 'Download page'}</span>
          </div>
          <div className="dlmodal-controls">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="dlmodal-ext"
            >
              Open in tab ↗
            </a>
            <button className="dlmodal-close" onClick={onClose} aria-label="Close modal">✕</button>
          </div>
        </div>

        <iframe
          key={url}
          src={url}
          title={label || 'Download page'}
          sandbox="allow-forms allow-same-origin allow-downloads"
          referrerPolicy="no-referrer"
          className="dlmodal-iframe"
        />

        <div className="dlmodal-footer">
          JavaScript is disabled in this frame — ads, popups and redirect scripts cannot run.
          If the page appears blank, the site blocks embedding —{' '}
          <a href={url} target="_blank" rel="noreferrer noopener">open it in a new tab</a> instead.
        </div>

      </div>
    </div>
  )
}
