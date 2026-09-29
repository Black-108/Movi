export function DownloadFrame({ url, onClose }) {
  return (
    <div className="dlframe-wrap">
      <div className="dlframe-bar">
        <span className="dlframe-title">Download page</span>
        <div className="dlframe-bar-right">
          <a href={url} target="_blank" rel="noreferrer noopener" className="dlframe-newtab">
            Open in new tab ↗
          </a>
          <button className="dlframe-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>
      <iframe
        key={url}
        src={url}
        title="Download page"
        sandbox="allow-forms allow-same-origin allow-downloads"
        referrerPolicy="no-referrer"
        className="dlframe-iframe"
      />
    </div>
  )
}
