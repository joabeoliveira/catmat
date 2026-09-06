import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const BRASIL_API = 'https://brasilapi.com.br/api/cnpj/v1'
const RECEITA_WS_API = 'https://www.receitaws.com.br/v1/cnpj'
const CNPJ_BIZ_API = process.env.CNPJBIZ_API_URL || 'https://cnpj.biz/api/v2/empresa'
const CACHE_HOURS = 24

function somenteDigitos(value: string) {
  return value.replace(/\D/g, '')
}

function cnpjValido(value: string) {
  const cnpj = somenteDigitos(value)
  if (!/^\d{14}$/.test(cnpj) || /^([0-9])\1{13}$/.test(cnpj)) return false
  const calcular = (base: string) => {
    let peso = base.length - 7
    let soma = 0
    for (const digito of base) { soma += Number(digito) * peso; peso -= 1; if (peso === 1) peso = 9 }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return calcular(cnpj.slice(0, 12)) === Number(cnpj[12]) && calcular(cnpj.slice(0, 13)) === Number(cnpj[13])
}

function data(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function numero(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizarCnpj(value: string) {
  const cnpj = somenteDigitos(value || '')
  if (!cnpjValido(cnpj)) throw new Error('Informe um CNPJ válido com 14 dígitos.')
  return cnpj
}

type FonteCnpj = { nome: string; url: string; headers?: Record<string, string> }

async function consultarFonte(fonte: FonteCnpj) {
  const response = await fetch(fonte.url, { headers: { accept: 'application/json', ...fonte.headers }, cache: 'no-store', signal: AbortSignal.timeout(15000) })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || payload.status === 'ERROR' || payload.error) {
    const mensagem = typeof payload.message === 'string' ? payload.message : `Fonte ${fonte.nome} indisponível (${response.status}).`
    throw new Error(mensagem)
  }
  return payload
}

function texto(payload: Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) {
    const value = payload[chave]
    if (value !== null && value !== undefined && value !== '') return String(value)
  }
  return null
}

function lista(payload: Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) if (Array.isArray(payload[chave])) return payload[chave] as Prisma.InputJsonValue
  return Prisma.JsonNull
}

function dadosNormalizados(cnpj: string, payload: Record<string, unknown>, fonte: string) {
  return {
    cnpj,
    razaoSocial: texto(payload, 'razao_social', 'razaoSocial', 'razao'),
    nomeFantasia: texto(payload, 'nome_fantasia', 'nomeFantasia', 'fantasia'),
    situacaoCadastral: texto(payload, 'descricao_situacao_cadastral', 'situacao_cadastral', 'situacao', 'status'),
    dataSituacaoCadastral: data(texto(payload, 'data_situacao_cadastral', 'dataSituacaoCadastral')),
    dataInicioAtividade: data(texto(payload, 'data_inicio_atividade', 'dataInicioAtividade', 'abertura')),
    naturezaJuridica: texto(payload, 'natureza_juridica', 'naturezaJuridica'),
    porte: texto(payload, 'porte'),
    capitalSocial: numero(payload.capital_social ?? payload.capitalSocial),
    cnaeFiscal: texto(payload, 'cnae_fiscal', 'cnaeFiscal', 'atividade_principal'),
    cnaeFiscalDescricao: texto(payload, 'cnae_fiscal_descricao', 'cnaeFiscalDescricao', 'atividade_principal_descricao'),
    logradouro: texto(payload, 'logradouro'), numero: texto(payload, 'numero'), complemento: texto(payload, 'complemento'),
    bairro: texto(payload, 'bairro'), municipio: texto(payload, 'municipio', 'cidade'), uf: texto(payload, 'uf', 'estado'), cep: texto(payload, 'cep'),
    email: texto(payload, 'email'), telefone: texto(payload, 'ddd_telefone_1', 'telefone', 'telefone_1'),
    socios: lista(payload, 'qsa', 'socios'), atividadesSecundarias: lista(payload, 'cnaes_secundarios', 'atividades_secundarias'),
    dadosBrutos: payload as Prisma.InputJsonValue, fonte, consultadoEm: new Date(),
  }
}

export async function consultarCnpj(value: string, atualizar = false) {
  const cnpj = normalizarCnpj(value)
  const existente = await prisma.cnpjEmpresa.findUnique({ where: { cnpj } })
  const limiteCache = Date.now() - CACHE_HOURS * 60 * 60 * 1000
  if (existente && !atualizar && existente.consultadoEm.getTime() >= limiteCache) return existente

  const fontes: FonteCnpj[] = [
    { nome: 'BrasilAPI', url: `${BRASIL_API}/${cnpj}` },
    { nome: 'ReceitaWS', url: `${RECEITA_WS_API}/${cnpj}` },
  ]
  if (process.env.CNPJBIZ_API_KEY) fontes.push({ nome: 'CNPJ.biz', url: `${CNPJ_BIZ_API}/${cnpj}`, headers: { authorization: `Bearer ${process.env.CNPJBIZ_API_KEY}` } })

  const falhas: string[] = []
  for (const fonte of fontes) {
    try {
      const payload = await consultarFonte(fonte)
      const dados = dadosNormalizados(cnpj, payload, fonte.nome)
      return prisma.cnpjEmpresa.upsert({ where: { cnpj }, create: dados, update: dados })
    } catch (error) {
      falhas.push(`${fonte.nome}: ${error instanceof Error ? error.message : 'falha desconhecida'}`)
    }
  }
  throw new Error(`Não foi possível consultar o CNPJ. ${falhas.join(' | ')}`)
}
