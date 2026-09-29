const CONTACT = 'legal@movi.guru'
const SITE    = 'https://movi.guru'
const UPDATED = 'September 29, 2026'

function LegalShell({ title, children }) {
  return (
    <main className="page legal-page">
      <div className="legal-shell">
        <button className="back-btn" onClick={() => history.length > 1 ? history.back() : (window.location.hash = '#/home')}>← Back</button>
        <span className="eyebrow">Legal</span>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>
        <div className="legal-body">{children}</div>
      </div>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <h2>1. Who We Are</h2>
      <p>Movi ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") operates the website at <a href={SITE}>{SITE}</a>. Movi is a frontend media catalog aggregator. We do not host, store, upload, or serve any media files.</p>

      <h2>2. Information We Collect</h2>
      <p>We do <strong>not</strong> require registration and do not collect personal information such as your name, email address, or password. We do not run our own analytics. Any data collected is limited to:</p>
      <ul>
        <li><strong>Server logs</strong> — GitHub Pages (our host) may log standard HTTP request data (IP address, browser type, referring URL, timestamp). We have no access to these logs and they are governed by <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noreferrer">GitHub's Privacy Statement</a>.</li>
        <li><strong>Advertising cookies</strong> — We use Adsterra to display ads. Adsterra and its advertising partners may place cookies or similar tracking technologies on your device to serve personalised or contextual advertisements. Please review <a href="https://adsterra.com/privacy-policy/" target="_blank" rel="noreferrer">Adsterra's Privacy Policy</a> for full details.</li>
      </ul>

      <h2>3. Third-Party Links</h2>
      <p>Movi displays links to third-party websites. We have no control over their content or privacy practices and accept no responsibility for them. We encourage you to review the privacy policies of any external site you visit.</p>

      <h2>4. Cookies</h2>
      <p>We do not set first-party cookies. Third-party advertising partners (see §2) may set cookies. You can control or disable cookies through your browser settings. Opting out of personalised advertising is available via <a href="https://optout.aboutads.info/" target="_blank" rel="noreferrer">aboutads.info</a> or <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noreferrer">youronlinechoices.eu</a>.</p>

      <h2>5. Children's Privacy</h2>
      <p>Movi is not directed at children under 13 (or the relevant age in your jurisdiction). We do not knowingly collect data from children.</p>

      <h2>6. Your Rights</h2>
      <p>If you are a resident of the EU, UK, or California, you may have rights under GDPR, UK GDPR, or CCPA regarding personal data. Because we collect no personal data directly, most of those rights apply to our advertising partners rather than to us. You may direct such requests to Adsterra using their contact channels.</p>

      <h2>7. Changes</h2>
      <p>We may update this Privacy Policy. Material changes will be reflected by updating the "Last updated" date above.</p>

      <h2>8. Contact</h2>
      <p>Questions? Email us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </LegalShell>
  )
}

export function DisclaimerPage() {
  return (
    <LegalShell title="Disclaimer">
      <h2>1. Aggregator — Not a Hosting Service</h2>
      <p>Movi is a <strong>read-only media catalog aggregator</strong>. We display metadata (titles, descriptions, poster images, cast, genres) and links that are supplied by a third-party JSON dataset. We do not upload, host, store, transcode, stream, proxy, or otherwise provide access to any audio or video content.</p>

      <h2>2. External Links</h2>
      <p>Download and streaming links on Movi point to external websites operated by third parties. We do not control those websites and are not responsible for their content, availability, legality, or the terms under which they offer content. Clicking an external link takes you away from Movi and you are subject to that site's own terms and policies.</p>

      <h2>3. No Warranty</h2>
      <p>The catalog is provided "as is" without warranty of any kind. We make no guarantees that links are working, up-to-date, legal, or appropriate in your jurisdiction. Information such as release dates, cast, and genres is sourced from the dataset and may be inaccurate.</p>

      <h2>4. User Responsibility</h2>
      <p>You are solely responsible for ensuring that any content you access, download, or share through links found on Movi is permitted by applicable law and any applicable terms of service of the originating website. Movi expressly disclaims all liability for unlawful use of external links.</p>

      <h2>5. Advertising</h2>
      <p>Movi displays advertisements through Adsterra to fund free access to this service. We are not responsible for the content of advertisements. Advertisements are served by third-party ad networks and are not endorsements by Movi.</p>

      <h2>6. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Movi and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of this website or any external content linked from it.</p>

      <h2>7. Contact</h2>
      <p>Questions or concerns: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </LegalShell>
  )
}

