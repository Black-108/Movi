const fallback = []

// ── Category page definitions (FilmyFly dataset) ──────────────────────────────
export const CATEGORY_PAGES = [
  { id: 'bollywood',  label: 'Bollywood',    emoji: '🎭', raw: 'Bollywood Hindi Movies' },
  { id: 'hollywood',  label: 'Hollywood',    emoji: '🌟', raw: 'Hollywood Hindi Movies' },
  { id: 'south',      label: 'South',        emoji: '🎬', raw: 'South Hindi Dubbed Movie' },
  { id: 'hqdubbed',   label: 'HQ Dubbed',    emoji: '🎙', raw: 'HQ Dubbed Movies (UnCut)' },
  { id: 'hindidub',   label: 'Hindi Dubbed', emoji: '🎥', raw: 'HQ Hindi Dub Movie [With ads]' },
  { id: 'marvel',     label: 'Marvel',       emoji: '🦸', raw: 'Marvel Hollywood Movies' },
  { id: 'animation',  label: 'Animation',    emoji: '✨', raw: 'Animation Movies' },
  { id: 'webseries',  label: 'Web Series',   emoji: '📺', raw: 'Web Series' },
  { id: 'anime',      label: 'Anime',        emoji: '🎌', raw: 'Japanese Anime' },
  { id: 'punjabi',    label: 'Punjabi',      emoji: '🎵', raw: 'Punjabi Movies' },
  { id: 'imdb',       label: 'IMDb Top',     emoji: '⭐', raw: 'imdb Top Movies' },
]

const CATEGORY_RAW_TO_ID = Object.fromEntries(CATEGORY_PAGES.map(c => [c.raw, c.id]))

const CATEGORY_TO_COLLECTION = {
  'Bollywood Hindi Movies': 'bollywood',
  'Hollywood Hindi Movies': 'hollywood',
  'South Hindi Dubbed Movie': 'south',
  'HQ Dubbed Movies (UnCut)': 'south',
  'Marvel Hollywood Movies': 'marvel',
  'Animation Movies': 'animated',
  'Japanese Anime': 'anime',
  'Punjabi Movies': 'punjabi',
}

const COLLECTION_RULES = [
  { id: 'south',     title: 'South Movies',     short: 'South',      test: i => /\bsouth\b/i.test(i._searchText) },
  { id: 'animated',  title: 'Animated',         short: 'Animation',  test: i => /\b(animation|animated)\b/i.test(i._searchText) },
  { id: 'hollywood', title: 'Hollywood',        short: 'Hollywood',  test: i => /\bhollywood\b/i.test(i._searchText) },
  { id: 'bollywood', title: 'Bollywood',        short: 'Bollywood',  test: i => /\bbollywood\b/i.test(i._searchText) },
  { id: 'marvel',    title: 'Marvel',           short: 'Marvel',     test: i => /\bmarvel\b/i.test(i._searchText) },
  { id: 'dc',        title: 'DC',               short: 'DC',         test: i => /\bdc\b/i.test(i._searchText) },
  { id: 'anime',     title: 'Anime',            short: 'Anime',      test: i => i.content_type === 'anime' || /\banime\b/i.test(i._searchText) },
  { id: 'punjabi',   title: 'Punjabi',          short: 'Punjabi',    test: i => /\bpa[n]?jabi\b/i.test(i._searchText) },
  { id: 'tamil',     title: 'Tamil',            short: 'Tamil',      test: i => /\btamil\b/i.test(i._searchText) },
  { id: 'telugu',    title: 'Telugu',           short: 'Telugu',     test: i => /\btelugu\b/i.test(i._searchText) },
  { id: 'malayalam', title: 'Malayalam',        short: 'Malayalam',  test: i => /\bmalayalam\b/i.test(i._searchText) },
  { id: 'kannada',   title: 'Kannada',          short: 'Kannada',    test: i => /\bkannada\b/i.test(i._searchText) },
  { id: 'bengali',   title: 'Bengali',          short: 'Bengali',    test: i => /\bbengali\b/i.test(i._searchText) },
  { id: 'marathi',   title: 'Marathi',          short: 'Marathi',    test: i => /\bmarathi\b/i.test(i._searchText) },
  { id: 'action',    title: 'Action',           short: 'Action',     test: i => /action/i.test(i.file_info.genre) },
  { id: 'thriller',  title: 'Thriller',         short: 'Thriller',   test: i => /thriller/i.test(i.file_info.genre) },
  { id: 'drama',     title: 'Drama',            short: 'Drama',      test: i => /drama/i.test(i.file_info.genre) },
  { id: 'comedy',    title: 'Comedy',           short: 'Comedy',     test: i => /comedy/i.test(i.file_info.genre) },
  { id: 'romance',   title: 'Romance',          short: 'Romance',    test: i => /romance/i.test(i.file_info.genre) },
  { id: 'horror',    title: 'Horror',           short: 'Horror',     test: i => /horror/i.test(i.file_info.genre) },
  { id: 'crime',     title: 'Crime',            short: 'Crime',      test: i => /crime/i.test(i.file_info.genre) },
  { id: 'sci-fi',    title: 'Science Fiction',  short: 'Sci-Fi',     test: i => /science.fiction|sci.?fi/i.test(i.file_info.genre) },
]

