import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Dashboard } from './views/Dashboard'
import { TroubleshootingPortal } from './views/TroubleshootingPortal'
import { AdSocialBar } from './components/AdSocialBar'
import './styles.css'

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!hash) return { page: 'home' }
  const parts = hash.split('/').filter(Boolean)
  if (parts[0] === 'title' && parts[1]) return { page: 'detail', id: parts[1] }
  if (parts[0] === 'category' && parts[1]) return { page: 'category', category: parts[1] }
  if (['home', 'movies', 'series', 'anime'].includes(parts[0])) return { page: parts[0] }
  if (parts[0] === 'diagnostics') return { page: 'diagnostics' }
  return { page: 'home' }
}

function go(page) {
  window.location.hash = page.startsWith('/') ? page : `/${page}`
}

function App() {
  const [route, setRoute] = useState(parseRoute)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const labels = {
      home: 'Home', movies: 'Movies', series: 'Web Series', anime: 'Anime',
      detail: 'Details', category: 'Collection', diagnostics: 'Diagnostics',
    }
    document.title = `Movi — ${labels[route.page] || 'Media Library'}`
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  const setPage = page => go(page)
  const openCategory = id => go(`/category/${id}`)
  const openTitle = id => go(`/title/${id}`)

  return (
    <AppProvider>
      <AdSocialBar />
      <Nav route={route} setPage={setPage} search={search} setSearch={setSearch} />
      {route.page === 'diagnostics'
        ? <TroubleshootingPortal onBack={() => setPage('home')} />
        : <Dashboard route={route} search={search} setSearch={setSearch} onOpenTitle={openTitle} onOpenCategory={openCategory} />}
      <Footer onDiagnostics={() => setPage('diagnostics')} />
    </AppProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
