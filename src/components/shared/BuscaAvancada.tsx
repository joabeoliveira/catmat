'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBuscaItens, type BuscaItem } from '@/hooks/useBuscaItens'

export function BuscaAvancada() {
  const [termo, setTermo] = useState('papel')
  const [codigoGrupo, setCodigoGrupo] = useState('')
  const [codigoClasse, setCodigoClasse] = useState('')
  const [aplicaMargem, setAplicaMargem] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [criterioPreco, setCriterioPreco] = useState('media')
  const [precoCustomizado, setPrecoCustomizado] = useState('')
  const [gradeItens, setGradeItens] = useState<Array<Record<string, unknown>>>([])
  const { data, isLoading, mutate } = useBuscaItens()

  const carregarBusca = async (novaPagina = 1) => {
    await mutate({
      termo,
      pagina: novaPagina,
      limite: 4,
      filtros: {
        codigoGrupo: codigoGrupo ? [Number(codigoGrupo)] : undefined,
        codigoClasse: codigoClasse ? [Number(codigoClasse)] : undefined,
        aplicaMargemPreferencia: aplicaMargem === '' ? undefined : aplicaMargem === 'true',
      },
    })
    setPagina(novaPagina)
  }

  useEffect(() => {
    void carregarBusca(1)
  }, [])

  const adicionarItemGrade = (item: BuscaItem) => {
    if (typeof window === 'undefined') return
    const gradeAtual = JSON.parse(sessionStorage.getItem('grade_itens') || '[]') as Array<Record<string, unknown>>
    const existe = gradeAtual.some((i) => i.codigoItem === item.codigoItem)

    if (!existe) {
      const novaGrade = [...gradeAtual, { ...item, unidade: null, precoReferencia: null }]
      sessionStorage.setItem('grade_itens', JSON.stringify(novaGrade))
      setGradeItens(novaGrade)
      window.dispatchEvent(new Event('gradeAtualizada'))
    }
  }

  const resumoGrade = useMemo(() => gradeItens.length, [gradeItens])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const gradeAtual = JSON.parse(sessionStorage.getItem('grade_itens') || '[]') as Array<Record<string, unknown>>
    setGradeItens(gradeAtual)
  }, [])

  const exportarCsv = () => {
    if (!gradeItens.length) return

    const linhas = [
      ['codigoItem', 'descricaoItem', 'criterioPreco', 'precoSelecionado', 'observacao'],
      ...gradeItens.map((item) => {
        const valor = precoCustomizado && criterioPreco === 'personalizado' ? precoCustomizado : '0'
        return [String(item.codigoItem || ''), String(item.descricaoItem || ''), criterioPreco, valor, '']
      }),
    ]

    const csv = linhas.map((linha) => linha.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'grade-catmat.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void carregarBusca(1)
          }}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Buscar itens CATMAT/CATSER</CardTitle>
              <CardDescription>
                Consulte descrições, grupos, classes, PDM e filtre por margem de preferência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <Input
                    placeholder="Ex: papel couche, notebook, software"
                    value={termo}
                    onChange={(event) => setTermo(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? 'Buscando...' : 'Buscar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setFiltrosAbertos((value) => !value)}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </div>

              {filtrosAbertos && (
                <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Grupo</label>
                    <Select value={codigoGrupo} onChange={(event) => setCodigoGrupo(event.target.value)}>
                      <option value="">Todos</option>
                      <option value="70">70 - Informática</option>
                      <option value="93">93 - Papéis</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Classe</label>
                    <Select value={codigoClasse} onChange={(event) => setCodigoClasse(event.target.value)}>
                      <option value="">Todas</option>
                      <option value="7010">7010 - Computadores</option>
                      <option value="9310">9310 - Papéis</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Margem de preferência</label>
                    <Select value={aplicaMargem} onChange={(event) => setAplicaMargem(event.target.value)}>
                      <option value="">Todas</option>
                      <option value="true">Com margem</option>
                      <option value="false">Sem margem</option>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : data?.items?.length ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-400">Encontrados {data.total} resultados</p>
                <div className="flex flex-wrap gap-2">
                  {data.filtrosSugeridos?.grupos?.map((grupo) => (
                    <Badge key={grupo} variant="secondary">Grupo {grupo}</Badge>
                  ))}
                </div>
              </div>

              {data.items.map((item) => (
                <Card key={item.codigoItem}>
                  <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{item.codigoItem}</Badge>
                        <span className="text-sm text-slate-400">{item.codigoGrupo} - {item.nomeGrupo}</span>
                        <span className="text-sm text-slate-500">/</span>
                        <span className="text-sm text-slate-400">{item.codigoClasse} - {item.nomeClasse}</span>
                      </div>
                      <p className="font-medium text-white">{item.descricaoItem}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span>PDM: {item.codigoPdm}</span>
                        <span>NCM: {item.codigoNcm || '-'}</span>
                        {item.aplicaMargemPreferencia && <Badge variant="secondary">Margem preferência</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => adicionarItemGrade(item)}>
                      Adicionar à grade
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" disabled={pagina <= 1} onClick={() => void carregarBusca(pagina - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-slate-400">Página {data.pagina} de {data.totalPaginas}</span>
                <Button variant="outline" disabled={data.pagina >= data.totalPaginas} onClick={() => void carregarBusca(data.pagina + 1)}>
                  Próxima
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-slate-400">
                Nenhum resultado encontrado para o termo informado.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Grade de seleção</CardTitle>
            <CardDescription>Itens adicionados para posterior escolha de unidade e preço.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              <p className="font-medium text-white">{resumoGrade} itens na grade</p>
              <p className="mt-2">A seleção ficará salva no navegador até o fechamento da aba.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              <p className="font-medium text-white">Próximos passos</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Escolher unidade de medida via API do governo.</li>
                <li>Aplicar critérios de preço: menor, média, mediana ou personalizado.</li>
                <li>Espurgar outliers para alinhar ao mercado.</li>
              </ul>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
              <label className="block text-sm text-slate-300">Critério de preço</label>
              <Select value={criterioPreco} onChange={(event) => setCriterioPreco(event.target.value)}>
                <option value="menor">Menor</option>
                <option value="media">Média</option>
                <option value="mediana">Mediana</option>
                <option value="maior">Maior</option>
                <option value="personalizado">Personalizado</option>
              </Select>
              {criterioPreco === 'personalizado' && (
                <Input
                  placeholder="Valor personalizado"
                  value={precoCustomizado}
                  onChange={(event) => setPrecoCustomizado(event.target.value)}
                />
              )}
              <Button type="button" variant="outline" className="w-full" onClick={exportarCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}