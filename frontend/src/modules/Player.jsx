import { useState } from 'react'

const STREAMABLE_HOSTS = [
  'streamtape', 'mixdrop', 'doodstream', 'streamlare', 'upstream',
  'filemoon', 'vidplay', 'voe.sx', 'streamsb', 'dailymotion',
  'youtube.com/embed', 'youtu.be', 'drive.google.com/file',
  'multimovies', 'yupflix',
]

function isStreamable(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  return STREAMABLE_HOSTS.some(h => lower.includes(h))
}

function toEmbedUrl(url) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.match(/\/d\/([^/]+)/)?.[1]
    if (id) return `https://drive.google.com/file/d/${id}/preview`
  }
  return url
}

export function Player({ downloads, title }) {
  const [activeUrl, setActiveUrl] = useState(null)
  const streamLinks = downloads.filter(d => isStreamable(d.link) || !d.is_direct_file)
  if (!streamLinks.length) return null

  return (
    <section className="player-section">
      <div className="section-label">
        <span className="eyebrow">Online Player</span>
        <h2>Watch Now</h2>
      </div>
      <p className="player-note">Select a server below to stream. If one doesn't load, try the next.</p>
      <div className="player-server-row">
        {streamLinks.map((d, i) => (
          <button key={d.id} className={`server-btn${activeUrl === d.link ? ' active' : ''}`} onClick={() => setActiveUrl(activeUrl === d.link ? null : d.link)}>
            Server {i + 1}{d.label && d.label !== 'External source' ? ` — ${d.label.slice(0, 20)}` : ''}
          </button>
        ))}
        {activeUrl && <button className="server-btn close-btn" onClick={() => setActiveUrl(null)}>✕ Close</button>}
      </div>
      {activeUrl && (
        <div className="player-frame-wrap">
          <iframe key={activeUrl} src={toEmbedUrl(activeUrl)} title={`${title} — online player`} allowFullScreen allow="autoplay; fullscreen" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" className="player-frame" />
          <p className="player-legal">This player embeds the external source directly. Content is hosted by third parties — Movi does not store or proxy media files.</p>
        </div>
      )}
    </section>
  )
}
