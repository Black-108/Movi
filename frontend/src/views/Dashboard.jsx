import { useEffect, useMemo, useState } from 'react'
import {
  getCollection, getCollectionDefinitions, getCategoryPageDefinitions,
  loadMediaCatalog, matchesSearch, shuffle, filterByContentMode,
} from '../database/mediaCatalog'
import { LayoutToggle } from '../components/LayoutToggle'
import { AdSlot } from '../components/AdSlot'
import { AdNativeBanner } from '../components/AdNativeBanner'
import { MediaCard } from '../modules/MediaCard'
import { DetailPage } from '../modules/DynamicGallery'
import { useApp } from '../context/AppContext'

const MODE_LABELS = {
  all: { title: 'All Media', eyebrow: 'Full catalog' },
  movie: { title: 'Movies archive.', eyebrow: 'Movie library' },
  series: { title: 'Web Series archive.', eyebrow: 'Series library' },
  anime: { title: 'Anime archive.', eyebrow: 'Anime library' },
}

// ── Hero Banner ───────────────────────────────────────────────────────────────

function HeroBanner({ items, onOpenTitle }) {
  const tiles = useMemo(() => {
    const withPoster = items.filter(i => i.media.main_poster)
    const trending   = withPoster.filter(i => i.is_trending)
    const rest       = shuffle(withPoster.filter(i => !i.is_trending))
    const base       = [...trending, ...rest].slice(0, 40)
    return [...base, ...base] // duplicate for seamless CSS loop
  }, [items])

  if (!tiles.length) return null

  return (
    <div className="hero-banner" aria-label="Featured titles scroll">
      <div className="banner-track">
        {tiles.map((item, idx) => (
          <button
            key={`${item.id}-${idx}`}
            className="banner-tile"
            onClick={() => onOpenTitle(item.id)}
            aria-label={`Open ${item.clean_title}`}
          >
            <img
              src={item.media.main_poster}
              alt=""
              loading="lazy"
              onError={e => { e.currentTarget.style.opacity = '0' }}
            />
            <div className="banner-tile-info">
              <div className="banner-tile-title">{item.clean_title}</div>
              <div className="banner-tile-caps">
                {item.is_new && <span className="bcap bcap-new">NEW</span>}
                {item.file_info.release_date && (
                  <span className="bcap">{item.file_info.release_date}</span>
                )}
                {item.content_type === 'series' && <span className="bcap bcap-series">Series</span>}
                {item.content_type === 'anime'  && <span className="bcap bcap-anime">Anime</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal scroll row (Trending / New) ────────────────────────────────────

function HorizontalRow({ title, eyebrow, items, onOpenTitle }) {
  if (!items.length) return null
  return (
    <section className="horiz-section">
      <div className="section-top">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="horiz-scroll">
        {items.map(item => (
          <button key={item.id} className="horiz-card" onClick={() => onOpenTitle(item.id)}>
            <div className="horiz-poster">
              {item.media.main_poster
                ? <img src={item.media.main_poster} alt={item.clean_title} loading="lazy" onError={e => { e.currentTarget.style.opacity = '0' }} />
                : <div className="poster-fallback">{item.clean_title[0]}</div>}
              {item.is_new && <span className="bcap bcap-new horiz-badge">NEW</span>}
              {item.file_info.release_date && (
                <span className="horiz-year">{item.file_info.release_date}</span>
              )}
            </div>
            <div className="horiz-info">
              <p className="horiz-title">{item.clean_title}</p>
              <div className="horiz-caps">
                {item.content_type === 'series' && <span className="bcap bcap-series">Series</span>}
                {item.content_type === 'anime'  && <span className="bcap bcap-anime">Anime</span>}
                {item.file_info.genre && (
                  <span className="bcap">{item.file_info.genre.split(',')[0].trim()}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── Category cards grid ───────────────────────────────────────────────────────

function CategoryCards({ items, onOpenCategory }) {
  const categories = useMemo(() => getCategoryPageDefinitions(items), [items])
  if (!categories.length) return null

  return (
    <section className="cat-section">
      <div className="section-top">
        <div>
          <span className="eyebrow">Browse by category</span>
          <h2>Explore <em>genres.</em></h2>
        </div>
      </div>
      <div className="cat-grid">
        {categories.map(cat => {
          const catItems = items.filter(i => i.source_category === cat.raw && i.media.main_poster)
          const posters  = catItems.slice(0, 4).map(i => i.media.main_poster)
          return (
            <button key={cat.id} className="cat-card" onClick={() => onOpenCategory(cat.id)}>
              <div className="cat-card-posters">
                {posters.map((p, pi) => (
                  <img key={pi} src={p} alt="" loading="lazy" onError={e => { e.currentTarget.style.opacity = '0' }} />
                ))}
                {posters.length === 0 && <div className="cat-card-placeholder" />}
              </div>
              <div className="cat-card-overlay">
                <span className="cat-card-emoji">{cat.emoji}</span>
                <span className="cat-card-name">{cat.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function InlineSearch({ value, setValue, compact = false }) {
  return (
    <div className={`inline-search ${compact ? 'compact' : ''}`}>
      <span aria-hidden="true">⌕</span>
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="Search titles, actors, genres, languages…" aria-label="Search" />
      {value && <button onClick={() => setValue('')} aria-label="Clear search">×</button>}
    </div>
  )
}

function sortItems(items, mode) {
  const copy = [...items]
  if (mode === 'Recent') return copy.sort((a, b) => Number(b.file_info.release_date || 0) - Number(a.file_info.release_date || 0))
  if (mode === 'Title')  return copy.sort((a, b) => a.clean_title.localeCompare(b.clean_title))
  return shuffle(copy)
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function Dashboard({ route, search, setSearch, onOpenTitle, onOpenCategory }) {
  const { view, contentMode } = useApp()
  const [items, setItems]     = useState([])
  const [sort, setSort]       = useState('Random')
  const [visible, setVisible] = useState(15)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [heroItems, setHeroItems] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    loadMediaCatalog().then(data => {
      setItems(data)
      setHeroItems(shuffle(data.filter(i => i.media.main_poster)).slice(0, 6))
      if (!data.length) setError('Movi.json could not be loaded or contains no catalog items.')
    }).catch(() => setError('Unable to load Movi.json.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => { setVisible(15) }, [route.page, route.category, search, contentMode])

  useEffect(() => {
    if (heroItems.length < 2 || route.page !== 'home') return
    const t = setInterval(() => setHeroIndex(i => (i + 1) % heroItems.length), 4800)
    return () => clearInterval(t)
  }, [heroItems.length, route.page])

  useEffect(() => { if (heroIndex >= heroItems.length) setHeroIndex(0) }, [heroIndex, heroItems.length])

  const searchText    = search.trim()
  const modeFiltered  = useMemo(() => filterByContentMode(items, contentMode), [items, contentMode])
  const searchFiltered = useMemo(() => modeFiltered.filter(item => matchesSearch(item, searchText)), [modeFiltered, searchText])
  const collection    = useMemo(() => route.page === 'category' ? getCollection(items, route.category) : null, [items, route.page, route.category])
  const collectionBase = useMemo(() => collection ? collection.items.filter(item => matchesSearch(item, searchText)) : [], [collection, searchText])
  const collectionResults = useMemo(() => sortItems(collectionBase, sort), [collectionBase, sort])
  const featuredAll   = useMemo(() => sortItems(searchFiltered, sort), [searchFiltered, sort])
  const featured      = featuredAll.slice(0, visible)

  const isLibrary     = ['movies', 'series', 'anime'].includes(route.page)
  const libraryTypeMap = { movies: 'movie', series: 'series', anime: 'anime' }
  const libraryBase   = useMemo(() => {
    if (!isLibrary) return []
    const type = libraryTypeMap[route.page]
    return searchFiltered.filter(item => item.content_type === type)
  }, [isLibrary, searchFiltered, route.page])
  const libraryResults = useMemo(() => sortItems(libraryBase, sort), [libraryBase, sort])

  // Derived home-page rows
  const trendingItems = useMemo(() => modeFiltered.filter(i => i.is_trending), [modeFiltered])
  const newItems      = useMemo(() => modeFiltered.filter(i => i.is_new), [modeFiltered])

  if (loading) return (
    <main className="page loading-page">
      <span className="eyebrow">Loading Movi.json</span>
      <h1>Preparing your <em>library.</em></h1>
      <p>Reading the local catalog and building collections.</p>
    </main>
  )

  if (route.page === 'detail') {
    const item = items.find(x => String(x.id) === String(route.id))
    if (!item) return <main className="page"><div className="empty-box">That title could not be found in Movi.json.</div></main>
    return <DetailPage item={item} allItems={items} onOpenTitle={onOpenTitle} onOpenCategory={onOpenCategory} search={search} setSearch={setSearch} />
  }

  if (route.page === 'category') {
    if (!collection) return <main className="page"><div className="empty-box"><h2>Collection not found</h2></div></main>
    const shown = collectionResults.slice(0, visible)
    const tags  = [...new Set(collectionBase.flatMap(x => x.derivedTags || []))].slice(0, 24)
    return (
      <main className="page">
        {error && <DataAlert text={error} />}
        <AdSlot slot="SLOT_CATEGORY_TOP" className="ad-top" />
        <section className="collection-head">
          <div>
            <span className="eyebrow">Collection</span>
            <h1>{collection.title}</h1>
            <p>Search, sort, and open any title for its full record.</p>
            <div className="tag-cloud">
              {tags.map(tag => <button key={tag} className="tag tag-button" onClick={() => setSearch(tag)}>{tag}</button>)}
            </div>
          </div>
          <div className="collection-stat"><b>{collection.count}</b><span>titles</span></div>
        </section>
        <CatalogToolbar search={search} setSearch={setSearch} sort={sort} setSort={setSort} />
        <div className={`catalog-grid ${view}`}>
          {shown.map(item => <MediaCard key={item.id} item={item} mode={view} onSelect={onOpenTitle} />)}
        </div>
        <LoadMore shown={shown.length} total={collectionResults.length} visible={visible} setVisible={setVisible} max={collectionResults.length} />
      </main>
    )
  }

  if (route.page === 'home') {
    const hero = heroItems[heroIndex]
    return (
      <main className="page home-page">
        {error && <DataAlert text={error} />}
        <AdSlot slot="SLOT_HOME_TOP" style="leaderboard" className="ad-home-top" />

        {/* ── Auto-scroll banner ── */}
        <HeroBanner items={modeFiltered} onOpenTitle={onOpenTitle} />

        {/* ── Compact hero (search + featured card) ── */}
        <section className="hero hero-compact">
          <div className="hero-copy">
            <span className="eyebrow">Multi-source media catalog</span>
            <h1>Find your next<br /><em>watch.</em></h1>
            <p>Movi aggregates movies, series and anime from multiple sources into one searchable catalog.</p>
            <InlineSearch value={search} setValue={setSearch} />
            {hero && (
              <div className="hero-cta-row">
                <button className="primary-btn" onClick={() => onOpenTitle(hero.id)}>
                  Open featured <span>→</span>
                </button>
                <span className="hero-note">{items.length} titles</span>
              </div>
            )}
          </div>
          {hero && (
            <div className="hero-visual">
              <button className="hero-click" onClick={() => onOpenTitle(hero.id)} aria-label={`Open ${hero.clean_title}`} />
              <img key={hero.id} src={hero.media.screenshot?.[0] || hero.media.main_poster} alt={`${hero.clean_title} artwork`} />
              <div className="hero-label">
                <span className="play">▶</span>
                <div><b>{hero.clean_title}</b><small>{hero.category}</small></div>
              </div>
              <div className="hero-dots">
                {heroItems.map((x, i) => (
                  <button key={x.id} className={i === heroIndex ? 'active' : ''} onClick={e => { e.stopPropagation(); setHeroIndex(i) }} aria-label={`Show ${x.clean_title}`} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Trending Now ── */}
        {!searchText && trendingItems.length > 0 && (
          <HorizontalRow
            title="Trending Now"
            eyebrow="Featured on homepage"
            items={trendingItems}
            onOpenTitle={onOpenTitle}
          />
        )}

        {/* ── New in 2026 ── */}
        {!searchText && newItems.length > 0 && (
          <HorizontalRow
            title="New in 2026"
            eyebrow="Latest releases"
            items={newItems.slice(0, 40)}
            onOpenTitle={onOpenTitle}
          />
        )}

        {/* ── Native Banner (between rows and category cards) ── */}
        {!searchText && <AdNativeBanner className="ad-native-home" />}

        {/* ── Category cards ── */}
        {!searchText && <CategoryCards items={modeFiltered} onOpenCategory={onOpenCategory} />}

        {/* ── Full catalog grid ── */}
        <section className="catalog">
          <div className="section-top">
            <div>
              <span className="eyebrow">Homepage catalog</span>
              <h2>All <em>titles.</em></h2>
            </div>
            <span className="count">{Math.min(visible, searchFiltered.length)} of {searchFiltered.length}</span>
          </div>
          <CatalogToolbar search={search} setSearch={setSearch} sort={sort} setSort={setSort} />
          <div className={`catalog-grid ${view}`}>
            {featured.map(item => <MediaCard key={item.id} item={item} mode={view} onSelect={onOpenTitle} />)}
          </div>
          {featured.length > 5 && <AdSlot slot="SLOT_HOME_MID" style="auto" className="ad-infeed" />}
          <LoadMore shown={featured.length} total={searchFiltered.length} visible={visible} setVisible={setVisible} max={30} home />
        </section>

        {/* ── Collection directory ── */}
        {!searchText && (
          <section className="collection-directory">
            <div>
              <span className="eyebrow">All detected collections</span>
              <h2>More ways to <em>browse.</em></h2>
            </div>
            <div className="directory-tags">
              {getCollectionDefinitions(modeFiltered).map(def => (
                <button key={def.id} className="tag tag-button" onClick={() => onOpenCategory(def.id)}>
                  {def.title} <span>· {def.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {searchText && (
          <section className="search-summary">
            <span className="eyebrow">Global search</span>
            <h2>Searching across titles, cast, genres, languages and tags.</h2>
            <p>{searchFiltered.length} matching titles.</p>
          </section>
        )}

        <AdSlot slot="SLOT_HOME_BOTTOM" style="leaderboard" className="ad-home-bottom" />
      </main>
    )
  }

  const shown    = libraryResults.slice(0, visible)
  const pageInfo = MODE_LABELS[libraryTypeMap[route.page]] || MODE_LABELS.all
  return (
    <main className="page">
      {error && <DataAlert text={error} />}
      <AdSlot slot="SLOT_LIBRARY_TOP" style="leaderboard" className="ad-top" />
      <section className="library-head">
        <div>
          <span className="eyebrow">{pageInfo.eyebrow}</span>
          <h1><em>{pageInfo.title}</em></h1>
          <p>Search reaches title, scraped title, cast, genres, language, description and tags.</p>
        </div>
        <div className="collection-stat"><b>{libraryResults.length}</b><span>results</span></div>
      </section>
      <CatalogToolbar search={search} setSearch={setSearch} sort={sort} setSort={setSort} />
      <div className={`catalog-grid ${view}`}>
        {shown.map(item => <MediaCard key={item.id} item={item} mode={view} onSelect={onOpenTitle} />)}
      </div>
      <LoadMore shown={shown.length} total={libraryResults.length} visible={visible} setVisible={setVisible} max={libraryResults.length} />
    </main>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function CatalogToolbar({ search, setSearch, sort, setSort }) {
  return (
    <div className="catalog-toolbar">
      <LayoutToggle />
      <div className={`inline-search compact`}>
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles, actors, genres…" aria-label="Search" />
        {search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}
      </div>
      <div className="sort">
        <span>Sort:</span>
        {['Random', 'Recent', 'Title'].map(mode => (
          <button key={mode} className={sort === mode ? 'selected' : ''} onClick={() => setSort(mode)}>{mode}</button>
        ))}
      </div>
    </div>
  )
}

// ── Load more ─────────────────────────────────────────────────────────────────

function LoadMore({ shown, total, visible, setVisible, max, home = false }) {
  if (!total) return <div className="empty">No titles match the current search.</div>
  const next = Math.min(home ? 30 : total, visible + (home ? 15 : 24))
  if (shown < total && shown < max) return (
    <div className="load-more">
      <button className="outline-btn" onClick={() => setVisible(next)}>Show more <span>+{Math.min(next, max) - shown}</span> →</button>
      <small>{shown} shown · {home ? 'homepage cap: 30' : `${total} available`}</small>
    </div>
  )
  if (home && total > 30) return (
    <div className="load-more">
      <button className="outline-btn" onClick={() => window.location.hash = '#/movies'}>Browse the full library →</button>
      <small>Homepage capped at 30 titles.</small>
    </div>
  )
  return null
}

function DataAlert({ text }) {
  return <div className="data-alert"><b>Catalog issue</b><span>{text}</span><code>Check Movi.json and reload.</code></div>
}
