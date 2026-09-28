import { useApp } from '../context/AppContext'
export function ThemeToggle() {
  const { theme, toggleTheme } = useApp()
  return <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span></button>
}
