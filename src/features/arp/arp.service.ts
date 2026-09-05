import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const arpDb = prisma
const execFileAsync = promisify(execFile)

const API = 'https://dadosabertos.compras.gov.br'
const PAGE_SIZE = 200
const ADESAO_PAGE_SIZE = 500

function date(value: unknown) {
  return typeof value === 'string' && value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null
}
function datetime(value: unknown) { return typeof value === 'string' && value ? new Date(value) : null }
function number(value: unknown) { if (value === null || value === undefined || value === '') return null; const n = Number(value); return Number.isFinite(n) ? n : null }

export async function consultar(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params)
  const url = `${API}/${path}?${query}`
  let lastError: unknown
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      if (process.env.ARP_TRANSPORT === 'curl') {
        try {
          const { stdout } = await execFileAsync(process.platform === 'win32' ? 'curl.exe' : 'curl',
            ['--fail', '--silent', '--show-error', '--connect-timeout', '10', '--max-time', '30', '-H', 'accept: application/json', url],
            { maxBuffer: 50 * 1024 * 1024, windowsHide: true })
          const data = JSON.parse(stdout)
          if (!Array.isArray(data.resultado)) throw new Error('Resposta ARP inválida.')
          return data as { resultado: Record<string, unknown>[]; totalRegistros?: number; totalPaginas?: number; paginasRestantes?: number }
        } catch {
          // Em alguns ambientes Windows o processo filho não herda a rota de rede;
          // tenta o transporte nativo, que é o caminho usado em produção.
        }
      }
      const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      if (!response.ok) throw new Error(`API ARP retornou ${response.status}.`)
      const data = await response.json()
      if (!Array.isArray(data.resultado)) throw new Error('Resposta ARP inválida.')
      return data as { resultado: Record<string, unknown>[]; totalRegistros?: number; totalPaginas?: number; paginasRestantes?: number }
    } catch (error) {
      lastError = error
      if (tentativa < 2) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** tentativa))
    } finally { clearTimeout(timer) }
  }
  throw new Error(`Falha ao acessar a API ARP: ${lastError instanceof Error ? lastError.message : 'erro de conexão'}`)
}

export async function sincronizarArps({ diasParaTras = 0, diasParaFrente = 365, pagina = 1 } = {}) {
  const inicio = new Date(Date.now() - diasParaTras * 86400000).toISOString().slice(0, 10)
  const fim = new Date(Date.now() + diasParaFrente * 86400000).toISOString().slice(0, 10)
  const primeira = await consultar('modulo-arp/1.2_consultarARP_FimVigencia', { pagina: String(pagina), tamanhoPagina: String(PAGE_SIZE), dataVigenciaFinalMin: inicio, dataVigenciaFinalMax: fim })
  const atas = primeira.resultado || []
  let gravadas = 0
  for (const ata of atas) {
    const controle = String(ata.numeroControlePncpAta || '')
    if (!controle) continue
    const data = { numeroControlePncpAta: controle, numeroControlePncpCompra: String(ata.numeroControlePncpCompra || '') || null, numeroAtaRegistroPreco: String(ata.numeroAtaRegistroPreco || ''), codigoUnidadeGerenciadora: String(ata.codigoUnidadeGerenciadora || ''), nomeUnidadeGerenciadora: String(ata.nomeUnidadeGerenciadora || '') || null, codigoOrgao: number(ata.codigoOrgao), nomeOrgao: String(ata.nomeOrgao || '') || null, linkAtaPncp: String(ata.linkAtaPNCP || ata.linkAtaPncp || '') || null, linkCompraPncp: String(ata.linkCompraPNCP || ata.linkCompraPncp || '') || null, numeroCompra: String(ata.numeroCompra || '') || null, anoCompra: String(ata.anoCompra || '') || null, codigoModalidadeCompra: String(ata.codigoModalidadeCompra || '') || null, nomeModalidadeCompra: String(ata.nomeModalidadeCompra || '') || null, dataAssinatura: date(ata.dataAssinatura), dataVigenciaInicial: date(ata.dataVigenciaInicial), dataVigenciaFinal: date(ata.dataVigenciaFinal), valorTotal: number(ata.valorTotal), statusAta: String(ata.statusAta || '') || null, objeto: String(ata.objeto || '') || null, quantidadeItens: number(ata.quantidadeItens), dataHoraAtualizacao: datetime(ata.dataHoraAtualizacao), dataHoraInclusao: datetime(ata.dataHoraInclusao), dataHoraExclusao: datetime(ata.dataHoraExclusao), ataExcluido: Boolean(ata.ataExcluido) }
    await arpDb.arpAta.upsert({ where: { numeroControlePncpAta: controle }, create: data, update: { ...data, sincronizadoEm: new Date() } })
    gravadas += 1
  }
  return { gravadas, pagina, totalPaginas: primeira.totalPaginas || 1, proximaPagina: pagina < (primeira.totalPaginas || 1) ? pagina + 1 : null, janela: { inicio, fim } }
}

