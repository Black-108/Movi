const TYPE_BADGE = { anime: '🎌', series: '📺', movie: '🎬' }

export function MediaCard({ item, mode = 'grid', onSelect }) {
  const quality = item._qualityBadge || item.file_info.available_sizes?.at(-1)
  const collection = item.collections?.[0]
  const typeBadge = TYPE_BADGE[item.content_type] || ''

  return (
    <article className={`media-card ${mode}`}>
      <button className="card-hit" onClick={() => onSelect(item.id)} aria-label={`Open details for ${item.clean_title}`} />
      <div className="poster">
        {item.media.main_poster
          ? <img src={item.media.main_poster} alt={`${item.clean_title} poster`} loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
          : <div className="poster-fallback">{item.clean_title.slice(0, 1)}</div>}
        {quality && <span className="quality">{quality}</span>}
        {typeBadge && <span className="type-badge">{typeBadge}</span>}
        {item.source_site_name && <span className="source-badge">{item.source_site_name}</span>}
        <span className="poster-overlay"><span>Details</span><b>→</b></span>
      </div>
      <div className="card-body">
        <div className="eyebrow">{item.category}{item.file_info.release_date ? ` · ${item.file_info.release_date}` : ''}</div>
        <h3>{item.clean_title}</h3>
        <p>{item.file_info.genre || collection || 'Media'}</p>
        <div className="card-meta">
          {item.file_info.duration && <span>{item.file_info.duration}</span>}
          {item.file_info.language && <span>{item.file_info.language}</span>}
        </div>
      </div>
    </article>
  )
}
