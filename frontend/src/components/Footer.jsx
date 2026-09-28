export function Footer({ onDiagnostics }) {
  return <footer className="footer">
    <div className="footer-inner">
      <div><strong>Movi</strong><span> · Frontend media catalog</span></div>
      <div className="footer-links">
        <button onClick={onDiagnostics}>Diagnostics</button>
        <span>JSON-driven · © 2026</span>
      </div>
    </div>
    <div className="legal-note">
      Movi is a frontend/catalog interface. It does not host, upload, proxy, bypass, or modify media files. External links are supplied by the dataset and open at their original destination. Use only content and links you have permission to access, share, or download.
    </div>
  </footer>
}
