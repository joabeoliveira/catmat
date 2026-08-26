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
  type SalarioCard,
  type SalarioHierarquiaOpcao,
  type SalarioSugestao,
  type SalarioUf,
  type SalarioPercentis,
  type ReferenciaSalarial,
} from './salarios.types'

interface CboRow {
  cbo: number
  salarioCbo?: number
  titulo: string
  grandeGrupoTitulo?: string | null
  subgrupoPrincipalTitulo?: string | null
  familiaTitulo?: string | null
  perfilOcupacional?: string | null
  fonte?: string | null
}

interface PercentilRow extends SalarioPercentis { cbo: number; ano: number }
interface SinonimoRow { cbo: number; sinonimo: string }

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

  if (filtros?.grandeGrupo) {
    clauses.push(`("grandeGrupoTitulo" = ${pushParam(params, filtros.grandeGrupo)} OR "grandeGrupoCodigo" = ${pushParam(params, filtros.grandeGrupo)})`)
  }
  if (filtros?.subgrupoPrincipal) {
    clauses.push(`("subgrupoPrincipalTitulo" = ${pushParam(params, filtros.subgrupoPrincipal)} OR "subgrupoPrincipalCodigo" = ${pushParam(params, filtros.subgrupoPrincipal)})`)
  }
  if (filtros?.familia) {
    clauses.push(`("familiaTitulo" = ${pushParam(params, filtros.familia)} OR "familiaCodigo" = ${pushParam(params, filtros.familia)})`)
  }

  const campoBusca = `concat_ws(' ', "titulo", "grandeGrupoTitulo", "subgrupoPrincipalTitulo", "familiaTitulo", "perfilOcupacional")`
  for (const palavra of separarTermos(filtros?.palavrasObrigatorias)) {
    const p = pushParam(params, palavra)
    clauses.push(`(immutable_unaccent(lower(${campoBusca})) LIKE '%' || immutable_unaccent(lower(${p})) || '%' OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" s WHERE s."cbo"="SalarioCbo"."cbo" AND immutable_unaccent(lower(s."sinonimo")) LIKE '%' || immutable_unaccent(lower(${p})) || '%'))`)
  }
  for (const palavra of separarTermos(filtros?.palavrasExcluidas)) {
    const p = pushParam(params, palavra)
    clauses.push(`NOT (immutable_unaccent(lower(${campoBusca})) LIKE '%' || immutable_unaccent(lower(${p})) || '%' OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" s WHERE s."cbo"="SalarioCbo"."cbo" AND immutable_unaccent(lower(s."sinonimo")) LIKE '%' || immutable_unaccent(lower(${p})) || '%'))`)
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

function buildOccupationWhere(termo: string, filtros: SalarioBuscaParams['filtros'], params: unknown[]) {
  const clauses: string[] = []
  const busca = `concat_ws(' ', o."titulo", o."perfilOcupacional")`
  if (termo) {
    const q = pushParam(params, termo)
    clauses.push(`(o."cbo"::text LIKE ${pushParam(params, `${termo}%`)} OR immutable_unaccent(lower(${busca})) LIKE '%' || immutable_unaccent(lower(${q})) || '%' OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" sn WHERE sn."ocupacaoCbo"=o."cbo" AND immutable_unaccent(lower(sn."sinonimo")) LIKE '%' || immutable_unaccent(lower(${q})) || '%') OR websearch_to_tsquery('portuguese', ${q}) @@ to_tsvector('portuguese', immutable_unaccent(lower(${busca}))))`)
  }
  if (filtros?.uf) clauses.push(`EXISTS (SELECT 1 FROM "SalarioCbo" su WHERE su."cbo"=f."cbo" AND su."uf"=${pushParam(params, filtros.uf.toUpperCase())})`)
  if (filtros?.grandeGrupo) clauses.push(`(f."grandeGrupoTitulo"=${pushParam(params, filtros.grandeGrupo)} OR f."grandeGrupoCodigo"=${pushParam(params, filtros.grandeGrupo)})`)
  if (filtros?.subgrupoPrincipal) clauses.push(`(f."subgrupoPrincipalTitulo"=${pushParam(params, filtros.subgrupoPrincipal)} OR f."subgrupoPrincipalCodigo"=${pushParam(params, filtros.subgrupoPrincipal)})`)
  if (filtros?.familia) clauses.push(`(f."familiaTitulo"=${pushParam(params, filtros.familia)} OR f."familiaCodigo"=${pushParam(params, filtros.familia)})`)
  for (const palavra of separarTermos(filtros?.palavrasObrigatorias)) {
    const p = pushParam(params, palavra)
    clauses.push(`(immutable_unaccent(lower(${busca})) LIKE '%' || immutable_unaccent(lower(${p})) || '%' OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" sn WHERE sn."ocupacaoCbo"=o."cbo" AND immutable_unaccent(lower(sn."sinonimo")) LIKE '%' || immutable_unaccent(lower(${p})) || '%'))`)
  }
  for (const palavra of separarTermos(filtros?.palavrasExcluidas)) {
    const p = pushParam(params, palavra)
    clauses.push(`NOT (immutable_unaccent(lower(${busca})) LIKE '%' || immutable_unaccent(lower(${p})) || '%' OR EXISTS (SELECT 1 FROM "SalarioCboSinonimo" sn WHERE sn."ocupacaoCbo"=o."cbo" AND immutable_unaccent(lower(sn."sinonimo")) LIKE '%' || immutable_unaccent(lower(${p})) || '%'))`)
  }
  return clauses.length ? clauses.join(' AND ') : 'TRUE'
}

function separarTermos(valor?: string): string[] {
  return (valor || '').split(/[;,\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 10)
}

function normalizar(valor?: string | null) {
  return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function valorReferencia(item: SalarioCard, referencia: ReferenciaSalarial): number | null {
  if (referencia === 'p25') return item.percentis?.p25 ?? null
  if (referencia === 'p75') return item.percentis?.p75 ?? null
  if (referencia === 'media') return item.estatisticas.media
  return item.estatisticas.mediana
}

function enriquecerCard(item: SalarioCard, termo: string): SalarioCard {
  const q = normalizar(termo)
  const titulo = normalizar(item.titulo)
  const sinonimo = item.sinonimos?.find((valor) => normalizar(valor).includes(q))
  const hierarquia = normalizar([item.hierarquia?.grandeGrupo, item.hierarquia?.subgrupoPrincipal, item.hierarquia?.familia].filter(Boolean).join(' '))
  const perfil = normalizar(item.hierarquia?.perfilOcupacional)
  let correspondencia: NonNullable<SalarioCard['correspondencia']>

  if (!q) correspondencia = { tipo: 'geral', descricao: 'Resultado da base CBO', aderencia: 100 }
  else if (String(item.cbo).startsWith(q)) correspondencia = { tipo: 'codigo', descricao: 'Código CBO correspondente', aderencia: String(item.cbo) === q ? 100 : 95 }
  else if (titulo === q) correspondencia = { tipo: 'titulo', descricao: 'Título oficial exato', aderencia: 100 }
  else if (titulo.startsWith(q)) correspondencia = { tipo: 'titulo', descricao: 'Título oficial iniciado pelo termo', aderencia: 92 }
  else if (titulo.includes(q)) correspondencia = { tipo: 'titulo', descricao: 'Termo encontrado no título oficial', aderencia: 84 }
  else if (sinonimo) correspondencia = { tipo: 'sinonimo', descricao: 'Encontrado por título relacionado', termoEncontrado: sinonimo, aderencia: normalizar(sinonimo).startsWith(q) ? 78 : 70 }
  else if (hierarquia.includes(q)) correspondencia = { tipo: 'hierarquia', descricao: 'Encontrado na família ou grupo ocupacional', aderencia: 60 }
  else if (perfil.includes(q)) correspondencia = { tipo: 'perfil', descricao: 'Encontrado nas atividades do perfil', aderencia: 50 }
  else correspondencia = { tipo: 'geral', descricao: 'Correspondência aproximada', aderencia: 35 }

  const amplitude = item.estatisticas.menor != null && item.estatisticas.maior != null
    ? item.estatisticas.maior - item.estatisticas.menor
    : null
  const amplitudePercentual = amplitude != null && item.estatisticas.mediana
    ? amplitude / item.estatisticas.mediana
    : null
  const confianca = item.ufCount >= 20 ? 'alta' : item.ufCount >= 10 ? 'media' : 'baixa'

  return { ...item, correspondencia, qualidade: { confianca, amplitude, amplitudePercentual } }
}

function corrigirPercentis(percentis: SalarioPercentis | undefined, fator: number): SalarioPercentis | undefined {
  if (!percentis || fator === 1) return percentis
  const corrigir = (valor: number | null) => typeof valor === 'number' ? valor * fator : null
  return {
    ...percentis,
    p10: corrigir(percentis.p10),
    p25: corrigir(percentis.p25),
    p50: corrigir(percentis.p50),
    p75: corrigir(percentis.p75),
    p90: corrigir(percentis.p90),
    media: corrigir(percentis.media),
    minimo: corrigir(percentis.minimo),
    maximo: corrigir(percentis.maximo),
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
    const filtros = { ...params.filtros, uf, ano, aplicarInpc }

    const pagina = Math.max(1, params.pagina || 1)
    const limite = Math.min(50, Math.max(1, params.limite || 20))
    const offset = (pagina - 1) * limite

    const whereParams: unknown[] = []
    const whereSql = termo ? buildOccupationWhere(termo, filtros, whereParams) : buildWhere(termo, filtros, whereParams)

    const cboRows = await prisma.$queryRawUnsafe<CboRow[]>(
      `
        ${termo
          ? 'SELECT o."cbo", f."cbo" AS "salarioCbo", max(o."titulo") AS titulo, max(f."grandeGrupoTitulo") AS "grandeGrupoTitulo", max(f."subgrupoPrincipalTitulo") AS "subgrupoPrincipalTitulo", max(f."familiaTitulo") AS "familiaTitulo", max(o."perfilOcupacional") AS "perfilOcupacional", max(f."fonte") AS fonte FROM "SalarioCboOcupacao" o JOIN "SalarioCbo" f ON f."cbo"=o."familiaCbo"'
          : 'SELECT "cbo", "cbo" AS "salarioCbo", max("titulo") AS titulo, max("grandeGrupoTitulo") AS "grandeGrupoTitulo", max("subgrupoPrincipalTitulo") AS "subgrupoPrincipalTitulo", max("familiaTitulo") AS "familiaTitulo", max("perfilOcupacional") AS "perfilOcupacional", max("fonte") AS fonte FROM "SalarioCbo"'}
        ${termo ? 'WHERE' : 'WHERE'} ${whereSql}
        ${termo ? 'GROUP BY o."cbo", f."cbo"' : 'GROUP BY "cbo"'}
        LIMIT 3000
      `,
      ...whereParams,
    )

    let fatorInpc = 1
    if (aplicarInpc) {
      fatorInpc = await getFatorInpc(ano)
    }

    const referencia = filtros.referenciaSalarial || 'mediana'
    let encontrados = (await this.montarCards(cboRows, { ano, uf, aplicarInpc, fatorInpc }))
      .map((item) => enriquecerCard(item, termo))

    if (filtros.minimoUfs) encontrados = encontrados.filter((item) => item.ufCount >= filtros.minimoUfs!)
    if (typeof filtros.salarioMinimo === 'number') encontrados = encontrados.filter((item) => (valorReferencia(item, referencia) ?? -Infinity) >= filtros.salarioMinimo!)
    if (typeof filtros.salarioMaximo === 'number') encontrados = encontrados.filter((item) => (valorReferencia(item, referencia) ?? Infinity) <= filtros.salarioMaximo!)

    const ordenarPor = filtros.ordenarPor || 'relevancia'
    encontrados.sort((a, b) => {
      if (ordenarPor === 'salario_asc') return (valorReferencia(a, referencia) ?? Infinity) - (valorReferencia(b, referencia) ?? Infinity)
      if (ordenarPor === 'salario_desc') return (valorReferencia(b, referencia) ?? -Infinity) - (valorReferencia(a, referencia) ?? -Infinity)
      if (ordenarPor === 'ufs_desc') return b.ufCount - a.ufCount || a.titulo.localeCompare(b.titulo, 'pt-BR')
      if (ordenarPor === 'amplitude_asc') return (a.qualidade?.amplitudePercentual ?? Infinity) - (b.qualidade?.amplitudePercentual ?? Infinity)
      if (ordenarPor === 'titulo') return a.titulo.localeCompare(b.titulo, 'pt-BR')
      return (b.correspondencia?.aderencia ?? 0) - (a.correspondencia?.aderencia ?? 0) || b.ufCount - a.ufCount || a.titulo.localeCompare(b.titulo, 'pt-BR')
    })

    const total = encontrados.length
    const items = encontrados.slice(offset, offset + limite)

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
    const inSql = cboRows.map((row) => pushParam(cboParams, row.salarioCbo || row.cbo)).join(', ')
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

    const extraParams: unknown[] = []
    const extraInSql = cboRows.map((row) => pushParam(extraParams, row.cbo)).join(', ')
    const anoParam = pushParam(extraParams, ano)
    const percentilRows = await prisma.$queryRawUnsafe<PercentilRow[]>(
      `SELECT "cbo", "ano", "observacoes", "p10", "p25", "p50", "p75", "p90", "media", "minimo", "maximo" FROM "SalarioCboPercentil" WHERE "cbo" IN (${extraInSql}) AND "ano"=${anoParam}`,
      ...extraParams,
    )
    const percentisPorCbo = new Map(percentilRows.map((row) => [row.cbo, row]))

    const sinonimoParams: unknown[] = []
    const sinonimoInSql = cboRows.map((row) => pushParam(sinonimoParams, row.cbo)).join(', ')
    const sinonimoRows = await prisma.$queryRawUnsafe<SinonimoRow[]>(
      `SELECT COALESCE("ocupacaoCbo", "cbo") AS "cbo", "sinonimo" FROM "SalarioCboSinonimo" WHERE ("cbo" IN (${sinonimoInSql}) OR "ocupacaoCbo" IN (${cboRows.map((row) => pushParam(sinonimoParams, row.cbo)).join(', ')})) ORDER BY "sinonimo"`,
      ...sinonimoParams,
    )
    const sinonimosPorCbo = new Map<number, string[]>()
    for (const row of sinonimoRows) sinonimosPorCbo.set(row.cbo, [...(sinonimosPorCbo.get(row.cbo) || []), row.sinonimo])

    return cboRows.map((c) => {
      const valores = (porCbo.get(c.cbo) ?? [])
        .map((linha) => linha[coluna])
        .filter((v): v is number => typeof v === 'number' && v > 0)

      const corrigidos = valores.map((v) => v * fatorInpc)
      const estatisticas = calcularEstatisticas(aplicarInpc ? corrigidos : valores)
      const estatisticasOriginal = aplicarInpc ? calcularEstatisticas(valores) : undefined

      const percentis = corrigirPercentis(percentisPorCbo.get(c.salarioCbo || c.cbo), aplicarInpc ? fatorInpc : 1)
      const sinonimos = sinonimosPorCbo.get(c.cbo) || []
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
    })
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

  /** Hierarquia oficial disponível para os filtros ocupacionais. */
  async listarHierarquia(): Promise<SalarioHierarquiaOpcao[]> {
    return prisma.$queryRawUnsafe<SalarioHierarquiaOpcao[]>(
      `SELECT DISTINCT "grandeGrupoCodigo" AS "grandeGrupoCodigo", "grandeGrupoTitulo" AS "grandeGrupo", "subgrupoPrincipalCodigo" AS "subgrupoPrincipalCodigo", "subgrupoPrincipalTitulo" AS "subgrupoPrincipal", "familiaCodigo" AS "familiaCodigo", "familiaTitulo" AS "familia" FROM "SalarioCbo" WHERE "grandeGrupoTitulo" IS NOT NULL AND "subgrupoPrincipalTitulo" IS NOT NULL AND "familiaTitulo" IS NOT NULL ORDER BY 2, 4, 6`,
    )
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