const ANIME_KEYWORDS = ['anime', ' ova ', ' ona ', 'ova)', 'ona)', 'manhwa', 'manga', 'dubbed anime', 'japanese animation']
const SERIES_KEYWORDS = ['web series', 'webseries', ' season ', 's01e', 's02e', 'episode', ' ep ', 'complete series']

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(v) { return v == null ? '' : String(v).trim() }
function unique(arr) { return [...new Set(arr.map(clean).filter(Boolean))] }

function extractCleanTitle(raw) {
  const str = clean(raw)
  if (!str) return ''
  // Cut at first (YYYY) pattern — keeps "Awarapan 2", strips "(2026) Bollywood Hindi Movie…"
  const m = str.match(/^(.+?)\s*\(\d{4}\)/)
  if (m && m[1].trim().length > 1) return m[1].trim()
  // Fallback: strip trailing quality/format/language noise
  const stripped = str.replace(
    /\s+(480p|720p|1080p|2160p|4k|hevc|bluray|webrip|dvdrip|hdcam|hdts|hd|fhd|uhd|esub|dual[ .]?audio|uncut|multi[ .]?audio|bollywood|hollywood|south|anime|movie|web[ .]?series|completed|complete|english|hindi|tamil|telugu|punjabi|bengali|marathi|malayalam|dubbed)[\s\S]*$/gi,
    ''
  ).trim()
  return stripped || str
}

function extractYear(str) {
  const m = clean(str).match(/\b(20\d{2}|19\d{2})\b/)
  return m ? m[1] : clean(str).split(/[^a-z0-9]/i)[0] || clean(str)
}

function parseSizeTags(sizeTag) {
  if (!sizeTag) return []
  return sizeTag.split(/\s+/).filter(s => /^\d+(\.\d+)?(mb|gb|kb)$/i.test(s))
}

function inferContentType(raw) {
  const lower = ((raw?.scraped_title || '') + ' ' + (raw?.category || '') + ' ' + (raw?.clean_title || '')).toLowerCase()
  if (raw?.content_type) return raw.content_type
  if (ANIME_KEYWORDS.some(k => lower.includes(k))) return 'anime'
  if (SERIES_KEYWORDS.some(k => lower.includes(k)) || lower.includes('series')) return 'series'
  return 'movie'
}

function contentTypeFromCategory(category) {
  const cat = clean(category).toLowerCase()
  if (cat.includes('web series') || cat.includes('series')) return 'series'
  if (cat.includes('anime') || cat.includes('japanese')) return 'anime'
  return 'movie'
}

// ── New FilmyFly format normalizer (unique_id + movie_thumb) ──────────────────

