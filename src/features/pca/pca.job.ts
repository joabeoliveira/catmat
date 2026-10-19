import { randomUUID } from 'node:crypto'
import * as XLSX from 'xlsx-js-style'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { normalizePcaRows } from './pca.normalizer'
import { parsePcaBuffer } from './pca.parser'
import { storePcaSource } from './pca.storage'

export async function createPcaJob(buffer: Buffer, fileName: string, mimeType?: string) {
  const draftId = randomUUID()
  const stored = await storePcaSource(buffer, fileName, draftId)
  const existing = await prisma.pcaMatcherJob.findUnique({ where: { hashSha256: stored.hashSha256 }, select: { id: true, status: true, totalItens: true } })
  if (existing) return { ...existing, reused: true }
  const parsed = parsePcaBuffer(buffer, fileName)
  const normalized = normalizePcaRows(parsed.items)
  if (!normalized.length) throw new Error(parsed.warnings.join(' ') || 'Nenhum item válido foi encontrado no arquivo.')
  const job = await prisma.pcaMatcherJob.create({ data: {
    id: draftId, hashSha256: stored.hashSha256, tamanhoBytes: stored.tamanhoBytes, sourceFileName: fileName, sourceMimeType: mimeType || null,
    objectKey: stored.objectKey, originalContent: stored.inlineContent, totalItens: normalized.length, pendentes: normalized.length,
  } })
  await prisma.pcaMatcherItem.createMany({ data: normalized.map((item) => ({
    jobId: job.id, sourceSheet: item.sourceSheet, sourceRow: item.sourceRow, originalRow: item.originalRow as Prisma.InputJsonValue,
    descricaoOriginal: item.originalDescription, descricaoNormalizada: item.normalizedDescription, termoCanonico: item.canonicalTerm,
    tipoCatalogo: item.catalogType, unidade: item.unit || null, quantidade: item.quantity ?? null, classe: item.className || null, atributos: item.attributes as unknown as Prisma.InputJsonValue,
  })) })
  return { id: job.id, status: job.status, totalItens: job.totalItens, warnings: parsed.warnings, sheets: parsed.sheets, reused: false }
}

export async function getPcaJobSummary(id: string) {
  const job = await prisma.pcaMatcherJob.findUnique({ where: { id }, select: { id: true, status: true, sourceFileName: true, totalItens: true, processados: true, aprovados: true, pendentes: true, erros: true, criadoEm: true, atualizadoEm: true } })
  if (!job) return null
  const groups = await prisma.pcaMatcherItem.groupBy({ by: ['status'], where: { jobId: id }, _count: { _all: true } })
  const counts = Object.fromEntries(groups.map((row) => [row.status, row._count._all]))
  return { ...job, progresso: job.totalItens ? Math.round((job.processados / job.totalItens) * 100) : 0, contagens: counts }
}

