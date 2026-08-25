// src/features/salarios/salarios.service.ts
// Busca de salários por ocupação (CBO) com estatísticas nacionais (entre UFs)
// e correção monetária opcional pelo INPC. Padrão do projeto: $queryRawUnsafe.
import { prisma } from '@/lib/db'
import { getFatorInpc } from './inpc.service'
import {
  ANOS_SALARIOS,
  type AnoSalario,
  type EstatisticasSalario,
  type SalarioBuscaParams,
  type SalarioBuscaResponse,
  type SalarioDetalheResponse,
  type SalarioSugestao,
  type SalarioUf,
  type SalarioPercentis,
} from './salarios.types'

interface CboRow {
  cbo: number
  titulo: string
  grandeGrupoTitulo?: string | null
  subgrupoPrincipalTitulo?: string | null
  familiaTitulo?: string | null
  perfilOcupacional?: string | null
  fonte?: string | null
}

interface PercentilRow extends SalarioPercentis { cbo: number; ano: number }

interface UfRow {
  uf: string
  estado: string
}

interface SalarioLinhaRow {
  uf: string
  estado: string
  cbo: number
  titulo: string
  salario2023: number | null
  salario2024: number | null
  salario2025: number | null
  salario2026: number | null
  grandeGrupoTitulo?: string | null
  subgrupoPrincipalTitulo?: string | null
  familiaTitulo?: string | null
  perfilOcupacional?: string | null
  fonte?: string | null
}

interface CountRow {
  total: bigint | number
}

function asCount(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value
}

function pushParam(params: unknown[], value: unknown) {
  params.push(value)
  return `$${params.length}`
}

function buildWhere(termo: string, filtros: SalarioBuscaParams['filtros'], params: unknown[]) {
  const clauses: string[] = []

  if (termo) {
    const partes: string[] = []
    const q = pushParam(params, termo)
    partes.push(`("busca_tsv" @@ websearch_to_tsquery('portuguese', ${q}))`)
    partes.push(`immutable_unaccent(lower("titulo")) LIKE '%' || immutable_unaccent(lower(${q})) || '%'`)
    partes.push(`EXISTS (SELECT 1 FROM "SalarioCboSinonimo" s WHERE s."cbo" = "SalarioCbo"."cbo" AND immutable_unaccent(lower(s."sinonimo")) LIKE '%' || immutable_unaccent(lower(${q})) || '%')`)
    partes.push(`immutable_unaccent(lower(coalesce("perfilOcupacional", ''))) LIKE '%' || immutable_unaccent(lower(${q})) || '%'`)
    partes.push(`(similarity(immutable_unaccent(lower("titulo")), immutable_unaccent(lower(${q}))) > 0.25)`)
    if (/^\d+$/.test(termo)) {
      partes.push(`("cbo"::text LIKE ${pushParam(params, `${termo}%`)})`)
    }
    clauses.push(`(${partes.join(' OR ')})`)
  }

  if (filtros?.uf) {
    clauses.push(`("uf" = ${pushParam(params, filtros.uf.toUpperCase())})`)
  }

  return clauses.length ? clauses.join(' AND ') : 'TRUE'
}

function calcularEstatisticas(valores: number[]): EstatisticasSalario {
  const positivos = [...valores].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
  if (positivos.length === 0) {
    return { menor: null, media: null, mediana: null, maior: null, ufCount: 0 }
  }
  const soma = positivos.reduce((acc, v) => acc + v, 0)
  const meio = Math.floor(positivos.length / 2)
  const mediana =
    positivos.length % 2 === 0 ? (positivos[meio - 1] + positivos[meio]) / 2 : positivos[meio]
  return {
    menor: positivos[0],
    media: soma / positivos.length,
    mediana,
    maior: positivos[positivos.length - 1],
    ufCount: positivos.length,
  }
}

type ColunaSalario = 'salario2023' | 'salario2024' | 'salario2025' | 'salario2026'

function colunaDoAno(ano: AnoSalario): ColunaSalario {
  if (!ANOS_SALARIOS.includes(ano)) return 'salario2026'
  return `salario${ano}` as ColunaSalario
}