function normalizeNewFF(raw, index) {
  const sizeTag    = clean(raw.movie_thumb?.size_tag)
  const sizes      = parseSizeTags(sizeTag)
  const castStr    = clean(raw.file_info?.starcast || '')
  const cast       = castStr ? castStr.split(',').map(s => s.trim()).filter(Boolean) : []
  const shots      = Array.isArray(raw.screenshots) ? raw.screenshots.filter(Boolean) : []
  const releaseRaw = clean(raw.file_info?.release_date || '')
  const year       = extractYear(releaseRaw)
  const category   = clean(raw.category)

  const qualityTags = sizeTag.split(/\s+/).filter(s => /^(HD|FHD|4K|HEVC|BluRay|WEBRip|UHD)$/i.test(s))
  const qualityBadge = qualityTags[0] || sizes.slice(-1)[0] || null

  // Infer content type from category first, then title
  let contentType = contentTypeFromCategory(category)
  if (contentType === 'movie') {
    const t = (raw.title || '').toLowerCase()
    if (/\bweb.?series\b|s0\d[e\d]|\bseason \d|\bepisode\b/.test(t)) contentType = 'series'
    else if (/\banime\b/.test(t)) contentType = 'anime'
  }

  return {
    id: `ff-${raw.unique_id}`,
    source_site: 'filmyfly',
    source_site_name: 'FilmyFly',
    source_category: category,
    content_type: contentType,
    clean_title: extractCleanTitle(raw.title),
    scraped_title: clean(raw.title),
    detail_page_url: clean(raw.url),
    category,
    is_trending: !!(raw.is_trending || raw.homepage_section === 'General'),
    is_new: /\b202[5-9]\b/.test(releaseRaw),
    media: {
      main_poster: clean(raw.movie_thumb?.image_url),
      screenshot: shots,
    },
    file_info: {
      genre: clean(raw.file_info?.genre),
      duration: clean(raw.file_info?.duration),
      release_date: year,
      language: clean(raw.file_info?.language),
      starcast: cast,
      available_sizes: sizes,
      description: clean(raw.file_info?.description),
      director: '',
      imdb_rating: '',
    },
    tags: [],
    downloads: (Array.isArray(raw.download_links) ? raw.download_links : []).map((d, i) => ({
      id: `ff-${raw.unique_id}-${i}`,
      label: clean(d?.label) || 'Download',
      link: clean(d?.link),
      quality: '',
      size: sizeTag,
      is_direct_file: false,
    })),
    _qualityBadge: qualityBadge || null,
  }
}

// ── Old / legacy format normalizer ───────────────────────────────────────────

function normalizeOldFormat(raw, index) {
  const media = raw?.media || {}
  const info  = raw?.file_info || raw?.info || {}

  const ssRaw      = media.screenshots || media.screenshot
  const screenshots = Array.isArray(ssRaw) ? unique(ssRaw) : ssRaw ? [clean(ssRaw)] : []
  const posterRaw  = media.main_poster || media.poster || screenshots[0] || ''

  const rawTitleObj   = typeof raw?.title === 'object' ? raw.title : null
  const cleanTitleRaw = raw?.clean_title || rawTitleObj?.clean || rawTitleObj?.raw || raw?.title || `Untitled ${index + 1}`
  const title         = extractCleanTitle(clean(cleanTitleRaw))
  const scrapedTitle  = clean(raw?.scraped_title || rawTitleObj?.raw || raw?.title?.raw)

  const sourceSite     = clean(raw?.source_site     || raw?.source?.site)
  const sourceSiteName = clean(raw?.source_site_name || raw?.source?.site_name)
  const detailUrl      = clean(raw?.detail_page_url  || raw?.source?.detail_url)

  const castRaw = info.starcast || info.cast
  const cast    = Array.isArray(castRaw) ? unique(castRaw) : []
  const category = clean(raw?.category || raw?.type || 'Movie')
  const genres   = clean(info.genre || raw?.genre)
  const language = clean(info.language)
  const tags     = Array.isArray(raw?.tags) ? unique(raw.tags) : []

  const SIZE_PATTERN = /^\d+(\.\d+)?\s*(mb|gb|kb|tb)/i
  const sizes = Array.isArray(info.available_sizes)
    ? unique(info.available_sizes.filter(s => SIZE_PATTERN.test(clean(s)))) : []
  const qualityBadge = Array.isArray(info.available_sizes)
    ? (info.available_sizes.find(s => /^(hd|4k|fhd|uhd|bluray|webrip)/i.test(clean(s))) || sizes.at(-1)) : null

  const downloads = Array.isArray(raw?.downloads)
    ? raw.downloads.map((d, i) => ({
        id: `${raw?.id ?? index}-${i}`,
        label: clean(d?.label || 'External source'),
        link: clean(d?.link),
        quality: clean(d?.quality),
        size: clean(d?.size),
        is_direct_file: Boolean(d?.is_direct_file ?? d?.is_direct),
      })) : []

  const content_type = inferContentType({ scraped_title: scrapedTitle, category, clean_title: title })

  return {
    id: raw?.id ?? `movi-${index + 1}`,
    source_site: sourceSite,
    source_site_name: sourceSiteName,
    source_category: category,
    content_type,
    clean_title: title,
    scraped_title: scrapedTitle,
    detail_page_url: detailUrl,
    category,
    is_trending: false,
    is_new: false,
    media: { main_poster: clean(posterRaw), screenshot: screenshots },
    file_info: {
      genre: genres,
      duration: clean(info.duration),
      release_date: clean(info.release_date || rawTitleObj?.year || raw?.year),
      language,
      starcast: cast,
      available_sizes: sizes,
      description: clean(info.description || raw?.description),
      director: clean(info.director),
      imdb_rating: clean(info.imdb_rating),
    },
    tags,
    downloads,
    _qualityBadge: qualityBadge || null,
  }
}

