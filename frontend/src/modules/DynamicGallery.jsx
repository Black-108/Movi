import { useMemo, useState } from 'react'
import { MediaCard } from './MediaCard'
import { Player } from './Player'
import { AdSlot } from '../components/AdSlot'
import { AdNativeBanner } from '../components/AdNativeBanner'
import { shuffle } from '../database/mediaCatalog'

function Tag({ children }) {
  return <span className="tag">#{children}</span>
}

export function DetailPage({ item, allItems, onOpenTitle, onOpenCategory, search, setSearch }) {
  const images = item.media.screenshot?.length ? item.media.screenshot : [item.media.main_poster].filter(Boolean)
  const [active, setActive] = useState(0)

  const suggestions = useMemo(() => {
    const genres = item.file_info.genre.toLowerCase().split(',').map(x => x.trim()).filter(Boolean)
    return shuffle(allItems.filter(candidate => {
      if (candidate.id === item.id) return false
      const sameType = candidate.content_type === item.content_type
      const sameCollection = candidate.collections?.some(x => item.collections?.includes(x))
      const sameGenre = candidate.file_info.genre.toLowerCase().split(',').some(g => genres.includes(g))
      return sameType || sameCollection || sameGenre || candidate.category === item.category
    })).slice(0, 8)
  }, [allItems, item])

  return (
    <main className="page detail-page">
      <div className="detail-topbar">
        <button className="back-btn" onClick={() => history.length > 1 ? history.back() : (window.location.hash = '#/home')}>← Back</button>
        <span className="eyebrow">Title details</span>
      </div>
      <div className="detail-inline-search">
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search another title…" aria-label="Search titles" />
        {search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}
      </div>

      <AdSlot slot="SLOT_TOP_DETAIL" className="ad-top" />

      <section className="detail-hero">
        <div className="detail-poster">
          {item.media.main_poster
            ? <img src={item.media.main_poster} alt={`${item.clean_title} poster`} />
            : <div className="poster-fallback">{item.clean_title.slice(0, 1)}</div>}
        </div>
        <div className="detail-main-copy">
          <div className="eyebrow">{item.category} · {item.file_info.release_date || 'Year n/a'}</div>
          <h1>{item.clean_title}</h1>
          {item.scraped_title && item.scraped_title !== item.clean_title && <p className="source-title">{item.scraped_title}</p>}
          {item.source_site_name && <p className="source-credit">Source: <span>{item.source_site_name}</span></p>}
          <p className="description">{item.file_info.description || 'No description has been added for this title.'}</p>

          <div className="detail-facts">
            <span>{item.file_info.duration || 'Duration —'}</span>
            <span>{item.file_info.language || 'Language —'}</span>
            <span>{item.file_info.genre || 'Genre —'}</span>
          </div>

          <div className="tag-cloud">
            {item.derivedTags.slice(0, 18).map(tag => <Tag key={tag}>{tag}</Tag>)}
          </div>

          <div className="detail-actions">
            {item.collections.slice(0, 2).map(id => {
              const label = id === 'south' ? 'South' : id.replace('-', ' ')
              return <button className="outline-btn" key={id} onClick={() => onOpenCategory(id)}>More {label}</button>
            })}
            {item.detail_page_url && (
              <a className="outline-btn" href={item.detail_page_url} target="_blank" rel="noreferrer noopener">
                Original page ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <Player downloads={item.downloads} title={item.clean_title} />

      <AdSlot slot="SLOT_MID_DETAIL" style="rectangle" className="ad-mid" />

      <section className="detail-section">
        <div className="section-label"><span className="eyebrow">Gallery</span><h2>Images &amp; screenshots</h2></div>
        <div className="gallery-large">
          <div className="gallery-main">
            {images[active] && (
              <img
                src={images[active]}
                alt={`${item.clean_title} screenshot ${active + 1}`}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={e => { e.currentTarget.style.opacity = '0' }}
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((src, index) => (
                <button key={`${src}-${index}`} className={active === index ? 'active' : ''} onClick={() => setActive(index)}>
                  <img src={src} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={e => { e.currentTarget.style.opacity = '0' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="detail-two-col">
        <div className="detail-section">
          <div className="section-label"><span className="eyebrow">Credits</span><h2>Cast</h2></div>
          <div className="chip-grid">
            {item.file_info.starcast.length
              ? item.file_info.starcast.map(name => <span className="info-chip" key={name}>{name}</span>)
              : <span className="muted">No cast information supplied.</span>}
          </div>
        </div>
        <div className="detail-section">
          <div className="section-label"><span className="eyebrow">Format info</span><h2>Known resolutions</h2></div>
          <div className="chip-grid">
            {item.file_info.available_sizes.length
              ? item.file_info.available_sizes.map(size => <span className="info-chip mono-chip" key={size}>{size}</span>)
              : <span className="muted">No size data supplied.</span>}
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-label"><span className="eyebrow">Where to Watch</span><h2>Streaming &amp; source links</h2></div>
        {item.downloads.length
          ? (
            <div className="source-grid">
              {item.downloads.map((download, index) => (
                <div className="source-card" key={download.id}>
                  <div className="source-card-top">
                    <span className="source-type">{download.is_direct_file ? 'Direct stream' : 'Streaming page'}</span>
                    <span className="source-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{download.label || 'External source'}</h3>
                  <p>Movi is an index — we link to external sites and do not host, proxy, or alter any media.</p>
                  {download.link && (
                    <a className="primary-btn" href={download.link} target="_blank" rel="noreferrer noopener">
                      Watch / Visit ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
          : <div className="empty-box">No streaming sources were found for this title in our index.</div>}
        <p className="legal-callout">Movi is a discovery index. Always access content through channels you are legally permitted to use in your region.</p>
      </section>

      <AdNativeBanner className="ad-native-detail" />

      <AdSlot slot="SLOT_BOTTOM_DETAIL" className="ad-bottom" />

      <section className="detail-section">
        <div className="section-label"><span className="eyebrow">Suggestions</span><h2>More like this</h2></div>
        <div className="catalog-grid">{suggestions.map(candidate => <MediaCard key={candidate.id} item={candidate} onSelect={onOpenTitle} />)}</div>
      </section>
    </main>
  )
}
