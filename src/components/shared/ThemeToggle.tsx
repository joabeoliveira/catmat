'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [escuro, setEscuro] = useState(true)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'))
    setPronto(true)
  }, [])

  const alternar = () => {
    const novo = !escuro
    setEscuro(novo)
    document.documentElement.classList.toggle('dark', novo)
    try {
      localStorage.setItem('catmat:tema', novo ? 'dark' : 'light')
    } catch {
      // noop
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-400 transition hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400"
    >
      {pronto && escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
