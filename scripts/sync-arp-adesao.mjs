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

async function atualizarCheckpoint(id, dados) {
  await prisma.arpCargaAdesao.update({ where: { id }, data: dados })
}

export async function sincronizar({ limite = 0, intervalo = 15000, paginas = 0, paginaInicial, dataInicialMin, dataInicialMax, reiniciar = false } = {}) {
  janelaAtual = janela(dataInicialMin, dataInicialMax)
  let inicioJanela = data(janelaAtual.inicio)
  let fimJanela = data(janelaAtual.fim)
  const inicioCarga = new Date()
  const paginaInformada = Number.isInteger(paginaInicial) && paginaInicial >= 1
  let checkpointExistente = await prisma.arpCargaAdesao.findUnique({
    where: { dataVigenciaInicialMin_dataVigenciaInicialMax: { dataVigenciaInicialMin: inicioJanela, dataVigenciaInicialMax: fimJanela } },
  })
  if (!reiniciar && !paginaInformada && !dataInicialMin && !dataInicialMax && !checkpointExistente) {
    checkpointExistente = await prisma.arpCargaAdesao.findFirst({
      where: { status: { not: 'CONCLUIDA' } }, orderBy: { atualizadaEm: 'desc' },
    })
    if (checkpointExistente) {
      inicioJanela = checkpointExistente.dataVigenciaInicialMin
      fimJanela = checkpointExistente.dataVigenciaInicialMax
      janelaAtual = { inicio: inicioJanela.toISOString().slice(0, 10), fim: fimJanela.toISOString().slice(0, 10) }
    }
  }
  const deveRetomar = !reiniciar && !paginaInformada && checkpointExistente && checkpointExistente.status !== 'CONCLUIDA'
  let pagina = paginaInformada ? paginaInicial : (deveRetomar ? checkpointExistente.proximaPagina : 1)
  let recebidos = deveRetomar ? checkpointExistente.recebidos : 0
  let elegiveis = deveRetomar ? checkpointExistente.elegiveis : 0
  let gravados = deveRetomar ? checkpointExistente.gravados : 0
  let removidos = deveRetomar ? checkpointExistente.removidos : 0
  let elegiveisSessao = 0
  let totalPaginas = deveRetomar ? (checkpointExistente.totalPaginas || pagina) : pagina
  const ultimaPaginaDaExecucao = paginas > 0 ? pagina + paginas - 1 : Number.MAX_SAFE_INTEGER

  const checkpoint = await prisma.arpCargaAdesao.upsert({
    where: { dataVigenciaInicialMin_dataVigenciaInicialMax: { dataVigenciaInicialMin: inicioJanela, dataVigenciaInicialMax: fimJanela } },
    create: { dataVigenciaInicialMin: inicioJanela, dataVigenciaInicialMax: fimJanela, proximaPagina: pagina, totalPaginas, status: 'PROCESSANDO', recebidos, elegiveis, gravados, removidos, erro: null, concluidaEm: null },
    update: { proximaPagina: pagina, totalPaginas, status: 'PROCESSANDO', recebidos, elegiveis, gravados, removidos, erro: null, concluidaEm: null },
  })

  console.log(`ARP adesão: janela ${janelaAtual.inicio} até ${janelaAtual.fim}; retomando da página ${pagina}; intervalo ${intervalo}ms.`)

  try {
    while (pagina <= totalPaginas && pagina <= ultimaPaginaDaExecucao) {
      const resposta = await consultarPagina(pagina, intervalo)
      totalPaginas = Number(resposta.totalPaginas || 1)
      const itens = resposta.resultado || []
      recebidos += itens.length
      const hojeTexto = new Date().toISOString().slice(0, 10)
      const itensValidosPagina = itens.filter((item) => item.numeroControlePncpAta && item.numeroItem && !item.itemExcluido && numero(item.maximoAdesao) > 0 && String(item.dataVigenciaFinal || '').slice(0, 10) >= hojeTexto)
      const restanteElegiveis = limite > 0 ? limite - elegiveisSessao : Number.MAX_SAFE_INTEGER
      const itensParaGravar = itensValidosPagina.slice(0, Math.max(0, restanteElegiveis))
      elegiveis += itensParaGravar.length
      elegiveisSessao += itensParaGravar.length
      for (const item of itensParaGravar) {
        const dados = itemData(item, inicioCarga)
        await prisma.arpItemAdesao.upsert({
          where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: dados.numeroControlePncpAta, numeroItem: dados.numeroItem } },
          create: { ...dados, id: `${dados.numeroControlePncpAta}-${dados.numeroItem}` },
          update: dados,
        })
        gravados += 1
      }
      pagina += 1
      const atingiuLimite = limite > 0 && elegiveisSessao >= limite
      await atualizarCheckpoint(checkpoint.id, { proximaPagina: pagina, totalPaginas, recebidos, elegiveis, gravados, removidos, status: 'PROCESSANDO', erro: null })
      console.log(`Página ${pagina - 1}/${totalPaginas}: ${itens.length} recebidos, ${itensParaGravar.length} elegíveis gravados. Próxima: ${pagina}.`)
      if (atingiuLimite) break
    }

    const cargaCompleta = limite === 0 && pagina > totalPaginas
    if (cargaCompleta) {
      const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
      const resultado = await prisma.arpItemAdesao.deleteMany({ where: { dataVigenciaFinal: { lt: hoje } } })
      removidos = resultado.count
      await atualizarCheckpoint(checkpoint.id, { proximaPagina: pagina, totalPaginas, recebidos, elegiveis, gravados, removidos, status: 'CONCLUIDA', erro: null, concluidaEm: new Date() })
    }

    return { recebidos, armazenados: gravados, disponiveis: elegiveis, elegiveis, gravados, removidos, paginaFinal: pagina - 1, paginasProcessadas: paginas > 0 ? Math.min(paginas, Math.max(0, pagina - (paginaInicial || (deveRetomar ? checkpointExistente.proximaPagina : 1)))) : null, totalPaginas, cargaCompleta, janela: janelaAtual, retomada: deveRetomar }
  } catch (error) {
    await atualizarCheckpoint(checkpoint.id, { proximaPagina: pagina, totalPaginas, recebidos, elegiveis, gravados, removidos, status: 'ERRO', erro: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (argumento('status', '0') === '1') {
    const checkpoints = await prisma.arpCargaAdesao.findMany({ orderBy: { atualizadaEm: 'desc' }, take: 20 })
    console.log(JSON.stringify(checkpoints, null, 2))
  } else {
    const pagina = argumento('pagina', '')
    const resultado = await sincronizar({
      limite: Number(argumento('limite', 0)), intervalo: Number(argumento('intervalo', 15000)),
      paginas: Number(argumento('paginas', 0)),
      paginaInicial: pagina ? Number(pagina) : undefined,
      dataInicialMin: argumento('data-inicial-min', ''), dataInicialMax: argumento('data-inicial-max', ''),
      reiniciar: argumento('reiniciar', '0') === '1',
    })
    console.log(JSON.stringify(resultado, null, 2))
  }
  await prisma.$disconnect()
}
