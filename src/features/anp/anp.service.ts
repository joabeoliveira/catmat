import type { Prisma, SemanaAnp } from '@prisma/client'
import { createHash } from 'node:crypto'

import { db } from '@/lib/db'
import { getObject, objectExists, uploadObject } from '@/lib/storage'

import {
  baixarXlsxAnp,
  calcularSemanaPorDatas,
  montarObjectKey,
} from './anp.source'
import { parseAnpXlsx } from './anp.parser'
import type {
  AnpAbrangencia,
  AnpFiltros,
  AnpImportacaoStatus,
  AnpProduto,
  AnpResumoSincronizacao,
  AnpUnidade,
} from './anp.types'

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function bucketAnp(): string {
  const bucket = process.env.MINIO_BUCKET_ANP?.trim()
  if (!bucket) throw new Error('MINIO_BUCKET_ANP não configurado.')
  return bucket
}

function dataIso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

function erroMensagem(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido na sincronização ANP.'
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

async function resumoSemana(semana: SemanaAnp): Promise<AnpResumoSincronizacao> {
  const precosGravados = await db.anpPreco.count({ where: { semanaId: semana.id } })

  return {
    semanaId: semana.id,
    dataInicio: dataIso(semana.dataInicio),
    dataFim: dataIso(semana.dataFim),
    objectKey: semana.objectKey,
    hashSha256: semana.hashSha256,
    tamanhoBytes: semana.tamanhoBytes,
    linhasLidas: precosGravados,
    precosGravados,
    status: semana.status as AnpImportacaoStatus,
  }
}

async function persistirPrecos(
  semana: SemanaAnp,
  linhas: ReturnType<typeof parseAnpXlsx>['linhas'],
  hashSha256: string,
  tamanhoBytes: number,
): Promise<AnpResumoSincronizacao> {
  const atualizada = await db.$transaction(async (tx) => {
    await tx.anpPreco.deleteMany({ where: { semanaId: semana.id } })

    if (linhas.length > 0) {
      await tx.anpPreco.createMany({
        data: linhas.map((linha) => ({ ...linha, semanaId: semana.id })),
      })
    }

    return tx.semanaAnp.update({
      where: { id: semana.id },
      data: {
        status: 'SUCESSO',
        erro: null,
        hashSha256,
        tamanhoBytes,
        processadoEm: new Date(),
      },
    })
  })

  return {
    semanaId: atualizada.id,
    dataInicio: dataIso(atualizada.dataInicio),
    dataFim: dataIso(atualizada.dataFim),
    objectKey: atualizada.objectKey,
    hashSha256: atualizada.hashSha256,
    tamanhoBytes: atualizada.tamanhoBytes,
    linhasLidas: linhas.length,
    precosGravados: linhas.length,
    status: atualizada.status as AnpImportacaoStatus,
  }
}

async function processarBuffer(
  semana: SemanaAnp,
  buffer: Buffer,
  hashSha256: string,
  tamanhoBytes: number,
): Promise<AnpResumoSincronizacao> {
  const resultado = parseAnpXlsx(buffer)

  if (resultado.abasFaltantes.length > 0) {
    throw new Error(`Abas faltantes no XLSX da ANP: ${resultado.abasFaltantes.join(', ')}`)
  }

  return persistirPrecos(semana, resultado.linhas, hashSha256, tamanhoBytes)
}

async function marcarErro(semanaId: string, error: unknown): Promise<void> {
  const mensagem = erroMensagem(error)
  console.error(`[ANP] Falha ao processar semana ${semanaId}: ${mensagem}`)

  try {
    await db.semanaAnp.update({
      where: { id: semanaId },
      data: { status: 'ERRO', erro: mensagem },
    })
  } catch (updateError) {
    console.error(`[ANP] Falha ao registrar erro da semana ${semanaId}: ${erroMensagem(updateError)}`)
  }
}

export async function sincronizarSemanaAnp(
  dataInicio: Date,
  dataFim: Date,
): Promise<AnpResumoSincronizacao> {
  const periodo = calcularSemanaPorDatas(dataInicio, dataFim)
  const objectKey = montarObjectKey(periodo.dataInicio, periodo.dataFim)
  const bucket = bucketAnp()

  let semana = await db.semanaAnp.upsert({
    where: {
      dataInicio_dataFim: {
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
      },
    },
    create: {
      ano: periodo.dataInicio.getUTCFullYear(),
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      objectKey,
      hashSha256: '',
      tamanhoBytes: 0,
      status: 'PENDENTE',
    },
    update: {
      ano: periodo.dataInicio.getUTCFullYear(),
      objectKey,
    },
  })

  if (semana.status === 'SUCESSO' && semana.objectKey === objectKey) {
    return resumoSemana(semana)
  }

  try {
    semana = await db.semanaAnp.update({
      where: { id: semana.id },
      data: { status: 'PROCESSANDO', erro: null },
    })

    let buffer: Buffer
    let hashSha256: string
    let tamanhoBytes: number
    const existente = await objectExists(bucket, objectKey)

    if (existente) {
      buffer = await getObject(bucket, objectKey)
      hashSha256 = hashBuffer(buffer)
      tamanhoBytes = buffer.length
    } else {
      const download = await baixarXlsxAnp(periodo.dataInicio, periodo.dataFim)
      buffer = download.buffer
      hashSha256 = download.hashSha256
      tamanhoBytes = download.tamanhoBytes

      await uploadObject(bucket, objectKey, buffer, XLSX_CONTENT_TYPE)
    }

    semana = await db.semanaAnp.update({
      where: { id: semana.id },
      data: {
        baixadoEm: new Date(),
        hashSha256,
        tamanhoBytes,
      },
    })

    return processarBuffer(semana, buffer, hashSha256, tamanhoBytes)
  } catch (error) {
    await marcarErro(semana.id, error)
    throw error
  }
}

export async function reprocessarSemanaAnp(semanaId: string): Promise<AnpResumoSincronizacao> {
  let semana = await db.semanaAnp.findUnique({ where: { id: semanaId } })
  if (!semana) throw new Error('Semana ANP não encontrada.')

  try {
    semana = await db.semanaAnp.update({
      where: { id: semana.id },
      data: { status: 'PROCESSANDO', erro: null },
    })

    const buffer = await getObject(bucketAnp(), semana.objectKey)
    const hashSha256 = hashBuffer(buffer)
    const resultado = await processarBuffer(semana, buffer, hashSha256, buffer.length)

    return resultado
  } catch (error) {
    await marcarErro(semana.id, error)
    throw error
  }
}

export async function buscarSemanaMaisRecente(): Promise<SemanaAnp | null> {
  return db.semanaAnp.findFirst({
    where: { status: 'SUCESSO' },
    orderBy: { dataInicio: 'desc' },
  })
}

type SemanaComContagem = Prisma.SemanaAnpGetPayload<{
  include: { _count: { select: { precos: true } } }
}>

export async function buscarSemanas(params: { pagina: number; limite: number }): Promise<{
  items: SemanaComContagem[]
  total: number
}> {
  const [items, total] = await Promise.all([
    db.semanaAnp.findMany({
      orderBy: { dataInicio: 'desc' },
      skip: (params.pagina - 1) * params.limite,
      take: params.limite,
      include: { _count: { select: { precos: true } } },
    }),
    db.semanaAnp.count(),
  ])

  return { items, total }
}

export async function buscarSemanaPorId(id: string): Promise<SemanaComContagem | null> {
  return db.semanaAnp.findUnique({
    where: { id },
    include: { _count: { select: { precos: true } } },
  })
}

export async function buscarPrecos(filtros: AnpFiltros): Promise<{
  items: Array<Prisma.AnpPrecoGetPayload<{}>>
  total: number
  semana: SemanaAnp | null
}> {
  const semana = await resolverSemanaAnp(filtros)

  if (!semana) return { items: [], total: 0, semana: null }

  const where = criarWherePrecos(semana.id, filtros)
  const pagina = filtros.pagina || 1
  const limite = filtros.limite || 50

  const [items, total] = await Promise.all([
    db.anpPreco.findMany({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: [
        { abrangencia: 'asc' },
        { estado: 'asc' },
        { municipio: 'asc' },
        { produto: 'asc' },
      ],
    }),
    db.anpPreco.count({ where }),
  ])

  return { items, total, semana }
}

async function resolverSemanaAnp(filtros: AnpFiltros): Promise<SemanaAnp | null> {
  if (filtros.dataInicio || filtros.dataFim) {
    return db.semanaAnp.findFirst({
      where: {
        ...(filtros.dataInicio ? { dataInicio: new Date(`${filtros.dataInicio}T00:00:00.000Z`) } : {}),
        ...(filtros.dataFim ? { dataFim: new Date(`${filtros.dataFim}T00:00:00.000Z`) } : {}),
        status: 'SUCESSO',
      },
    })
  }

  if (filtros.semanaId) {
    return db.semanaAnp.findFirst({ where: { id: filtros.semanaId, status: 'SUCESSO' } })
  }

  return buscarSemanaMaisRecente()
}

function criarWherePrecos(semanaId: string, filtros: AnpFiltros): Prisma.AnpPrecoWhereInput {
  return {
    semanaId,
    ...(filtros.abrangencia ? { abrangencia: filtros.abrangencia } : {}),
    ...(filtros.produto ? { produto: filtros.produto } : {}),
    ...(filtros.unidade ? { unidade: filtros.unidade } : {}),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.municipio
      ? { municipio: { contains: filtros.municipio, mode: 'insensitive' } }
      : {}),
    ...(filtros.regiao
      ? { regiao: { contains: filtros.regiao, mode: 'insensitive' } }
      : {}),
  }
}

