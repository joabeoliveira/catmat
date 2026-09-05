import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const input = JSON.parse(fs.readFileSync(0, 'utf8'))
const date = value => typeof value === 'string' && value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null
const datetime = value => typeof value === 'string' && value ? new Date(value) : null
const number = value => { const n = Number(value); return Number.isFinite(n) ? n : null }

for (const row of input.resultado || []) {
  const controle = String(row.numeroControlePncpAta || '')
  if (!controle) continue
  if (row.numeroItem) {
    const maximoAdesao = number(row.maximoAdesao) || 0
    if (!row.itemExcluido && maximoAdesao > 0) {
      const adesao = {
        numeroControlePncpAta: controle,
        numeroAtaRegistroPreco: row.numeroAtaRegistroPreco || null,
        codigoUnidadeGerenciadora: String(row.codigoUnidadeGerenciadora || '') || null,
        nomeUnidadeGerenciadora: row.nomeUnidadeGerenciadora || null,
        numeroControlePncpCompra: row.numeroControlePncpCompra || null,
        numeroCompra: row.numeroCompra || null,
        anoCompra: row.anoCompra || null,
        codigoModalidadeCompra: row.codigoModalidadeCompra || null,
        nomeModalidadeCompra: row.nomeModalidadeCompra || null,
        dataAssinatura: date(row.dataAssinatura), dataVigenciaInicial: date(row.dataVigenciaInicial), dataVigenciaFinal: date(row.dataVigenciaFinal),
        numeroItem: String(row.numeroItem), codigoItem: number(row.codigoItem), descricaoItem: row.descricaoItem || null, tipoItem: row.tipoItem || null,
        classificacaoFornecedor: row.classificacaoFornecedor || null, niFornecedor: row.niFornecedor || null, nomeRazaoSocialFornecedor: row.nomeRazaoSocialFornecedor || null,
        quantidadeHomologadaItem: number(row.quantidadeHomologadaItem), quantidadeHomologadaVencedor: number(row.quantidadeHomologadaVencedor), quantidadeEmpenhada: number(row.quantidadeEmpenhada),
        valorUnitario: number(row.valorUnitario), valorTotal: number(row.valorTotal), maximoAdesao, itemExcluido: false,
        dataHoraInclusao: datetime(row.dataHoraInclusao), dataHoraAtualizacao: datetime(row.dataHoraAtualizacao),
      }
      await prisma.arpItemAdesao.upsert({ where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: controle, numeroItem: String(row.numeroItem) } }, create: adesao, update: { ...adesao, sincronizadoEm: new Date() } })
    }
    const ata = await prisma.arpAta.findUnique({ where: { numeroControlePncpAta: controle }, select: { id: true } })
    if (!ata) continue
    const data = { ataId: ata.id, numeroControlePncpAta: controle, numeroItem: String(row.numeroItem), codigoItem: number(row.codigoItem), descricaoItem: row.descricaoItem || null, descricaoDetalhada: row.descricaoDetalhada || null, tipoItem: row.tipoItem || null, numeroCompra: row.numeroCompra || null, anoCompra: row.anoCompra || null, dataAssinatura: date(row.dataAssinatura), dataVigenciaInicial: date(row.dataVigenciaInicial), dataVigenciaFinal: date(row.dataVigenciaFinal), niFornecedor: row.niFornecedor || null, nomeRazaoSocialFornecedor: row.nomeRazaoSocialFornecedor || null, quantidadeHomologadaVencedor: number(row.quantidadeHomologadaVencedor), quantidadeHomologadaItem: number(row.quantidadeHomologadaItem), quantidadeRegistrada: number(row.quantidadeRegistrada), unidadeMedida: row.unidadeMedida || null, valorUnitario: number(row.valorUnitario), valorTotal: number(row.valorTotal), maximoAdesao: number(row.maximoAdesao), numeroControlePncpCompra: row.numeroControlePncpCompra || null, idCompra: row.idCompra || null }
    await prisma.arpItem.upsert({ where: { numeroControlePncpAta_numeroItem: { numeroControlePncpAta: controle, numeroItem: String(row.numeroItem) } }, create: data, update: data })
  } else {
    const data = { numeroControlePncpAta: controle, numeroControlePncpCompra: row.numeroControlePncpCompra || null, numeroAtaRegistroPreco: row.numeroAtaRegistroPreco || '', codigoUnidadeGerenciadora: String(row.codigoUnidadeGerenciadora || ''), nomeUnidadeGerenciadora: row.nomeUnidadeGerenciadora || null, codigoOrgao: number(row.codigoOrgao), nomeOrgao: row.nomeOrgao || null, linkAtaPncp: row.linkAtaPNCP || row.linkAtaPncp || null, linkCompraPncp: row.linkCompraPNCP || row.linkCompraPncp || null, numeroCompra: row.numeroCompra || null, anoCompra: row.anoCompra || null, codigoModalidadeCompra: row.codigoModalidadeCompra || null, nomeModalidadeCompra: row.nomeModalidadeCompra || null, dataAssinatura: date(row.dataAssinatura), dataVigenciaInicial: date(row.dataVigenciaInicial), dataVigenciaFinal: date(row.dataVigenciaFinal), valorTotal: number(row.valorTotal), statusAta: row.statusAta || null, objeto: row.objeto || null, quantidadeItens: number(row.quantidadeItens), dataHoraAtualizacao: datetime(row.dataHoraAtualizacao), dataHoraInclusao: datetime(row.dataHoraInclusao), dataHoraExclusao: datetime(row.dataHoraExclusao), ataExcluido: Boolean(row.ataExcluido) }
    await prisma.arpAta.upsert({ where: { numeroControlePncpAta: controle }, create: data, update: data })
  }
}
console.log(`Importados ${input.resultado?.length || 0} registros.`)
await prisma.$disconnect()