export async function carregarItensAta(controle: string) {
  if (!/^\d{14}-\d+-\d+\/\d{4}-\d+$/.test(controle)) throw new Error('Controle PNCP inválido.')
  const ata = await arpDb.arpAta.findUnique({ where: { numeroControlePncpAta: controle } })
  if (!ata) {
    const itensAdesao = await arpDb.arpItemAdesao.findMany({
      where: { numeroControlePncpAta: controle, maximoAdesao: { gt: 0 }, itemExcluido: false },
      orderBy: { numeroItem: 'asc' },
    })
    if (itensAdesao.length) {
      const primeiro = itensAdesao[0]
      return {
        ata: {
          numeroControlePncpAta: controle,
          numeroAtaRegistroPreco: primeiro.numeroAtaRegistroPreco,
          codigoUnidadeGerenciadora: primeiro.codigoUnidadeGerenciadora,
          nomeUnidadeGerenciadora: primeiro.nomeUnidadeGerenciadora,
          dataVigenciaInicial: primeiro.dataVigenciaInicial,
          dataVigenciaFinal: primeiro.dataVigenciaFinal,
          objeto: primeiro.descricaoItem,
          valorTotal: primeiro.valorTotal,
          linkAtaPncp: null,
        },
        resultado: itensAdesao,
        totalRegistros: itensAdesao.length,
        itensGravados: 0,
      }
    }
    throw new Error('Ata não encontrada na base local.')
  }
  const itens: Record<string, unknown>[] = []
  let pagina = 1
  do {
    const resposta = await consultar('modulo-arp/2.1_consultarARPItem_Id', { numeroControlePncpAta: controle, pagina: String(pagina), tamanhoPagina: '200' })
    itens.push(...(resposta.resultado || []).filter(i => i.numeroControlePncpAta === controle && !i.itemExcluido))
    if (pagina >= (resposta.totalPaginas || 1)) break
    pagina++
  } while (true)
  let itensGravados = 0
  for (const item of itens) {
    const controle = String(item.numeroControlePncpAta || '')
    const ata = await arpDb.arpAta.findUnique({ where: { numeroControlePncpAta: controle }, select: { id: true } })
    if (!ata || !item.numeroItem) continue
    const data = { ataId: ata.id, numeroControlePncpAta: controle, numeroItem: String(item.numeroItem), codigoItem: number(item.codigoItem), descricaoItem: String(item.descricaoItem || '') || null, descricaoDetalhada: String(item.descricaoDetalhada || '') || null, tipoItem: String(item.tipoItem || '') || null, numeroCompra: String(item.numeroCompra || '') || null, anoCompra: String(item.anoCompra || '') || null, dataAssinatura: date(item.dataAssinatura), dataVigenciaInicial: date(item.dataVigenciaInicial), dataVigenciaFinal: date(item.dataVigenciaFinal), niFornecedor: String(item.niFornecedor || '') || null, nomeRazaoSocialFornecedor: String(item.nomeRazaoSocialFornecedor || '') || null, quantidadeHomologadaVencedor: number(item.quantidadeHomologadaVencedor), quantidadeHomologadaItem: number(item.quantidadeHomologadaItem), quantidadeRegistrada: number(item.quantidadeRegistrada), unidadeMedida: String(item.unidadeMedida || '') || null, valorUnitario: number(item.valorUnitario), valorTotal: number(item.valorTotal), maximoAdesao: number(item.maximoAdesao), numeroControlePncpCompra: String(item.numeroControlePncpCompra || '') || null, idCompra: String(item.idCompra || '') || null }
    await arpDb.arpItem.upsert({ where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: controle, numeroItem: String(item.numeroItem) } }, create: data, update: data })
    itensGravados += 1
  }

  return { ata, resultado: itens, totalRegistros: itens.length, itensGravados }
}

type JanelaAdesao = { dataVigenciaInicialMin: string; dataVigenciaInicialMax: string }

