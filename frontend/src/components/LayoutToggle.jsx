import { useApp } from '../context/AppContext'
export function LayoutToggle() {
  const { view, setView } = useApp()
  return <div className="view-toggle" aria-label="Layout view">
    <button onClick={() => setView('grid')} className={view === 'grid' ? 'active' : ''} aria-label="Grid view">▦</button>
    <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''} aria-label="List view">☷</button>
  </div>
}
