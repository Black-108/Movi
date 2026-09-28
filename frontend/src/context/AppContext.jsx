import { createContext, useContext, useState } from 'react'
import { useSystemTheme } from '../hooks/useSystemTheme'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, toggleTheme] = useSystemTheme()
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('movi-view') || 'grid' } catch { return 'grid' }
  })
  const [contentMode, setContentMode] = useState(() => {
    try { return localStorage.getItem('movi-mode') || 'all' } catch { return 'all' }
  })

  const updateView = value => {
    setView(value)
    try { localStorage.setItem('movi-view', value) } catch {}
  }
  const updateMode = value => {
    setContentMode(value)
    try { localStorage.setItem('movi-mode', value) } catch {}
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, view, setView: updateView, contentMode, setContentMode: updateMode }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
