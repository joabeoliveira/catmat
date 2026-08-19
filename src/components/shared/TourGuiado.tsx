'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

interface Passo {
  alvo: string
  titulo: string
  texto: string
}

// Passos apontam para elementos com data-tour=...; os ausentes na tela são pulados
const PASSOS: Passo[] = [
  {
    alvo: '[data-tour="busca"]',
    titulo: '1. Busque o que precisa comprar',
    texto: 'Digite em linguagem natural — a busca entende acentos, erros de digitação e sugere termos do catálogo enquanto você escreve. Ex.: "caneta esferográfica", "dipirona 500mg".',
  },
  {
    alvo: '[data-tour="filtros"]',
    titulo: '2. Filtre por categoria',
    texto: 'Refine por grupo, classe, PDM e margem de preferência. As opções são geradas a partir dos próprios resultados.',
  },
  {
    alvo: '[data-tour="refinar"]',
    titulo: '3. Refine pelo descritivo',
    texto: 'Muitos itens parecidos? Digite palavras do descritivo (ex.: "preta", "500mg") para filtrar todos os resultados de uma vez. O selo verde mostra quais códigos têm compras registradas — esses viabilizam a pesquisa de preços.',
  },
  {
    alvo: '[data-tour="grade"]',
    titulo: '4. Monte sua grade de cotação',
    texto: 'Adicione itens, escolha unidade de fornecimento e critério de preço (média, mediana…), defina quantidades e veja o valor total estimado. Exporte o CSV para o seu ETP ou pesquisa de preços.',
  },
  {
    alvo: '[data-tour="navegacao"]',
    titulo: '5. Explore e organize',
    texto: 'Navegue o catálogo por Grupos, salve itens nos Favoritos e alterne entre tema claro e escuro. Tudo fica salvo no seu navegador.',
  },
]

const CHAVE = 'catmat:tour'

export function TourGuiado() {
  const [indice, setIndice] = useState<number | null>(null)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const passosDisponiveis = useCallback(
    () => PASSOS.filter((passo) => document.querySelector(passo.alvo)),
    [],
  )

  const encerrar = useCallback(() => {
    setIndice(null)
    try {
      localStorage.setItem(CHAVE, 'visto')
    } catch {
      // noop
    }
  }, [])

  const irPara = useCallback((novoIndice: number) => {
    const passos = passosDisponiveis()
    if (novoIndice < 0 || novoIndice >= passos.length) {
      encerrar()
      return
    }
    const alvo = document.querySelector(passos[novoIndice].alvo)
    if (!alvo) {
      encerrar()
      return
    }
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      const box = alvo.getBoundingClientRect()
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height })
      setIndice(novoIndice)
    }, 350)
  }, [passosDisponiveis, encerrar])

  // Primeira visita: inicia sozinho após a página assentar
  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE)) return
    } catch {
      return
    }
    const timer = window.setTimeout(() => irPara(0), 1200)
    return () => window.clearTimeout(timer)
  }, [irPara])

  // Fechar com Esc
  useEffect(() => {
    if (indice === null) return
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') encerrar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [indice, encerrar])

  const passos = typeof document !== 'undefined' && indice !== null ? passosDisponiveis() : []
  const passo = indice !== null ? passos[indice] : null

  // Tooltip abaixo do alvo; se não couber, acima
  const tooltipAbaixo = rect ? rect.top + rect.height + 190 < window.innerHeight : true

  return (
    <>
      <button
        type="button"
        onClick={() => irPara(0)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-cyan-500/50 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 shadow-lg transition hover:bg-cyan-50 dark:hover:bg-slate-800"
        aria-label="Ver dicas de uso"
      >
        <Lightbulb className="h-4 w-4" />
        Dicas
      </button>

      {passo && rect && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tour de dicas">
          {/* Fundo escurecido clicável para sair */}
          <div className="absolute inset-0" onClick={encerrar} />

          {/* Spotlight animado sobre o elemento destacado */}
          <div
            className="pointer-events-none absolute rounded-xl border-2 border-cyan-400 transition-all duration-300 ease-out"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)',
            }}
          >
            <div className="absolute inset-0 animate-pulse rounded-xl border-2 border-cyan-400/60" />
          </div>

          {/* Cartão da dica */}
          <div
            className="absolute w-[min(360px,calc(100vw-32px))] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-2xl transition-all duration-300 ease-out"
            style={{
              top: tooltipAbaixo ? rect.top + rect.height + 14 : undefined,
              bottom: tooltipAbaixo ? undefined : window.innerHeight - rect.top + 14,
              left: Math.min(Math.max(rect.left, 16), window.innerWidth - 380),
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{passo.titulo}</h3>
              <button type="button" onClick={encerrar} aria-label="Fechar dicas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{passo.texto}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                {passos.map((_, pontoIndice) => (
                  <span
                    key={pontoIndice}
                    className={`h-1.5 w-1.5 rounded-full ${pontoIndice === indice ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {indice !== null && indice > 0 && (
                  <button type="button" onClick={() => irPara(indice - 1)} className="rounded-md px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    Anterior
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (indice !== null && indice + 1 < passos.length ? irPara(indice + 1) : encerrar())}
                  className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-500"
                >
                  {indice !== null && indice + 1 < passos.length ? 'Próximo' : 'Entendi!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
