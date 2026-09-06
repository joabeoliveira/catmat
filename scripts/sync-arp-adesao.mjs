import { PrismaClient } from '@prisma/client'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const API = 'https://dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem'
const PAGE_SIZE = 500

const argumento = (nome, padrao) => {
  const encontrado = process.argv.find((valor) => valor.startsWith(`--${nome}=`))
  return encontrado ? encontrado.slice(nome.length + 3) : padrao
}
const numero = (valor) => { const n = Number(valor); return Number.isFinite(n) ? n : null }
const data = (valor) => typeof valor === 'string' && valor ? new Date(`${valor.slice(0, 10)}T00:00:00.000Z`) : null
const datetime = (valor) => typeof valor === 'string' && valor ? new Date(valor) : null
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function janela(inicioInformado, fimInformado) {
  if (inicioInformado && fimInformado) return { inicio: inicioInformado, fim: fimInformado }
  const inicio = new Date()
  const fim = new Date(inicio.getTime() + 365 * 86400000)
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) }
}

function itemData(item, sincronizadoEm) {
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
    dataAssinatura: data(item.dataAssinatura), dataVigenciaInicial: data(item.dataVigenciaInicial), dataVigenciaFinal: data(item.dataVigenciaFinal),
    numeroItem: String(item.numeroItem || ''), codigoItem: numero(item.codigoItem),
    descricaoItem: String(item.descricaoItem || '') || null, tipoItem: String(item.tipoItem || '') || null,
    classificacaoFornecedor: String(item.classificacaoFornecedor || '') || null,
    niFornecedor: String(item.niFornecedor || '') || null,
    nomeRazaoSocialFornecedor: String(item.nomeRazaoSocialFornecedor || '') || null,
    quantidadeHomologadaItem: numero(item.quantidadeHomologadaItem), quantidadeHomologadaVencedor: numero(item.quantidadeHomologadaVencedor),
    quantidadeEmpenhada: numero(item.quantidadeEmpenhada), valorUnitario: numero(item.valorUnitario), valorTotal: numero(item.valorTotal),
    maximoAdesao: numero(item.maximoAdesao) || 0, itemExcluido: Boolean(item.itemExcluido),
    dataHoraInclusao: datetime(item.dataHoraInclusao), dataHoraAtualizacao: datetime(item.dataHoraAtualizacao), sincronizadoEm,
  }
}

async function consultarPagina(pagina, intervalo) {
  const { inicio, fim } = janelaAtual
  const url = `${API}?pagina=${pagina}&tamanhoPagina=${PAGE_SIZE}&dataVigenciaInicialMin=${inicio}&dataVigenciaInicialMax=${fim}`
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Endpoint ARP retornou HTTP ${response.status}.`)
  const payload = await response.json()
  if (!Array.isArray(payload.resultado)) throw new Error('Resposta inválida do endpoint de itens ARP.')
  if (intervalo > 0) await esperar(intervalo)
  return payload
}

let janelaAtual

export async function sincronizar({ limite = 0, intervalo = 15000, paginaInicial = 1, dataInicialMin, dataInicialMax } = {}) {
  janelaAtual = janela(dataInicialMin, dataInicialMax)
  const inicioCarga = new Date()
  let pagina = paginaInicial
  let recebidos = 0; let elegiveis = 0; let gravados = 0; let removidos = 0; let totalPaginas = 1
  console.log(`ARP adesão: janela ${janelaAtual.inicio} até ${janelaAtual.fim}; intervalo ${intervalo}ms.`)

  while (pagina <= totalPaginas) {
    const resposta = await consultarPagina(pagina, intervalo)
    totalPaginas = Number(resposta.totalPaginas || 1)
    const itens = resposta.resultado || []
    recebidos += itens.length
    const hojeTexto = new Date().toISOString().slice(0, 10)
    const itensValidosPagina = itens.filter((item) => item.numeroControlePncpAta && item.numeroItem && !item.itemExcluido && numero(item.maximoAdesao) > 0 && String(item.dataVigenciaFinal || '').slice(0, 10) >= hojeTexto)
    const restanteElegiveis = limite > 0 ? limite - elegiveis : Number.MAX_SAFE_INTEGER
    const itensParaGravar = itensValidosPagina.slice(0, restanteElegiveis)
    elegiveis += itensParaGravar.length
    for (const item of itensParaGravar) {
      const dados = itemData(item, inicioCarga)
      await prisma.arpItemAdesao.upsert({
        where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: dados.numeroControlePncpAta, numeroItem: dados.numeroItem } },
        create: { ...dados, id: `${dados.numeroControlePncpAta}-${dados.numeroItem}` },
        update: dados,
      })
      gravados += 1
    }
    console.log(`Página ${pagina}/${totalPaginas}: ${itens.length} recebidos, ${itensParaGravar.length} elegíveis gravados.`)
    if (limite > 0 && elegiveis >= limite) break
    pagina += 1
  }

  const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const resultado = await prisma.arpItemAdesao.deleteMany({ where: { dataVigenciaFinal: { lt: hoje } } })
  removidos = resultado.count
  const cargaCompleta = limite === 0 && paginaInicial === 1 && pagina > totalPaginas
  /* Registros vigentes não são removidos por não aparecerem como disponíveis.
     O máximo e a situação de exclusão permanecem atualizados na própria tabela. */
  return { recebidos, armazenados: gravados, disponiveis: elegiveis, elegiveis, gravados, removidos, paginaFinal: pagina, totalPaginas, cargaCompleta, janela: janelaAtual }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const resultado = await sincronizar({ limite: Number(argumento('limite', 0)), intervalo: Number(argumento('intervalo', 15000)), paginaInicial: Number(argumento('pagina', 1)), dataInicialMin: argumento('data-inicial-min', ''), dataInicialMax: argumento('data-inicial-max', '') })
  console.log(JSON.stringify(resultado, null, 2))
  await prisma.$disconnect()
}
