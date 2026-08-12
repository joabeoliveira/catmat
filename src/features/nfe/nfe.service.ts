// src/features/nfe/nfe.service.ts

export interface NotaFiscalDTO {
  id: number;
  codigoOrgaoSuperiorDestinatario: string;
  orgaoSuperiorDestinatario: string;
  codigoOrgaoDestinatario: string;
  orgaoDestinatario: string;
  nomeFornecedor: string;
  cnpjFornecedor: string;
  municipioFornecedor: string;
  chaveNotaFiscal: string;
  valorNotaFiscal: string;
  tipoEventoMaisRecente: string;
  dataTipoEventoMaisRecente: string;
  dataEmissao: string;
  numero: number;
  serie: number;
}

export interface ItemNotaFiscal {
  numeroProduto: string;
  descricaoProdutoServico: string;
  codigoNcmSh: string;
  ncmSh: string;
  cfop: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
  valor: string;
}

export interface NFeResposta {
  notaFiscalDTO: NotaFiscalDTO;
  itensNotaFiscal: ItemNotaFiscal[];
}

export async function consultarNFePorChave(chave: string): Promise<NFeResposta> {
  const apiKey = process.env.API_TRANSPARENCIA_KEY;

  if (!apiKey) {
    throw new Error("Chave da API do Portal da Transparência não configurada nas variáveis de ambiente.");
  }

  const chaveLimpa = chave.replace(/\D/g, "");
  if (chaveLimpa.length !== 44) {
    throw new Error("A chave de acesso deve conter exatamente 44 dígitos.");
  }

  const response = await fetch(
    `https://api.portaldatransparencia.gov.br/api-de-dados/notas-fiscais-por-chave?chaveUnicaNotaFiscal=${chaveLimpa}`,
    {
      method: "GET",
      headers: {
        accept: "*/*",
        "chave-api-dados": apiKey,
      },
      next: { revalidate: 3600 }, // Cache do Next.js por 1 hora
    }
  );

  if (!response.ok) {
    throw new Error(`Erro na consulta da NF-e (Status: ${response.status})`);
  }

  return response.json();
}