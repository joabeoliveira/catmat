import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { consultarProviderExterno } from './pca.external'
import type { PcaAttributes, PcaChunkResult, PcaCatalogType } from './pca.types'

type PendingItem = { id: string; termoCanonico: string; descricaoNormalizada: string; tipoCatalogo: PcaCatalogType; unidade: string | null; atributos: unknown }
type CatalogRow = { codigo: number; descricao: string; tipo: PcaCatalogType; dataAtualizacao?: Date }
type Ranked = CatalogRow & { textual: number; attributes: number; activity: number; recency: number; final: number; evidence: Record<string, unknown> }

function canonical(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() }
function terms(value: string) { return new Set(canonical(value).split(' ').filter((term) => term.length >= 3)) }

function attributeScore(source: PcaAttributes, candidate: string) {
  const required = [...(source.measures || []), ...(source.concentrations || []), ...(source.voltages || []), ...(source.dimensions || [])].map(canonical)
  if (!required.length) return { score: 1, conflict: false, matched: [] as string[] }
  const candidateText = canonical(candidate)
  const matched = required.filter((value) => candidateText.includes(value))
  return { score: matched.length / required.length, conflict: matched.length === 0, matched }
}

function confidence(score: number, margin: number, hasUnit: boolean, hasActivity: boolean) {
  if (score >= 0.85 && margin >= 0.15 && hasUnit && hasActivity) return 'ALTA_CONFIANCA' as const
  if (score >= 0.75) return 'MEDIA_CONFIANCA' as const
  return 'BAIXA_CONFIANCA' as const
}

async function exactMatches(type: PcaCatalogType, values: string[]) {
  if (!values.length || (type !== 'CATMAT' && type !== 'CATSER')) return [] as CatalogRow[]
  if (type === 'CATMAT') return prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
    SELECT "codigoItem" AS codigo, "descricaoItem" AS descricao, 'CATMAT' AS tipo, "dataHoraAtualizacao" AS "dataAtualizacao"
    FROM "CatmatItem" WHERE regexp_replace(lower(immutable_unaccent("descricaoItem")), '[^a-z0-9]+', ' ', 'g') IN (${Prisma.join(values)})
  `)
  return prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
    SELECT "codigoItem" AS codigo, "nomeServico" AS descricao, 'CATSER' AS tipo
    FROM "CatserItem" WHERE regexp_replace(lower(immutable_unaccent("nomeServico")), '[^a-z0-9]+', ' ', 'g') IN (${Prisma.join(values)})
  `)
}