export async function buscarPrecosParaExportacao(filtros: AnpFiltros): Promise<{
  items: Array<Prisma.AnpPrecoGetPayload<{}>>
  total: number
  semana: SemanaAnp | null
}> {
  const semana = await resolverSemanaAnp(filtros)
  if (!semana) return { items: [], total: 0, semana: null }

  const where = criarWherePrecos(semana.id, filtros)
  const [items, total] = await Promise.all([
    db.anpPreco.findMany({
      where,
      orderBy: [
        { abrangencia: 'asc' },
        { estado: 'asc' },
        { municipio: 'asc' },
        { produto: 'asc' },
      ],
    }),
    db.anpPreco.count({ where }),
  ])

  return { items, total, semana }
}

export async function buscarFiltrosDisponiveis(estado?: string): Promise<{
  semanas: Array<{ id: string; dataInicio: Date; dataFim: Date }>
  produtos: AnpProduto[]
  unidades: AnpUnidade[]
  abrangencias: AnpAbrangencia[]
  estados: string[]
  regioes: string[]
  municipios: string[]
}> {
  const [semanas, produtos, unidades, abrangencias, estados, regioes, municipios] = await Promise.all([
    db.semanaAnp.findMany({
      where: { status: 'SUCESSO' },
      orderBy: { dataInicio: 'desc' },
      take: 12,
      select: { id: true, dataInicio: true, dataFim: true },
    }),
    db.anpPreco.findMany({ distinct: ['produto'], select: { produto: true }, orderBy: { produto: 'asc' } }),
    db.anpPreco.findMany({ distinct: ['unidade'], select: { unidade: true }, orderBy: { unidade: 'asc' } }),
    db.anpPreco.findMany({ distinct: ['abrangencia'], select: { abrangencia: true }, orderBy: { abrangencia: 'asc' } }),
    db.anpPreco.findMany({ where: { estado: { not: null } }, distinct: ['estado'], select: { estado: true }, orderBy: { estado: 'asc' } }),
    db.anpPreco.findMany({ where: { regiao: { not: null } }, distinct: ['regiao'], select: { regiao: true }, orderBy: { regiao: 'asc' } }),
    estado
      ? db.anpPreco.findMany({ where: { estado }, distinct: ['municipio'], select: { municipio: true }, orderBy: { municipio: 'asc' } })
      : Promise.resolve([] as Array<{ municipio: string | null }>),
  ])

  return {
    semanas,
    produtos: produtos.map((item) => item.produto as AnpProduto),
    unidades: unidades.map((item) => item.unidade as AnpUnidade),
    abrangencias: abrangencias.map((item) => item.abrangencia as AnpAbrangencia),
    estados: estados.flatMap((item) => item.estado ? [item.estado] : []),
    regioes: regioes.flatMap((item) => item.regiao ? [item.regiao] : []),
    municipios: municipios.flatMap((item) => item.municipio ? [item.municipio] : []),
  }
}

export async function buscarResumoNacional(semanaId: string): Promise<{
  produtos: Array<{
    produto: AnpProduto
    unidade: AnpUnidade
    precoMedio: number
    precoMinimo: number
    precoMaximo: number
  }>
  totalLocalidades: number
  totalProdutos: number
}> {
  const precos = await db.anpPreco.findMany({
    where: { semanaId, abrangencia: 'BRASIL' },
    select: {
      produto: true,
      unidade: true,
      precoMedio: true,
      precoMinimo: true,
      precoMaximo: true,
      localidade: true,
    },
    orderBy: { produto: 'asc' },
  })

  return {
    produtos: precos.map((preco) => ({
      produto: preco.produto as AnpProduto,
      unidade: preco.unidade as AnpUnidade,
      precoMedio: preco.precoMedio,
      precoMinimo: preco.precoMinimo,
      precoMaximo: preco.precoMaximo,
    })),
    totalLocalidades: new Set(precos.map((preco) => preco.localidade)).size,
    totalProdutos: precos.length,
  }
}