export class SalariosService {
  /**
   * Busca ocupações (CBO) por termo, com filtros de UF e ano, calculando as
   * estatísticas nacionais (menor/média/mediana/maior entre as UFs) e aplicando
   * correção INPC quando solicitado.
   */
  async buscar(params: SalarioBuscaParams): Promise<SalarioBuscaResponse> {
    const termo = params.termo.trim()
    const ano: AnoSalario = ANOS_SALARIOS.includes((params.filtros?.ano ?? 2026) as AnoSalario)
      ? (params.filtros?.ano as AnoSalario)
      : 2026
    const aplicarInpc = Boolean(params.filtros?.aplicarInpc)
    const uf = params.filtros?.uf?.trim().toUpperCase()

    const pagina = Math.max(1, params.pagina || 1)
    const limite = Math.min(50, Math.max(1, params.limite || 20))
    const offset = (pagina - 1) * limite

    const whereParams: unknown[] = []
    const whereSql = buildWhere(termo, { uf, ano, aplicarInpc }, whereParams)

    const cboRows = await prisma.$queryRawUnsafe<CboRow[]>(
      `
        SELECT "cbo", max("titulo") AS titulo, max("grandeGrupoTitulo") AS "grandeGrupoTitulo", max("subgrupoPrincipalTitulo") AS "subgrupoPrincipalTitulo", max("familiaTitulo") AS "familiaTitulo", max("perfilOcupacional") AS "perfilOcupacional", max("fonte") AS fonte
        FROM "SalarioCbo"
        WHERE ${whereSql}
        GROUP BY "cbo"
        ORDER BY max("titulo") ASC
        LIMIT ${pushParam(whereParams, limite)}
        OFFSET ${pushParam(whereParams, offset)}
      `,
      ...whereParams,
    )

    const baseParams = whereParams.slice(0, -2)
    const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
      `
        SELECT count(*) AS total
        FROM (SELECT "cbo" FROM "SalarioCbo" WHERE ${whereSql} GROUP BY "cbo") AS sub
      `,
      ...baseParams,
    )
    const total = asCount(countRows[0]?.total ?? 0)

    let fatorInpc = 1
    if (aplicarInpc) {
      fatorInpc = await getFatorInpc(ano)
    }

    const items = await this.montarCards(cboRows, { ano, uf, aplicarInpc, fatorInpc })