function itemAdesaoData(item: Record<string, unknown>) {
  return {
    numeroControlePncpAta: String(item.numeroControlePncpAta || ''),
    numeroAtaRegistroPreco: String(item.numeroAtaRegistroPreco || '') || null,
    codigoUnidadeGerenciadora: String(item.codigoUnidadeGerenciadora || '') || null,
    nomeUnidadeGerenciadora: String(item.nomeUnidadeGerenciadora || '') || null,
    numeroControlePncpCompra: String(item.numeroControlePncpCompra || '') || null,
    numeroCompra: String(item.numeroCompra || '') || null,
    anoCompra: String(item.anoCompra || '') || null,
    codigoModalidadeCompra: String(item.codigoModalidadeCompra || '') || null,
    nomeModalidadeCompra: String(item.nomeModalidadeCompra || '') || null,
    dataAssinatura: date(item.dataAssinatura),
    dataVigenciaInicial: date(item.dataVigenciaInicial),
    dataVigenciaFinal: date(item.dataVigenciaFinal),
    numeroItem: String(item.numeroItem || ''),
    codigoItem: number(item.codigoItem),
    descricaoItem: String(item.descricaoItem || '') || null,
    tipoItem: String(item.tipoItem || '') || null,
    classificacaoFornecedor: String(item.classificacaoFornecedor || '') || null,
    niFornecedor: String(item.niFornecedor || '') || null,
    nomeRazaoSocialFornecedor: String(item.nomeRazaoSocialFornecedor || '') || null,
    quantidadeHomologadaItem: number(item.quantidadeHomologadaItem),
    quantidadeHomologadaVencedor: number(item.quantidadeHomologadaVencedor),
    quantidadeEmpenhada: number(item.quantidadeEmpenhada),
    valorUnitario: number(item.valorUnitario),
    valorTotal: number(item.valorTotal),
    maximoAdesao: number(item.maximoAdesao) || 0,
    itemExcluido: Boolean(item.itemExcluido),
    dataHoraInclusao: datetime(item.dataHoraInclusao),
    dataHoraAtualizacao: datetime(item.dataHoraAtualizacao),
  }
}

export async function sincronizarItensAdesao({
  dataVigenciaInicialMin = '2026-06-30',
  dataVigenciaInicialMax = '2027-06-29',
  pagina = 1,
}: Partial<JanelaAdesao> & { pagina?: number } = {}) {
  if (!Number.isInteger(pagina) || pagina < 1) throw new Error('Página inválida.')
  const resposta = await consultar('modulo-arp/2_consultarARPItem', {
    pagina: String(pagina), tamanhoPagina: String(ADESAO_PAGE_SIZE), dataVigenciaInicialMin, dataVigenciaInicialMax,
  })
  const recebidos = resposta.resultado || []
  const elegiveis = recebidos.filter((item) => !item.itemExcluido && (number(item.maximoAdesao) || 0) > 0 && item.numeroControlePncpAta && item.numeroItem)
  let gravados = 0
  for (const item of elegiveis) {
    const data = itemAdesaoData(item)
    await arpDb.arpItemAdesao.upsert({
      where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: data.numeroControlePncpAta, numeroItem: data.numeroItem } },
      create: data,
      update: { ...data, sincronizadoEm: new Date() },
    })
    gravados += 1
  }
  return {
    recebidos: recebidos.length, elegiveis: elegiveis.length, gravados, pagina,
    totalPaginas: resposta.totalPaginas || 1,
    proximaPagina: pagina < (resposta.totalPaginas || 1) ? pagina + 1 : null,
    janela: { dataVigenciaInicialMin, dataVigenciaInicialMax },
  }
}

export async function buscarItensAdesaoLocal({ termo = '', uasg, catmat, pagina = 1, limite = 50 }: { termo?: string; uasg?: string; catmat?: number; pagina?: number; limite?: number } = {}) {
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 200) throw new Error('Paginação inválida.')
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const where: Prisma.ArpItemAdesaoWhereInput = {
    maximoAdesao: { gt: 0 }, itemExcluido: false,
    // A janela sincronizada pode conter atas futuras; elas continuam sendo
    // oportunidades válidas e não devem desaparecer antes da vigência inicial.
    dataVigenciaFinal: { gte: hoje },
    ...(uasg ? { codigoUnidadeGerenciadora: uasg } : {}), ...(catmat ? { codigoItem: catmat } : {}),
    ...(termo ? { descricaoItem: { contains: termo, mode: 'insensitive' } } : {}),
  }
  const [total, resultado] = await arpDb.$transaction([
    arpDb.arpItemAdesao.count({ where }),
    arpDb.arpItemAdesao.findMany({ where, orderBy: { dataVigenciaFinal: 'asc' }, skip: (pagina - 1) * limite, take: limite }),
  ])
  return { resultado, totalRegistros: total, totalPaginas: Math.ceil(total / limite), pagina, limite }
}

