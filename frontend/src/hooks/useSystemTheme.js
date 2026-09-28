import { useEffect, useState } from 'react'

export function useSystemTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('movi-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('movi-theme', theme) }, [theme])
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')]
}