    return {
      items,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
      ano,
      aplicarInpc,
      fatorInpc,
    }
  }

  private async montarCards(
    cboRows: CboRow[],
    opts: { ano: AnoSalario; uf?: string; aplicarInpc: boolean; fatorInpc: number },
  ) {
    if (cboRows.length === 0) return []
    const { ano, uf, aplicarInpc, fatorInpc } = opts
    const coluna = colunaDoAno(ano)

    const cboParams: unknown[] = []
    const inSql = cboRows.map((row) => pushParam(cboParams, row.cbo)).join(', ')
    let whereExtra = ''
    if (uf) {
      whereExtra = ` AND "uf" = ${pushParam(cboParams, uf)}`
    }

    const linhas = await prisma.$queryRawUnsafe<SalarioLinhaRow[]>(
      `
        SELECT "uf", "estado", "cbo", "titulo", "salario2023", "salario2024", "salario2025", "salario2026"
        FROM "SalarioCbo"
        WHERE "cbo" IN (${inSql})${whereExtra}
      `,
      ...cboParams,
    )

    const porCbo = new Map<number, SalarioLinhaRow[]>()
    for (const linha of linhas) {
      const lista = porCbo.get(linha.cbo) ?? []
      lista.push(linha)
      porCbo.set(linha.cbo, lista)
    }

    return Promise.all(cboRows.map(async (c) => {
      const valores = (porCbo.get(c.cbo) ?? [])
        .map((linha) => linha[coluna])
        .filter((v): v is number => typeof v === 'number' && v > 0)

      const corrigidos = valores.map((v) => v * fatorInpc)
      const estatisticas = calcularEstatisticas(aplicarInpc ? corrigidos : valores)
      const estatisticasOriginal = aplicarInpc ? calcularEstatisticas(valores) : undefined

      const percentis = await this.buscarPercentis(c.cbo, ano)
      const sinonimos = await this.buscarSinonimos(c.cbo)
      return {
        cbo: c.cbo,
        titulo: c.titulo,
        ufCount: valores.length,
        estatisticas,
        estatisticasOriginal,
        hierarquia: { grandeGrupo: c.grandeGrupoTitulo, subgrupoPrincipal: c.subgrupoPrincipalTitulo, familia: c.familiaTitulo, perfilOcupacional: c.perfilOcupacional, fonte: c.fonte },
        percentis,
        sinonimos,
      }
    }))
  }

  private async buscarPercentis(cbo: number, ano: AnoSalario): Promise<SalarioPercentis | undefined> {
    const rows = await prisma.$queryRawUnsafe<SalarioPercentis[]>(`SELECT "observacoes", "p10", "p25", "p50", "p75", "p90", "media", "minimo", "maximo" FROM "SalarioCboPercentil" WHERE "cbo"=$1 AND "ano"=$2`, cbo, ano)
    return rows[0]
  }

  private async buscarSinonimos(cbo: number): Promise<string[]> {
    const rows = await prisma.$queryRawUnsafe<{ sinonimo: string }[]>(`SELECT "sinonimo" FROM "SalarioCboSinonimo" WHERE "cbo"=$1 ORDER BY "sinonimo"`, cbo)
    return rows.map((row) => row.sinonimo)
  }

  /** Sugestões para autocomplete (título ou código CBO). */
  async sugestoes(termo: string, limite = 8): Promise<SalarioSugestao[]> {
    const q = termo.trim()
    if (q.length < 2) return []
    const rows = await prisma.$queryRawUnsafe<CboRow[]>(
      `
        SELECT "cbo", max("titulo") AS titulo
        FROM "SalarioCbo"
        WHERE ("busca_tsv" @@ websearch_to_tsquery('portuguese', $1))
           OR (immutable_unaccent(lower("titulo")) LIKE '%' || immutable_unaccent(lower($1)) || '%')
           OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" s WHERE s."cbo" = "SalarioCbo"."cbo" AND immutable_unaccent(lower(s."sinonimo")) LIKE '%' || immutable_unaccent(lower($1)) || '%')
           OR ("cbo"::text LIKE $2)
        GROUP BY "cbo"
        ORDER BY max("titulo") ASC
        LIMIT $3
      `,
      q,
      `${q}%`,
      limite,
    )
    return rows.map((r: CboRow) => ({ cbo: r.cbo, titulo: r.titulo }))
  }

  /** Lista de UFs disponíveis (para o filtro). */
  async listarUfs(): Promise<SalarioUf[]> {
    const rows = await prisma.$queryRawUnsafe<UfRow[]>(
      `
        SELECT "uf", max("estado") AS estado
        FROM "SalarioCbo"
        GROUP BY "uf"
        ORDER BY "uf" ASC
      `,
    )
    return rows.map((r: UfRow) => ({ uf: r.uf, estado: r.estado }))
  }

  /** Detalhe de um CBO com os valores por UF. */
  async buscarDetalhe(
    cbo: number,
    filtros: { ano?: AnoSalario; uf?: string; aplicarInpc?: boolean } = {},
  ): Promise<SalarioDetalheResponse> {
    if (!Number.isInteger(cbo) || cbo <= 0) throw new Error('Código CBO inválido.')
    const ano: AnoSalario = ANOS_SALARIOS.includes((filtros.ano ?? 2026) as AnoSalario)
      ? (filtros.ano as AnoSalario)
      : 2026
    const aplicarInpc = Boolean(filtros.aplicarInpc)
    const uf = filtros.uf?.trim().toUpperCase()
    const coluna = colunaDoAno(ano)

    const linhas = await prisma.$queryRawUnsafe<SalarioLinhaRow[]>(`SELECT "uf", "estado", "cbo", "titulo", "salario2023", "salario2024", "salario2025", "salario2026", "grandeGrupoTitulo", "subgrupoPrincipalTitulo", "familiaTitulo", "perfilOcupacional", "fonte" FROM "SalarioCbo" WHERE "cbo"=$1 ${uf ? 'AND "uf"=$2' : ''} ORDER BY "uf" ASC`, ...(uf ? [cbo, uf] : [cbo]))
    if (linhas.length === 0) throw new Error('CBO não encontrado.')

    let fatorInpc = 1
    if (aplicarInpc) fatorInpc = await getFatorInpc(ano)

    const valores = linhas
      .map((linha: SalarioLinhaRow) => linha[coluna])
      .filter((v: number | null): v is number => typeof v === 'number' && v > 0)
    const corrigidos = valores.map((v: number) => v * fatorInpc)

    const valoresPorUf = linhas.map((linha: SalarioLinhaRow) => ({
      uf: linha.uf,
      estado: linha.estado,
      salario: linha[coluna] != null ? linha[coluna]! * (aplicarInpc ? fatorInpc : 1) : null,
    }))

    const historico = await prisma.$queryRawUnsafe<Array<{ ano: number; uf: string; estado: string; salario: number }>>(`SELECT h."ano", h."uf", s."estado", h."salario" FROM "SalarioCboHistorico" h JOIN "SalarioCbo" s ON s."cbo"=h."cbo" AND s."uf"=h."uf" WHERE h."cbo"=$1 ${uf ? 'AND h."uf"=$2' : ''} ORDER BY h."ano", h."uf"`, ...(uf ? [cbo, uf] : [cbo]))
    const percentilRows = await prisma.$queryRawUnsafe<Array<SalarioPercentis & { ano: number }>>(`SELECT "ano", "observacoes", "p10", "p25", "p50", "p75", "p90", "media", "minimo", "maximo" FROM "SalarioCboPercentil" WHERE "cbo"=$1 ORDER BY "ano"`, cbo)
    return {
      cbo,
      titulo: linhas[0].titulo,
      ano,
      aplicarInpc,
      fatorInpc,
      estatisticas: calcularEstatisticas(aplicarInpc ? corrigidos : valores),
      valoresPorUf,
      hierarquia: { grandeGrupo: linhas[0].grandeGrupoTitulo, subgrupoPrincipal: linhas[0].subgrupoPrincipalTitulo, familia: linhas[0].familiaTitulo, perfilOcupacional: linhas[0].perfilOcupacional, fonte: linhas[0].fonte },
      sinonimos: await this.buscarSinonimos(cbo),
      historico,
      percentis: percentilRows,
    }
  }
}
