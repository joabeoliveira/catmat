'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

type ArpDescricaoInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

export function ArpDescricaoInput({ value, onChange, placeholder, className = '' }: ArpDescricaoInputProps) {
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [aberto, setAberto] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const termo = value.trim()
    if (termo.length < 2) {
      requestRef.current?.abort()
      setSugestoes([])
      setAberto(false)
      return
    }

    const timer = window.setTimeout(() => {
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      void fetch(`/api/arp/sugestoes?q=${encodeURIComponent(termo)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : [])
        .then((resultado) => {
          if (!controller.signal.aborted) {
            setSugestoes(Array.isArray(resultado) ? resultado : [])
            setAberto(true)
          }
        })
        .catch(() => { if (!controller.signal.aborted) setAberto(false) })
    }, 180)

    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => { if (sugestoes.length) setAberto(true) }}
        onBlur={() => window.setTimeout(() => setAberto(false), 120)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950 ${className}`}
        role="combobox"
        aria-expanded={aberto && sugestoes.length > 0}
        aria-autocomplete="list"
      />
      {aberto && sugestoes.length > 0 ? (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {sugestoes.map((sugestao) => (
            <li key={sugestao} role="option">
              <button type="button" className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onMouseDown={() => { onChange(sugestao); setAberto(false) }}>
                {sugestao}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