export async function buscarArpLocal({ termo = '', uasg, catmat, ataControle, uf, pagina = 1, limite = 50 }: { termo?: string; uasg?: string; catmat?: number; ataControle?: string; uf?: string; pagina?: number; limite?: number }) {
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  if (!Number.isInteger(pagina) || pagina < 1 || !Number.isInteger(limite) || limite < 1 || limite > 200) throw new Error('Paginação inválida.')
  const controlesAdesao = (await arpDb.arpItemAdesao.findMany({
    where: { maximoAdesao: { gt: 0 }, itemExcluido: false, dataVigenciaInicial: { lte: hoje }, dataVigenciaFinal: { gte: hoje }, ...(uasg ? { codigoUnidadeGerenciadora: uasg } : {}), ...(termo ? { descricaoItem: { contains: termo, mode: 'insensitive' } } : {}) },
    select: { numeroControlePncpAta: true }, distinct: ['numeroControlePncpAta'],
  })).map((item) => item.numeroControlePncpAta)
  const controlesItens = (await arpDb.arpItem.findMany({
    where: { maximoAdesao: { gt: 0 }, ata: { ataExcluido: false, dataVigenciaFinal: { gte: hoje } } },
    select: { numeroControlePncpAta: true }, distinct: ['numeroControlePncpAta'],
  })).map((item) => item.numeroControlePncpAta)
  const controlesComAdesao = [...new Set([...controlesAdesao, ...controlesItens])]
  const where: Prisma.ArpItemWhereInput = { maximoAdesao: { gt: 0 }, ata: { ataExcluido: false, dataVigenciaInicial: { lte: hoje }, dataVigenciaFinal: { gte: hoje }, ...(uasg ? { codigoUnidadeGerenciadora: uasg } : {}), ...(ataControle ? { numeroControlePncpAta: ataControle } : {}) }, ...(catmat ? { codigoItem: catmat } : {}) }
  if (termo) where.AND = [{ OR: [{ descricaoItem: { contains: termo, mode: 'insensitive' } }, { descricaoDetalhada: { contains: termo, mode: 'insensitive' } }, { ata: { objeto: { contains: termo, mode: 'insensitive' } } }] }]
  const [total, itens] = await arpDb.$transaction([arpDb.arpItem.count({ where }), arpDb.arpItem.findMany({ where, include: { ata: true }, orderBy: { dataVigenciaFinal: 'asc' }, skip: (pagina - 1) * limite, take: limite })])
  if (catmat || ataControle) return { resultado: itens, totalRegistros: total, totalPaginas: Math.ceil(total / limite), pagina, limite, uf }
  const totalAtas = controlesComAdesao.length
  const itensResumo = await arpDb.arpItemAdesao.findMany({
    where: { numeroControlePncpAta: { in: controlesComAdesao }, maximoAdesao: { gt: 0 }, itemExcluido: false, dataVigenciaInicial: { lte: hoje }, dataVigenciaFinal: { gte: hoje }, ...(uasg ? { codigoUnidadeGerenciadora: uasg } : {}), ...(termo ? { descricaoItem: { contains: termo, mode: 'insensitive' } } : {}) },
    orderBy: { dataVigenciaFinal: 'asc' }, distinct: ['numeroControlePncpAta'], skip: (pagina - 1) * limite, take: limite,
  })
  const controlesPagina = itensResumo.map((item) => item.numeroControlePncpAta)
  const atas = await arpDb.arpAta.findMany({ where: { numeroControlePncpAta: { in: controlesPagina } } })
  const atasPorControle = new Map(atas.map((ata) => [ata.numeroControlePncpAta, ata]))
  const resultado = itensResumo.map((item) => {
    const ata = atasPorControle.get(item.numeroControlePncpAta)
    return ata ? { ...ata, descricaoItem: ata.objeto, numeroItem: '—', ata } : { ...item, objeto: item.descricaoItem, descricaoItem: item.descricaoItem, numeroItem: '—', ata: null }
  })
  return { resultado, totalRegistros: totalAtas, totalPaginas: Math.ceil(totalAtas / limite), pagina, limite, uf }
}