// ── Public normalizer ─────────────────────────────────────────────────────────

export function normalizeItem(raw, index) {
  if (!raw) return null

  const isNewFF = !!(raw?.unique_id && raw?.movie_thumb)
  const item = isNewFF ? normalizeNewFF(raw, index) : normalizeOldFormat(raw, index)

  item._searchText = [
    item.clean_title, item.scraped_title, item.source_category, item.category,
    item.content_type, item.file_info.genre, item.file_info.language,
    item.file_info.release_date, item.file_info.description,
    item.file_info.starcast.join(' '), item.tags.join(' '), item.source_site_name,
  ].join(' ').toLowerCase()

  item.collections = COLLECTION_RULES.filter(rule => rule.test(item)).map(rule => rule.id)

  // Ensure category-based items land in the right collection even without keyword match
  const catColl = CATEGORY_TO_COLLECTION[item.source_category]
  if (catColl && !item.collections.includes(catColl)) item.collections.push(catColl)

  item.derivedTags = unique([
    ...item.tags, item.category, item.content_type,
    ...item.file_info.genre.split(',').map(x => x.trim()),
    ...item.file_info.language.split(/[+,/]/).map(x => x.trim()),
    ...item.collections.map(id => COLLECTION_RULES.find(r => r.id === id)?.short),
    item.file_info.release_date,
  ])

  return item
}

// ── Catalog loader ────────────────────────────────────────────────────────────

export async function loadMediaCatalog() {
  try {
    const response = await fetch('./Movi.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`Movi.json returned ${response.status}`)
    const data = await response.json()
    const list = Array.isArray(data) ? data : Array.isArray(data?.components) ? data.components : []
    return list.map(normalizeItem).filter(item => item?.clean_title)
  } catch (error) {
    console.error('Unable to load Movi.json', error)
    return fallback
  }
}

// ── Collection helpers ────────────────────────────────────────────────────────

export function getCollectionDefinitions(items) {
  return COLLECTION_RULES
    .map(rule => ({ ...rule, count: items.filter(item => item.collections.includes(rule.id)).length }))
    .filter(rule => rule.count > 0)
}

export function getCategoryPageDefinitions(items) {
  return CATEGORY_PAGES.filter(cat => items.some(item => item.source_category === cat.raw))
}

export function getCollection(items, id) {
  // Check CATEGORY_PAGES first (direct category match for FilmyFly data)
  const catPage = CATEGORY_PAGES.find(c => c.id === id)
  if (catPage) {
    const members = items.filter(item => item.source_category === catPage.raw)
    return { ...catPage, title: catPage.label, count: members.length, items: members }
  }
  // Fallback to keyword collection rules
  const rule = COLLECTION_RULES.find(x => x.id === id)
  if (!rule) return null
  const members = items.filter(item => item.collections.includes(id))
  return { ...rule, count: members.length, items: members }
}

export function matchesSearch(item, search) {
  const query = clean(search).toLowerCase()
  return !query || item._searchText.includes(query)
}

export function filterByContentMode(items, mode) {
  if (!mode || mode === 'all') return items
  return items.filter(item => item.content_type === mode)
}

export function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function stripInternal(item) {
  const { _searchText, _qualityBadge, ...publicItem } = item
  return publicItem
}

export { COLLECTION_RULES }