export function DmcaPage() {
  return (
    <LegalShell title="DMCA Policy">
      <h2>Our Position</h2>
      <p>Movi is a frontend catalog aggregator. We do <strong>not</strong> host, upload, or store any media files. All links on this site point to third-party external websites that are not operated or controlled by us.</p>
      <p>Nevertheless, we respect intellectual property rights. If you are a copyright holder or an authorised agent and believe that content linked from Movi infringes your copyright, please follow the procedure below.</p>

      <h2>DMCA Takedown Request</h2>
      <p>Send a written notice to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> that includes:</p>
      <ol>
        <li>Your full legal name and contact information (email address, postal address, phone number).</li>
        <li>Identification of the copyrighted work you claim is being infringed.</li>
        <li>The specific URL(s) on <strong>{SITE}</strong> that link to the allegedly infringing content.</li>
        <li>A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or the law.</li>
        <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf.</li>
        <li>Your physical or electronic signature.</li>
      </ol>

      <h2>Response Time</h2>
      <p>We aim to respond to valid DMCA notices within <strong>5–7 business days</strong>. Upon receipt of a valid notice, we will remove or disable access to the infringing link from our catalog.</p>

      <h2>Counter-Notice</h2>
      <p>If you believe a link was removed in error, you may send a counter-notice to the address above. It must include your contact information, identification of the removed link, a statement under penalty of perjury that you have a good-faith belief the material was removed by mistake, and your consent to the jurisdiction of a federal court in your district.</p>

      <h2>Repeat Infringers</h2>
      <p>We have a policy of removing links associated with repeat copyright infringement.</p>
    </LegalShell>
  )
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <h2>1. Acceptance</h2>
      <p>By accessing or using {SITE} you agree to these Terms of Service. If you do not agree, please do not use the site.</p>

      <h2>2. Description of Service</h2>
      <p>Movi is a free, read-only media catalog aggregator. It displays metadata and external links to third-party websites. It does not host media content.</p>

      <h2>3. Permitted Use</h2>
      <p>You may use Movi for personal, non-commercial browsing and discovery. You must not:</p>
      <ul>
        <li>Scrape, crawl, or systematically download catalog data without our written consent.</li>
        <li>Use the site to facilitate any unlawful activity, including piracy.</li>
        <li>Attempt to disrupt, compromise, or gain unauthorised access to the site or its infrastructure.</li>
        <li>Reproduce, redistribute, or commercially exploit the catalog data.</li>
      </ul>

      <h2>4. External Content</h2>
      <p>External links are provided as-is. We make no warranty about the legality, safety, or availability of any externally linked content. You access external sites at your own risk and are solely responsible for complying with those sites' terms and applicable law.</p>

      <h2>5. Intellectual Property</h2>
      <p>The Movi brand, design, and original code are our property. Catalog metadata (titles, posters, descriptions) may be the property of their respective owners. We display this information in good faith for discovery and indexing purposes.</p>

      <h2>6. Advertising</h2>
      <p>Movi displays third-party advertisements to fund free access. We are not responsible for ad content. Ad-blocking software may prevent some or all ads from displaying.</p>

      <h2>7. Disclaimers &amp; Limitation of Liability</h2>
      <p>The service is provided "as is". We disclaim all warranties. We are not liable for any damages arising from your use of Movi or external links found on it. See our full <a href="#/disclaimer" onClick={() => window.location.hash='#/disclaimer'}>Disclaimer</a>.</p>

      <h2>8. Changes to Terms</h2>
      <p>We may update these Terms at any time. Continued use after an update constitutes acceptance of the new Terms.</p>

      <h2>9. Governing Law</h2>
      <p>These Terms are governed by the laws of India, without regard to conflict of law principles.</p>

      <h2>10. Contact</h2>
      <p>Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </LegalShell>
  )
}
