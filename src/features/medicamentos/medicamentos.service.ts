import { prisma } from '@/lib/db'
import type { MedicamentosBuscaResponse } from './medicamentos.types'

interface MedicamentoRow {
  id: number
  codigoBr: string
  catmat: string
  principioAtivo: string
  concentracao: string
  formaFarmaceutica: string
  unidadeFornecimento: string
  score: number
}

interface CountRow {
  total: bigint | number
}

function asCount(value: bigint | number) {
  return typeof value === 'bigint' ? Number(value) : value
}

function pushParam(params: unknown[], value: unknown) {
  params.push(value)
  return `$${params.length}`
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function mapItem(row: MedicamentoRow) {
  return {
    id: row.id,
    codigoBr: row.codigoBr,
    catmat: row.catmat,
    principioAtivo: row.principioAtivo,
    concentracao: row.concentracao,
    formaFarmaceutica: row.formaFarmaceutica,
    unidadeFornecimento: row.unidadeFornecimento,
    compatibilidade: Math.max(0, Math.min(100, Math.round(Number(row.score || 0) * 100))),
  }
}

export class MedicamentosService {
  async buscar(termo: string, pagina = 1, limite = 20): Promise<MedicamentosBuscaResponse> {
    const q = termo.trim()
    const paginaSegura = Math.max(1, pagina || 1)
    const limiteSeguro = Math.min(50, Math.max(1, limite || 20))

    if (q.length < 2) {
      return { items: [], total: 0, pagina: 1, limite: limiteSeguro, totalPaginas: 0 }
    }

    const params: unknown[] = []
    const termoParam = pushParam(params, q)
    const likeParam = pushParam(params, `%${escapeLike(q)}%`)
    const whereSql = `(
      "busca_tsv" @@ websearch_to_tsquery('portuguese', ${termoParam})
      OR immutable_unaccent("codigoBr") ILIKE immutable_unaccent(${likeParam}) ESCAPE '\\'
      OR immutable_unaccent("catmat") ILIKE immutable_unaccent(${likeParam}) ESCAPE '\\'
      OR similarity(immutable_unaccent("principioAtivo"), immutable_unaccent(${termoParam})) > 0.08
    )`
    const limitParam = pushParam(params, limiteSeguro)
    const offsetParam = pushParam(params, (paginaSegura - 1) * limiteSeguro)

    const rows = await prisma.$queryRawUnsafe<MedicamentoRow[]>(
      `
        SELECT "id", "codigoBr", "catmat", "principioAtivo", "concentracao",
               "formaFarmaceutica", "unidadeFornecimento",
               (
                 ts_rank_cd("busca_tsv", websearch_to_tsquery('portuguese', ${termoParam}))
                 + similarity(immutable_unaccent("principioAtivo"), immutable_unaccent(${termoParam}))
                 + CASE WHEN immutable_unaccent("codigoBr") ILIKE immutable_unaccent(${likeParam}) ESCAPE '\\' THEN 1 ELSE 0 END
                 + CASE WHEN immutable_unaccent("catmat") ILIKE immutable_unaccent(${likeParam}) ESCAPE '\\' THEN 1 ELSE 0 END
               ) AS score
        FROM "MedicamentoCatmat"
        WHERE ${whereSql}
        ORDER BY score DESC, "principioAtivo" ASC, "catmat" ASC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      ...params,
    )

    const countParams = params.slice(0, 2)
    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT count(*) AS total FROM "MedicamentoCatmat" WHERE ${whereSql}`,
      ...countParams,
    )
    const total = asCount(countRows[0]?.total ?? 0)

    return {
      items: rows.map(mapItem),
      total,
      pagina: paginaSegura,
      limite: limiteSeguro,
      totalPaginas: Math.ceil(total / limiteSeguro),
    }
  }
}
