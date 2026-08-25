import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CopiarCodigoButton } from '@/components/shared/CopiarCodigoButton'
import { FavoritoButton } from '@/components/shared/FavoritoButton'
import { VoltarButton } from '@/components/shared/VoltarButton'
import { GraficoDispersaoPrecos } from '@/components/shared/GraficoDispersaoPrecos'
import { CatmatService } from '@/features/catmar/catmat.service'
import { getSiteUrl } from '@/lib/site-config'

interface MaterialPageProps {
  params: { codigo: string }
}

function formatarMoeda(valor: number | null | undefined) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return '—'
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatarQuantidade(valor: number | null | undefined) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) return null
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

// A URL aceita "/material/267203" e "/material/267203-slug-descritivo"
function extrairCodigo(param: string) {
  const codigo = Number.parseInt(param, 10)
  return Number.isInteger(codigo) && codigo > 0 ? codigo : null
}

function gerarSlug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Descrições CATMAT seguem o padrão "NOME, ATRIBUTO:VALOR, ATRIBUTO:VALOR".
// Segmentos sem ":" após o primeiro atributo são continuação do valor anterior
// (valores podem conter vírgulas, ex.: "500MG + 10MG, SOLUÇÃO ORAL").
function parseCaracteristicas(descricao: string) {
  const segmentos = descricao.split(',').map((segmento) => segmento.trim()).filter(Boolean)
  const caracteristicas: Array<{ chave: string; valor: string }> = []
  let nome = ''

  for (const segmento of segmentos) {
    const separador = segmento.indexOf(':')
    if (separador > 0) {
      caracteristicas.push({
        chave: segmento.slice(0, separador).trim(),
        valor: segmento.slice(separador + 1).trim(),
      })
    } else if (caracteristicas.length) {
      const ultima = caracteristicas[caracteristicas.length - 1]
      ultima.valor = `${ultima.valor}, ${segmento}`
    } else {
      nome = nome ? `${nome}, ${segmento}` : segmento
    }
  }

  return { nome: nome || descricao, caracteristicas }
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const codigo = extrairCodigo(params.codigo)
  const service = new CatmatService()
  const item = codigo ? await service.obterItem(codigo) : null

  if (!item) {
    return {
      title: 'Material não encontrado',
      description: 'O item solicitado não foi encontrado no catálogo CATMAT.',
    }
  }

  return {
    title: `CATMAT ${item.codigoItem} — ${item.nomePdm}`,
    description: `${item.descricaoItem.slice(0, 120)}. Consulte preços públicos, características e histórico de licitações.`,
    alternates: {
      canonical: `${getSiteUrl()}/material/${item.codigoItem}-${gerarSlug(item.descricaoItem)}`,
    },
  }
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const codigo = extrairCodigo(params.codigo)
  if (!codigo) {
    notFound()
  }

  const service = new CatmatService()
  const item = await service.obterItem(codigo)

  if (!item) {
    notFound()
  }

  const estatisticas = await service.obterEstatisticasPreco(item.codigoItem)
  const relacionados = (await service.buscarItens({
    termo: '',
    pagina: 1,
    limite: 10,
    filtros: {
      codigoPdm: [item.codigoPdm],
    },
  })).items.filter((candidate) => candidate.codigoItem !== item.codigoItem).slice(0, 10)

  const { caracteristicas } = parseCaracteristicas(item.descricaoItem)
  const comprasRecentes = Array.isArray(estatisticas?.comprasRecentes) ? estatisticas.comprasRecentes : []

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <VoltarButton />
        </div>
        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/" className="hover:text-cyan-600 dark:hover:text-cyan-400">Início</Link>
          <span>/</span>
          <Link href={`/?grupo=${item.codigoGrupo}`} className="hover:text-cyan-600 dark:hover:text-cyan-400">{item.nomeGrupo}</Link>
          <span>/</span>
          <Link href={`/?classe=${item.codigoClasse}`} className="hover:text-cyan-600 dark:hover:text-cyan-400">{item.nomeClasse}</Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300">CATMAT {item.codigoItem}</span>
        </nav>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Material</p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{item.nomePdm}</h1>
            <div className="flex items-center gap-2">
              <FavoritoButton
                comTexto
                item={{ codigoItem: item.codigoItem, descricaoItem: item.descricaoItem, nomePdm: item.nomePdm }}
              />
              <CopiarCodigoButton codigo={item.codigoItem} />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{item.descricaoItem}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1">CATMAT {item.codigoItem}</span>
            <span className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1">Grupo {item.codigoGrupo}</span>
            <span className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1">Classe {item.codigoClasse}</span>
            <span className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1">PDM {item.codigoPdm}</span>
            {item.codigoNcm && <span className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1">NCM {item.codigoNcm}</span>}
          </div>
        </div>

        {caracteristicas.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Características</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {caracteristicas.map((caracteristica) => (
                <div key={caracteristica.chave} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{caracteristica.chave}</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-white">{caracteristica.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sobre este material</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              O material de código <strong className="text-slate-900 dark:text-white">CATMAT {item.codigoItem}</strong> pertence ao
              grupo <strong className="text-slate-900 dark:text-white">{item.nomeGrupo}</strong>, classe{' '}
              <strong className="text-slate-900 dark:text-white">{item.nomeClasse}</strong>, sob o padrão descritivo de material (PDM){' '}
              <strong className="text-slate-900 dark:text-white">{item.nomePdm}</strong>
              {item.codigoNcm ? <> e NCM <strong className="text-slate-900 dark:text-white">{item.codigoNcm}</strong></> : null}.
              Este código é utilizado por órgãos públicos para padronizar compras em conformidade com o Catálogo de
              Materiais do Compras.gov.br e o PNCP.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Grupo:</span>{' '}
                <Link href={`/?grupo=${item.codigoGrupo}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">{item.codigoGrupo} — {item.nomeGrupo}</Link>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Classe:</span>{' '}
                <Link href={`/?classe=${item.codigoClasse}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">{item.codigoClasse} — {item.nomeClasse}</Link>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">PDM:</span>{' '}
                <Link href={`/?grupo=${item.codigoGrupo}&classe=${item.codigoClasse}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">{item.codigoPdm} — {item.nomePdm}</Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Estatísticas de preço</h2>
            {estatisticas && estatisticas.quantidadeCompras ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Média</span><span className="font-medium text-slate-900 dark:text-white">{formatarMoeda(estatisticas.media)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Mediana</span><span className="font-medium text-slate-900 dark:text-white">{formatarMoeda(estatisticas.mediana)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Menor</span><span className="font-medium text-slate-900 dark:text-white">{formatarMoeda(estatisticas.menor)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Maior</span><span className="font-medium text-slate-900 dark:text-white">{formatarMoeda(estatisticas.maior)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Compras</span><span className="font-medium text-slate-900 dark:text-white">{estatisticas.quantidadeCompras}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400">Outliers removidos</span><span className="font-medium text-slate-900 dark:text-white">{estatisticas.quantidadeOutliersRemovidos}</span></div>
                <div className="text-xs text-slate-500">Período considerado: {formatarData(estatisticas.periodoInicio)} a {formatarData(estatisticas.periodoFim)}</div>
                <div className="text-xs text-slate-500">Fonte: Compras.gov.br / PNCP</div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Sem histórico de compras registrado.</p>
            )}
          </div>
        </div>

        {Array.isArray(estatisticas?.seriePrecos) && estatisticas.seriePrecos.length >= 3 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dispersão de preços</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {estatisticas.seriePrecos.length} preços licitados ao longo do tempo, com outliers destacados.
            </p>
            <div className="mt-4">
              <GraficoDispersaoPrecos pontos={estatisticas.seriePrecos} mediana={estatisticas.mediana} limiteSuperior={estatisticas.limiteSuperior} />
            </div>
          </div>
        )}

        {comprasRecentes.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico de licitações</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Compras públicas mais recentes registradas para este item.</p>
            <div className="mt-4 grid gap-3">
              {comprasRecentes.map((compra, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-sm">
                    {compra.orgao && <div className="font-medium text-slate-900 dark:text-white">{compra.orgao}{compra.uasg && compra.uasg !== compra.orgao ? ` — ${compra.uasg}` : ''}</div>}
                    {compra.fornecedor && (
                      <div className="mt-1 text-slate-600 dark:text-slate-400">
                        Fornecedor: {compra.fornecedor}
                        {compra.municipio ? ` · ${compra.municipio}${compra.estado ? `/${compra.estado}` : ''}` : compra.estado ? ` · ${compra.estado}` : ''}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      {formatarQuantidade(compra.quantidade) ? `Qtd: ${formatarQuantidade(compra.quantidade)}${compra.unidade ? ` ${compra.unidade}` : ''}` : null}
                      {compra.marca ? ` · Marca: ${compra.marca}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{formatarMoeda(compra.precoUnitario)}</div>
                    {compra.unidade && <div className="text-xs text-slate-500">/{compra.unidade}</div>}
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{formatarData(compra.dataCompra)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {relacionados.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Itens do mesmo PDM</h2>
            <div className="mt-4 grid gap-3">
              {relacionados.map((candidate) => (
                <Link key={candidate.codigoItem} href={`/material/${candidate.codigoItem}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 p-3 text-sm text-slate-700 dark:text-slate-300 hover:border-cyan-500">
                  <div className="font-medium text-slate-900 dark:text-white">{candidate.descricaoItem}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">CATMAT {candidate.codigoItem}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
