const fallback = []

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

function inferContentType(raw) {
  const lower = ((raw?.scraped_title || '') + ' ' + (raw?.category || '') + ' ' + (raw?.clean_title || '')).toLowerCase()
  if (raw?.content_type) return raw.content_type
  if (ANIME_KEYWORDS.some(k => lower.includes(k))) return 'anime'
  if (SERIES_KEYWORDS.some(k => lower.includes(k)) || lower.includes('series')) return 'series'
  return 'movie'
}

function clean(value) { return value == null ? '' : String(value).trim() }
function unique(values) { return [...new Set(values.map(clean).filter(Boolean))] }

export function normalizeItem(raw, index) {
  const isNewFormat = raw?.source && raw?.title && typeof raw.title === 'object'
  const media = raw?.media || {}
  const info  = raw?.file_info || raw?.info || {}

  const ssRaw = media.screenshots || media.screenshot
  const screenshots = Array.isArray(ssRaw) ? unique(ssRaw) : ssRaw ? [clean(ssRaw)] : []
  const posterRaw = media.main_poster || media.poster || screenshots[0] || ''

  const rawTitleObj  = typeof raw?.title === 'object' ? raw.title : null
  const cleanTitleRaw = raw?.clean_title || rawTitleObj?.clean || rawTitleObj?.raw || raw?.title || `Untitled ${index + 1}`
  const title        = clean(cleanTitleRaw).replace(/\s{2,}/g, ' ').trim()
  const scrapedTitle = clean(raw?.scraped_title || rawTitleObj?.raw || raw?.title?.raw)

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

  const content_type = inferContentType(
    isNewFormat ? { ...raw, scraped_title: scrapedTitle, clean_title: title } : raw
  )

  const item = {
    id: raw?.id ?? `movi-${index + 1}`,
    source_site: sourceSite, source_site_name: sourceSiteName, content_type,
    clean_title: title, scraped_title: scrapedTitle, detail_page_url: detailUrl, category,
    media: { main_poster: clean(posterRaw), screenshot: screenshots },
    file_info: {
      genre: genres, duration: clean(info.duration),
      release_date: clean(info.release_date || rawTitleObj?.year || raw?.year),
      language, starcast: cast, available_sizes: sizes,
      description: clean(info.description || raw?.description),
      director: clean(info.director), imdb_rating: clean(info.imdb_rating),
    },
    tags, downloads, _qualityBadge: qualityBadge || null,
  }

  item._searchText = [
    item.clean_title, item.scraped_title, item.category, item.content_type,
    item.file_info.genre, item.file_info.language, item.file_info.release_date,
    item.file_info.description, item.file_info.starcast.join(' '),
    item.tags.join(' '), item.source_site_name,
  ].join(' ').toLowerCase()

  item.collections = COLLECTION_RULES.filter(rule => rule.test(item)).map(rule => rule.id)
  item.derivedTags = unique([
    ...item.tags, item.category, item.content_type,
    ...item.file_info.genre.split(',').map(x => x.trim()),
    ...item.file_info.language.split(/[+,/]/).map(x => x.trim()),
    ...item.collections.map(id => COLLECTION_RULES.find(r => r.id === id)?.short),
    item.file_info.release_date,
  ])

  return item
}

export async function loadMediaCatalog() {
  try {
    const response = await fetch('./Movi.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`Movi.json returned ${response.status}`)
    const data = await response.json()
    const list = Array.isArray(data) ? data : Array.isArray(data?.components) ? data.components : []
    return list.map(normalizeItem).filter(item => item.clean_title)
  } catch (error) {
    console.error('Unable to load Movi.json', error)
    return fallback
  }
}

export function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function getCollectionDefinitions(items) {
  return COLLECTION_RULES
    .map(rule => ({ ...rule, count: items.filter(item => item.collections.includes(rule.id)).length }))
    .filter(rule => rule.count > 0)
}

export function getCollection(items, id) {
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

export function stripInternal(item) {
  const { _searchText, _qualityBadge, ...publicItem } = item
  return publicItem
}

export { COLLECTION_RULES }
