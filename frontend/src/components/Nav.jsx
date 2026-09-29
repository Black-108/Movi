import { useEffect, useRef } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { useApp } from '../context/AppContext'

const MODES = [
  { key: 'all',    label: 'All' },
  { key: 'movie',  label: '🎬 Movies' },
  { key: 'series', label: '📺 Series' },
  { key: 'anime',  label: '🎌 Anime' },
]

export function Nav({ route, setPage, search, setSearch }) {
  const { contentMode, setContentMode } = useApp()
  const inputRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearch('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearch])

  function handleModeChange(mode) {
    setContentMode(mode)
    if (mode === 'movie') setPage('movies')
    else if (mode === 'series') setPage('series')
    else if (mode === 'anime') setPage('anime')
    else setPage('home')
  }

  return (
    <header className="nav-shell">
      <nav className="nav">
        <button className="brand" onClick={() => { setContentMode('all'); setPage('home') }} aria-label="Go to Movi home">
          <span className="brand-mark">M</span><span>Movi</span>
        </button>

        <div className="mode-toggle" role="group" aria-label="Content type filter">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-btn${contentMode === m.key ? ' active' : ''}`}
              onClick={() => handleModeChange(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className={`search${search ? ' search-active' : ''}`}>
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search titles, actors, genres…"
            aria-label="Search catalog"
          />
          {search
            ? <button onClick={() => setSearch('')} aria-label="Clear search" className="search-clear">×</button>
            : <kbd>Ctrl K</kbd>}
        </div>

        <div className="nav-actions">
          <button className="text-btn" onClick={() => setPage('diagnostics')}>Diagnostics</button>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