async function localCandidates(item: PendingItem): Promise<Ranked[]> {
  if (item.tipoCatalogo !== 'CATMAT' && item.tipoCatalogo !== 'CATSER') return []
  const raw = item.descricaoNormalizada
  const attributes = (item.atributos || {}) as PcaAttributes
  const rows = item.tipoCatalogo === 'CATMAT'
    ? await prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
      WITH q AS (SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${raw})) AS tsq, immutable_unaccent(${raw}) AS raw)
      SELECT "codigoItem" AS codigo, "descricaoItem" AS descricao, 'CATMAT' AS tipo, "dataHoraAtualizacao" AS "dataAtualizacao"
      FROM "CatmatItem", q WHERE tsv @@ q.tsq OR immutable_unaccent("descricaoItem") % q.raw
      ORDER BY (ts_rank_cd(tsv, q.tsq, 32) * 0.75 + similarity(immutable_unaccent("descricaoItem"), q.raw) * 0.25) DESC, "codigoItem" DESC LIMIT 12
    `)
    : await prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
      WITH q AS (SELECT websearch_to_tsquery('portuguese', immutable_unaccent(${raw})) AS tsq, immutable_unaccent(${raw}) AS raw)
      SELECT "codigoItem" AS codigo, "nomeServico" AS descricao, 'CATSER' AS tipo
      FROM "CatserItem", q WHERE "busca_tsv" @@ q.tsq OR immutable_unaccent("nomeServico") % q.raw
      ORDER BY (ts_rank_cd("busca_tsv", q.tsq, 32) * 0.75 + similarity(immutable_unaccent("nomeServico"), q.raw) * 0.25) DESC, "codigoItem" DESC LIMIT 12
    `)
  const codes = rows.map((row) => row.codigo)
  const activity = codes.length ? await prisma.compraItem.groupBy({ by: ['codigoItemCatalogo'], where: { codigoItemCatalogo: { in: codes } }, _count: { _all: true } }) : []
  const activityMap = new Map(activity.map((row) => [row.codigoItemCatalogo, row._count._all]))
  const maxCode = Math.max(...rows.map((row) => row.codigo), 1)
  const queryTerms = terms(raw)
  return rows.map((row, index) => {
    const candidateTerms = terms(row.descricao)
    const overlap = [...queryTerms].filter((term) => candidateTerms.has(term)).length / Math.max(queryTerms.size, 1)
    const attrs = attributeScore(attributes, row.descricao)
    const textual = Math.min(1, 0.7 * overlap + 0.3 * (1 - index / Math.max(rows.length, 1)))
    const activityScore = activityMap.has(row.codigo) ? 1 : 0
    const recency = Math.min(1, row.codigo / maxCode)
    const final = Math.max(0, Math.min(1, textual * 0.75 + attrs.score * 0.15 + activityScore * 0.06 + recency * 0.04 - (attrs.conflict ? 0.35 : 0)))
    return { ...row, textual, attributes: attrs.score, activity: activityScore, recency, final, evidence: { matchedAttributes: attrs.matched, conflict: attrs.conflict, quantidadeCompras: activityMap.get(row.codigo) || 0 } }
  }).sort((a, b) => b.final - a.final || b.codigo - a.codigo)
}

async function exactByGroup(items: PendingItem[]) {
  const groups = new Map<PcaCatalogType, Set<string>>()
  for (const item of items) { const values = groups.get(item.tipoCatalogo) || new Set<string>(); values.add(item.termoCanonico); groups.set(item.tipoCatalogo, values) }
  const rows = (await Promise.all([...groups.entries()].map(([type, values]) => exactMatches(type, [...values])))).flat()
  return new Map(rows.map((row) => [canonical(row.descricao), row]))
}

