/**
 * Sitemap Generator — run after updating Movi.json
 * Usage: node sitemap_gen.cjs --domain https://movie.guru
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const domainArg = args.find(a => a.startsWith('--domain='))?.split('=')[1]
            || args[args.indexOf('--domain') + 1]
const DOMAIN = (domainArg || 'https://movie.guru').replace(/\/$/, '')

const DATA_PATH = path.join(__dirname, 'public', 'Movi.json')
const OUT_PATH  = path.join(__dirname, 'sitemap.xml')

function slug(item) {
  const title = (item.clean_title || item.scraped_title || String(item.id))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${item.id}-${title}`
}

function escapeXml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const today = new Date().toISOString().split('T')[0]

let data = []
try {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  if (!Array.isArray(data)) data = data?.components || []
} catch (e) { console.error('Could not read Movi.json:', e.message); process.exit(1) }

const staticPages = [
  { loc: `${DOMAIN}/`, priority: '1.0', changefreq: 'daily' },
  { loc: `${DOMAIN}/#/movies`, priority: '0.9', changefreq: 'daily' },
  { loc: `${DOMAIN}/#/series`, priority: '0.9', changefreq: 'daily' },
  { loc: `${DOMAIN}/#/anime`, priority: '0.9', changefreq: 'daily' },
]
const dynamicEntries = data.map(item => ({ loc: `${DOMAIN}/#/title/${escapeXml(item.id)}`, lastmod: today, priority: '0.7', changefreq: 'weekly' }))
const allEntries = [...staticPages, ...dynamicEntries]
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allEntries.map(e => `  <url>\n    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n    <changefreq>${e.changefreq||'monthly'}</changefreq>\n    <priority>${e.priority||'0.5'}</priority>\n  </url>`).join('\n')}\n</urlset>\n`
fs.writeFileSync(OUT_PATH, xml, 'utf-8')
console.log(`✓ Wrote ${allEntries.length} URLs to ${OUT_PATH}`)
