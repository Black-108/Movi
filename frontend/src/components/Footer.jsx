export function Footer({ onDiagnostics }) {
  const go = page => { window.location.hash = `#/${page}` }
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div><strong>Movi</strong><span> · Media catalog aggregator · © 2026</span></div>
        <div className="footer-links">
          <button onClick={() => go('privacy')}>Privacy Policy</button>
          <button onClick={() => go('disclaimer')}>Disclaimer</button>
          <button onClick={() => go('dmca')}>DMCA</button>
          <button onClick={() => go('terms')}>Terms</button>
          <button onClick={onDiagnostics}>Diagnostics</button>
        </div>
      </div>
      <div className="legal-note">
        Movi is a frontend catalog aggregator. It does not host, upload, proxy, or stream any media files.
        External links are sourced from a third-party dataset and open at their original destination.
        Access only content and links you are legally permitted to use.
        Advertisements are served by Adsterra. See our <button className="inline-link" onClick={() => go('privacy')}>Privacy Policy</button> for details on ad cookies.
      </div>
    </footer>
  )
}