export async function processPcaChunk(jobId: string, _offset: number, requestedLimit: number): Promise<PcaChunkResult> {
  const limit = Math.min(50, Math.max(25, requestedLimit || 35))
  const job = await prisma.pcaMatcherJob.findUnique({ where: { id: jobId }, select: { id: true, totalItens: true } })
  if (!job) throw new Error('Job PCA não encontrado.')
  const pending = await prisma.$transaction(async (tx) => {
    const rows = await tx.pcaMatcherItem.findMany({ where: { jobId, status: 'PENDENTE' }, orderBy: [{ sourceSheet: 'asc' }, { sourceRow: 'asc' }], take: limit, select: { id: true, termoCanonico: true, descricaoNormalizada: true, tipoCatalogo: true, unidade: true, atributos: true } }) as PendingItem[]
    if (rows.length) await tx.pcaMatcherItem.updateMany({ where: { id: { in: rows.map((row) => row.id) }, status: 'PENDENTE' }, data: { status: 'PROCESSANDO' } })
    await tx.pcaMatcherJob.update({ where: { id: jobId }, data: { status: 'PROCESSANDO', iniciadoEm: new Date() } })
    return rows
  })
  if (!pending.length) return { jobId, processed: 0, nextOffset: null, total: job.totalItens, progress: 100, status: 'CONCLUIDO', errors: 0 }

  const exact = await exactByGroup(pending)
  let errors = 0
  await prisma.$transaction(async (tx) => {
    for (const item of pending) {
      try {
        let ranked = exact.has(item.termoCanonico) ? [{ ...exact.get(item.termoCanonico)!, textual: 1, attributes: 1, activity: 0, recency: Math.min(1, exact.get(item.termoCanonico)!.codigo / 1_000_000), final: 0.95, evidence: { exactCanonical: true } }] as Ranked[] : await localCandidates(item)
        if (!ranked.length || ranked[0].final < 0.75) {
          const external = await consultarProviderExterno(item.descricaoNormalizada, item.tipoCatalogo)
          if (external.length) {
            const codes = external.map((suggestion) => suggestion.codigo)
            const valid = item.tipoCatalogo === 'CATMAT' ? await prisma.catmatItem.findMany({ where: { codigoItem: { in: codes } }, select: { codigoItem: true, descricaoItem: true } }) : await prisma.catserItem.findMany({ where: { codigoItem: { in: codes } }, select: { codigoItem: true, nomeServico: true } })
            ranked = valid.map((row, index) => ({ codigo: row.codigoItem, descricao: 'descricaoItem' in row ? row.descricaoItem : row.nomeServico, tipo: item.tipoCatalogo, textual: 0.75, attributes: 0.75, activity: 0, recency: Math.min(1, row.codigoItem / 1_000_000), final: 0.75, evidence: { origemExterna: true, posicaoExterna: index + 1 } }))
          }
        }
        const top = ranked.slice(0, 3)
        const margin = top.length > 1 ? top[0].final - top[1].final : top.length ? top[0].final : 0
        const status = item.tipoCatalogo === 'OBRA' ? 'FORA_ESCOPO' : top.length ? confidence(top[0].final, margin, Boolean(item.unidade), top[0].activity > 0) : 'SEM_MATCH'
        await tx.pcaMatcherCandidate.deleteMany({ where: { itemId: item.id } })
        if (top.length) await tx.pcaMatcherCandidate.createMany({ data: top.map((candidate, index) => ({ itemId: item.id, tipoCatalogo: candidate.tipo, codigo: candidate.codigo, descricaoCatalogo: candidate.descricao, posicao: index + 1, scoreTextual: candidate.textual, scoreAtributos: candidate.attributes, scoreAtividade: candidate.activity, scoreRecencia: candidate.recency, scoreFinal: candidate.final, evidencias: { ...candidate.evidence, margemPrimeiroSegundo: margin }, origem: candidate.evidence.origemExterna ? 'IA' : 'LOCAL' })) })
        await tx.pcaMatcherItem.update({ where: { id: item.id }, data: { status, codigoAprovado: status === 'ALTA_CONFIANCA' ? top[0]?.codigo : null } })
      } catch (error) {
        errors += 1
        await tx.pcaMatcherItem.update({ where: { id: item.id }, data: { status: 'ERRO', erro: error instanceof Error ? error.message : 'Falha ao classificar item.' } })
      }
    }
    const counts = await tx.pcaMatcherItem.groupBy({ by: ['status'], where: { jobId }, _count: { _all: true } })
    const processed = counts.filter((row) => !['PENDENTE', 'PROCESSANDO'].includes(row.status)).reduce((sum, row) => sum + row._count._all, 0)
    const approved = counts.filter((row) => row.status === 'ALTA_CONFIANCA').reduce((sum, row) => sum + row._count._all, 0)
    const pendingCount = counts.filter((row) => ['PENDENTE', 'PROCESSANDO', 'MEDIA_CONFIANCA', 'BAIXA_CONFIANCA'].includes(row.status)).reduce((sum, row) => sum + row._count._all, 0)
    await tx.pcaMatcherJob.update({ where: { id: jobId }, data: { processados: processed, aprovados: approved, pendentes: pendingCount, erros: errors } })
  })
  const remaining = await prisma.pcaMatcherItem.count({ where: { jobId, status: { in: ['PENDENTE', 'PROCESSANDO'] } } })
  return { jobId, processed: pending.length, nextOffset: remaining ? 0 : null, total: job.totalItens, progress: job.totalItens ? Math.min(100, Math.round(((job.totalItens - remaining) / job.totalItens) * 100)) : 100, status: remaining ? 'PROCESSANDO' : 'CONCLUIDO', errors }
}
