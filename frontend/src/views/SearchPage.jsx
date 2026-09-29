import { useEffect, useMemo, useState } from 'react'
import { loadMediaCatalog, matchesSearch } from '../database/mediaCatalog'
import { MediaCard } from '../modules/MediaCard'
import { AdSlot } from '../components/AdSlot'
import { AdNativeBanner } from '../components/AdNativeBanner'
import { LayoutToggle } from '../components/LayoutToggle'
import { useApp } from '../context/AppContext'

const TYPE_TABS = [
  { key: 'all',    label: 'All results' },
  { key: 'movie',  label: '🎬 Movies' },
  { key: 'series', label: '📺 Series' },
  { key: 'anime',  label: '🎌 Anime' },
]

export function SearchPage({ search, setSearch, onOpenTitle }) {
  const { view } = useApp()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [typeTab, setTypeTab] = useState('all')
  const [sort, setSort]       = useState('relevance')
  const [visible, setVisible] = useState(24)

  useEffect(() => { setVisible(24); setTypeTab('all') }, [search])

  useEffect(() => {
    loadMediaCatalog().then(data => setItems(data)).finally(() => setLoading(false))
  }, [])

  const matched = useMemo(
    () => items.filter(i => matchesSearch(i, search)),
    [items, search]
  )

  const filtered = useMemo(() => {
    const base = typeTab === 'all' ? matched : matched.filter(i => i.content_type === typeTab)
    if (sort === 'title') return [...base].sort((a, b) => a.clean_title.localeCompare(b.clean_title))
    if (sort === 'year')  return [...base].sort((a, b) => Number(b.file_info.release_date || 0) - Number(a.file_info.release_date || 0))
    return base
  }, [matched, typeTab, sort])

  const typeCounts = useMemo(() => ({
    all:    matched.length,
    movie:  matched.filter(i => i.content_type === 'movie').length,
    series: matched.filter(i => i.content_type === 'series').length,
    anime:  matched.filter(i => i.content_type === 'anime').length,
  }), [matched])

  const relatedTags = useMemo(() => {
    const freq = {}
    matched.forEach(item => item.derivedTags?.forEach(t => { freq[t] = (freq[t] || 0) + 1 }))
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t)
  }, [matched])

  const shown = filtered.slice(0, visible)
  const hasMore = shown.length < filtered.length

  return (
    <main className="page search-page">
      <AdSlot slot="SLOT_HOME_TOP" className="ad-top" />

      <div className="search-page-head">
        <span className="eyebrow">Search results</span>
        <h1>Results for <em>"{search}"</em></h1>
        <p className="search-result-count">
          {loading
            ? 'Loading catalog…'
            : `${filtered.length} title${filtered.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {relatedTags.length > 0 && (
        <div className="search-related">
          <span className="eyebrow">Related keywords — click to refine</span>
          <div className="tag-cloud">
            {relatedTags.map(tag => (
              <button
                key={tag}
                className={`tag tag-button${search === tag ? ' tag-active' : ''}`}
                onClick={() => setSearch(tag)}
              >{tag}</button>
            ))}
          </div>
        </div>
      )}

      <div className="search-toolbar">
        <div className="search-type-tabs">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              className={`search-tab${typeTab === tab.key ? ' active' : ''}`}
              onClick={() => { setTypeTab(tab.key); setVisible(24) }}
            >
              {tab.label}
              <span className="search-tab-count">{typeCounts[tab.key]}</span>
            </button>
          ))}
        </div>
        <div className="search-toolbar-right">
          <LayoutToggle />
          <div className="sort">
            <span>Sort:</span>
            {['Relevance', 'Title', 'Year'].map(s => (
              <button
                key={s}
                className={sort === s.toLowerCase() ? 'selected' : ''}
                onClick={() => setSort(s.toLowerCase())}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="search-loading"><p>Loading catalog…</p></div>
      ) : shown.length === 0 ? (
        <div className="empty-box search-empty">
          <h2>No results for "{search}"</h2>
          <p>Try actor names, genres, languages, or collection names.</p>
          <button className="outline-btn" onClick={() => setSearch('')}>Clear search</button>
        </div>
      ) : (
        <>
          <div className={`catalog-grid ${view}`}>
            {shown.map(item => (
              <MediaCard key={item.id} item={item} mode={view} onSelect={onOpenTitle} />
            ))}
          </div>

          {shown.length >= 12 && <AdSlot slot="SLOT_HOME_MID" className="ad-infeed" />}
          {shown.length >= 6  && <AdNativeBanner className="ad-native-search" />}

          {hasMore && (
            <div className="load-more">
              <button
                className="outline-btn"
                onClick={() => setVisible(v => v + 24)}
              >
                Show more <span>+{Math.min(24, filtered.length - shown.length)}</span> →
              </button>
              <small>{shown.length} shown · {filtered.length} total</small>
            </div>
          )}
        </>
      )}
    </main>
  )
}
