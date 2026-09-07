import type { Metadata } from 'next'
import { listContracts, listOrganizations } from '@/app/actions/contracts'
import { ContratosContent } from '@/components/contratos/ContratosContent'

export const metadata: Metadata = { title: 'Reajuste de contratos', description: 'Gestão e cálculo de reajustes de contratos administrativos.' }
export const dynamic = 'force-dynamic'

export default async function ContratosPage({ searchParams }: { searchParams: { org?: string } }) {
  const organizations = await listOrganizations()
  const contracts = await listContracts(searchParams.org)
  return <ContratosContent organizations={organizations.map((organization) => ({ id: organization.id, name: organization.name, cnpj: organization.cnpj, uasgCode: organization.uasgCode }))} selectedOrganizationId={searchParams.org || ''} initialContracts={contracts.map((contract) => ({
    id: contract.id, contractNumber: contract.contractNumber, description: contract.description, supplierName: contract.supplierName,
    currentValue: contract.currentValue, indexName: contract.indexName, baseDate: contract.baseDate.toISOString(), nextAdjustment: contract.nextAdjustment.toISOString(), adjustments: contract._count.adjustments, organizationId: contract.organizationId,
  }))} />
}