export async function listPcaItems(id: string, page: number, limit: number, status?: string) {
  const where = { jobId: id, ...(status && status !== 'TODOS' ? { status: status as never } : {}) }
  const [items, total] = await Promise.all([
    prisma.pcaMatcherItem.findMany({ where, orderBy: [{ sourceSheet: 'asc' }, { sourceRow: 'asc' }], skip: (page - 1) * limit, take: limit, include: { candidates: { orderBy: { posicao: 'asc' }, take: 3 }, decision: true } }),
    prisma.pcaMatcherItem.count({ where }),
  ])
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function resetPcaJob(id: string) {
  const job = await prisma.pcaMatcherJob.findUnique({ where: { id }, select: { id: true, totalItens: true } })
  if (!job) throw new Error('Job não encontrado.')
  await prisma.$transaction(async (tx) => {
    const items = await tx.pcaMatcherItem.findMany({ where: { jobId: id }, select: { id: true } })
    const itemIds = items.map((item) => item.id)
    if (itemIds.length) {
      await tx.pcaMatcherDecision.deleteMany({ where: { itemId: { in: itemIds } } })
      await tx.pcaMatcherCandidate.deleteMany({ where: { itemId: { in: itemIds } } })
      await tx.pcaMatcherItem.updateMany({ where: { id: { in: itemIds } }, data: { status: 'PENDENTE', codigoAprovado: null, erro: null } })
    }
    await tx.pcaMatcherJob.update({ where: { id }, data: { status: 'PENDENTE', processados: 0, aprovados: 0, pendentes: job.totalItens, erros: 0, erro: null, iniciadoEm: null, concluidoEm: null } })
  })
  return { id, totalItens: job.totalItens, status: 'PENDENTE' }
}

export async function decidePcaItems(id: string, input: { itemId?: string; codigo?: number; justificativa?: string; ator?: string; aprovarAlta?: boolean }) {
  if (input.aprovarAlta) {
    const items = await prisma.pcaMatcherItem.findMany({ where: { jobId: id, status: 'ALTA_CONFIANCA' }, include: { candidates: { where: { posicao: 1 }, take: 1 } } })
    for (const item of items) {
      const codigo = item.candidates[0]?.codigo
      if (!codigo) continue
      await prisma.$transaction([
        prisma.pcaMatcherItem.update({ where: { id: item.id }, data: { codigoAprovado: codigo } }),
        prisma.pcaMatcherDecision.upsert({ where: { itemId: item.id }, create: { itemId: item.id, codigoAprovado: codigo, justificativa: input.justificativa || 'Aprovação em lote de alta confiança.', ator: input.ator, algoritmoVersao: 'pca-v1' }, update: { codigoAprovado: codigo, justificativa: input.justificativa || 'Aprovação em lote de alta confiança.', ator: input.ator } }),
      ])
    }
    return { approved: items.length }
  }
  if (!input.itemId || !input.codigo) throw new Error('itemId e codigo são obrigatórios para decisão manual.')
  const item = await prisma.pcaMatcherItem.findFirst({ where: { id: input.itemId, jobId: id }, include: { candidates: true } })
  if (!item) throw new Error('Item não encontrado neste job.')
  const candidate = item.candidates.find((row) => row.codigo === input.codigo)
  if (!candidate) throw new Error('Código não está entre os candidatos validados.')
  await prisma.$transaction([
    prisma.pcaMatcherItem.update({ where: { id: item.id }, data: { codigoAprovado: input.codigo, status: 'ALTA_CONFIANCA' } }),
    prisma.pcaMatcherDecision.upsert({ where: { itemId: item.id }, create: { itemId: item.id, codigoAprovado: input.codigo, justificativa: input.justificativa, ator: input.ator, algoritmoVersao: 'pca-v1' }, update: { codigoAprovado: input.codigo, justificativa: input.justificativa, ator: input.ator } }),
  ])
  return { approved: 1, itemId: item.id, codigo: input.codigo }
}

export async function exportPcaJob(id: string) {
  const items = await prisma.pcaMatcherItem.findMany({ where: { jobId: id }, orderBy: [{ sourceSheet: 'asc' }, { sourceRow: 'asc' }], include: { candidates: { where: { posicao: 1 }, take: 1 } } })
  if (!items.length) throw new Error('Job sem itens para exportação.')
  const bySheet = new Map<string, typeof items>()
  for (const item of items) bySheet.set(item.sourceSheet, [...(bySheet.get(item.sourceSheet) || []), item])
  const workbook = XLSX.utils.book_new()
  for (const [sheet, rows] of bySheet) {
    const records = rows.map((item) => {
      const candidate = item.candidates[0]
      return { ...(item.originalRow as Record<string, unknown>), CODIGO_CATMAT_CATSER: item.codigoAprovado || candidate?.codigo || '', DESCRICAO_CATALOGO: candidate?.descricaoCatalogo || '', SCORE_CONFIANCA: candidate ? Math.round(candidate.scoreFinal * 100) : '', STATUS_MATCH: item.status }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), sheet.slice(0, 31) || 'PCA')
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer
}
