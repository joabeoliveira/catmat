"use client";

import React from "react";
import type { NFeResposta } from "@/features/nfe/nfe.service";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface DanfeViewerProps {
  dados: NFeResposta;
}

function CampoDanfe({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-10 border border-black px-1.5 py-1 ${className}`}>
      <div className="text-[8px] font-bold uppercase leading-none text-gray-700">{label}</div>
      <div className="mt-1 text-[10px] leading-tight">{children || "Nao informado"}</div>
    </div>
  );
}

export function DanfeViewer({ dados }: DanfeViewerProps) {
  const { notaFiscalDTO, itensNotaFiscal } = dados;
  const chaveAcesso = notaFiscalDTO.chaveNotaFiscal || "Nao informada";

  return (
    <div className="danfe-print-root space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold">Nota Fiscal Eletrônica</h2>
        <Button onClick={() => window.print()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Imprimir / Baixar DANFE (PDF)
        </Button>
      </div>

      <div className="danfe-document border border-black bg-white p-3 font-sans text-[10px] text-black print:border-none print:p-0">
        <div className="mb-1 grid grid-cols-[1fr_150px] border border-black">
          <div className="p-1 text-[8px] leading-tight">
            RECEBEMOS DE <strong>{notaFiscalDTO.nomeFornecedor}</strong> OS PRODUTOS/SERVICOS CONSTANTES DA NOTA FISCAL ELETRONICA INDICADA ABAIXO.
          </div>
          <div className="border-l border-black p-1 text-center">
            <div className="text-[8px] font-bold uppercase">NF-e</div>
            <div className="text-sm font-bold">No {notaFiscalDTO.numero}</div>
            <div className="text-[9px]">Serie {notaFiscalDTO.serie}</div>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-[1fr_120px_1.2fr] border border-black">
          <div className="p-2">
            <div className="text-[8px] font-bold uppercase text-gray-700">Identificacao do emitente</div>
            <div className="mt-2 text-sm font-bold uppercase leading-tight">{notaFiscalDTO.nomeFornecedor}</div>
            <div className="mt-2 leading-tight">CNPJ: {notaFiscalDTO.cnpjFornecedor}</div>
            <div className="leading-tight">Municipio: {notaFiscalDTO.municipioFornecedor || "Nao informado"}</div>
          </div>

          <div className="border-x border-black p-1 text-center">
            <div className="text-lg font-bold">DANFE</div>
            <div className="mt-1 text-[9px] font-bold leading-tight">Documento Auxiliar da Nota Fiscal Eletronica</div>
            <div className="mt-3 border border-black py-1 text-[9px]">
              <div>0 - Entrada</div>
              <div>1 - Saida</div>
            </div>
            <div className="mt-2 text-sm font-bold">NF-e No {notaFiscalDTO.numero}</div>
            <div className="text-[9px]">Serie {notaFiscalDTO.serie}</div>
          </div>

          <div className="p-1">
            <div className="flex h-12 items-center justify-center border border-black bg-gray-50 text-[9px] font-bold uppercase tracking-[0.25em]">
              Controle do Fisco
            </div>
            <div className="mt-1 border border-black p-1">
              <div className="text-[8px] font-bold uppercase text-gray-700">Chave de acesso</div>
              <div className="mt-1 break-all text-center font-mono text-[11px] font-bold leading-tight">{chaveAcesso}</div>
            </div>
            <div className="mt-1 border border-black p-1 text-center text-[9px] leading-tight">
              Consulta no Portal da Transparencia do Governo Federal
            </div>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-[1.2fr_1fr_1fr]">
          <CampoDanfe label="Natureza da operacao">Consulta de NF-e por chave de acesso</CampoDanfe>
          <CampoDanfe label="Protocolo de autorizacao">Nao informado pelo Portal</CampoDanfe>
          <CampoDanfe label="Data de emissao">{notaFiscalDTO.dataEmissao}</CampoDanfe>
        </div>

        <div className="mb-1 grid grid-cols-3">
          <CampoDanfe label="Inscricao estadual">Nao informada</CampoDanfe>
          <CampoDanfe label="Inscricao estadual do substituto tributario">Nao informada</CampoDanfe>
          <CampoDanfe label="CNPJ">{notaFiscalDTO.cnpjFornecedor}</CampoDanfe>
        </div>

        <div className="border-x border-t border-black bg-gray-100 px-1 py-0.5 text-center text-[9px] font-bold uppercase">
          Destinatario / Remetente
        </div>
        <div className="mb-1 grid grid-cols-[1.4fr_0.7fr_0.7fr]">
          <CampoDanfe label="Nome / Razao social">{notaFiscalDTO.orgaoDestinatario}</CampoDanfe>
          <CampoDanfe label="CNPJ / CPF">{notaFiscalDTO.codigoOrgaoDestinatario}</CampoDanfe>
          <CampoDanfe label="Data da emissao">{notaFiscalDTO.dataEmissao}</CampoDanfe>
          <CampoDanfe label="Orgao superior" className="col-span-2">{notaFiscalDTO.orgaoSuperiorDestinatario}</CampoDanfe>
          <CampoDanfe label="Codigo orgao superior">{notaFiscalDTO.codigoOrgaoSuperiorDestinatario}</CampoDanfe>
        </div>

        <div className="border-x border-t border-black bg-gray-100 px-1 py-0.5 text-center text-[9px] font-bold uppercase">
          Calculo do imposto
        </div>
        <div className="mb-1 grid grid-cols-5">
          <CampoDanfe label="Base de calculo ICMS">Nao informado</CampoDanfe>
          <CampoDanfe label="Valor do ICMS">Nao informado</CampoDanfe>
          <CampoDanfe label="Base de calculo ICMS ST">Nao informado</CampoDanfe>
          <CampoDanfe label="Valor do ICMS ST">Nao informado</CampoDanfe>
          <CampoDanfe label="Valor total da nota">
            <strong>R$ {notaFiscalDTO.valorNotaFiscal}</strong>
          </CampoDanfe>
        </div>

        <div className="border-x border-t border-black bg-gray-100 px-1 py-0.5 text-center text-[9px] font-bold uppercase">
          DADOS DOS PRODUTOS / SERVIÇOS
        </div>
        <table className="mb-1 w-full border-collapse border border-black text-left">
          <thead>
            <tr className="border-b border-black bg-gray-100 text-[8px] uppercase">
              <th className="border border-black p-1">Codigo</th>
              <th className="border border-black p-1">Descricao dos produtos / servicos</th>
              <th className="border border-black p-1">NCM/SH</th>
              <th className="border border-black p-1">CFOP</th>
              <th className="border border-black p-1">Unid.</th>
              <th className="border border-black p-1 text-right">Qtd.</th>
              <th className="border border-black p-1 text-right">Valor unit.</th>
              <th className="border border-black p-1 text-right">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {itensNotaFiscal.map((item) => (
              <tr key={item.numeroProduto} className="break-inside-avoid border-b border-black text-[9px]">
                <td className="border border-black p-1 text-center">{item.numeroProduto}</td>
                <td className="border border-black p-1">
                  <strong>{item.descricaoProdutoServico}</strong>
                </td>
                <td className="border border-black p-1 text-center">{item.codigoNcmSh}</td>
                <td className="border border-black p-1 text-center">{item.cfop}</td>
                <td className="border border-black p-1 text-center">{item.unidade}</td>
                <td className="border border-black p-1 text-right">{item.quantidade}</td>
                <td className="border border-black p-1 text-right">R$ {item.valorUnitario}</td>
                <td className="border border-black p-1 text-right">R$ {item.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-[1fr_1fr]">
          <div className="min-h-24 border border-black p-1">
            <div className="text-[8px] font-bold uppercase text-gray-700">Dados adicionais</div>
            <div className="mt-1 text-[10px] leading-tight">
              Evento mais recente: <strong>{notaFiscalDTO.tipoEventoMaisRecente || "Nao informado"}</strong>
              {notaFiscalDTO.dataTipoEventoMaisRecente ? ` (${notaFiscalDTO.dataTipoEventoMaisRecente})` : ""}
            </div>
            <div className="mt-1 text-[10px] leading-tight">
              Documento gerado a partir de consulta publica. Alguns campos fiscais do DANFE oficial dependem do XML autorizado da NF-e.
            </div>
          </div>
          <div className="min-h-24 border border-l-0 border-black p-1">
            <div className="text-[8px] font-bold uppercase text-gray-700">Reservado ao fisco</div>
          </div>
        </div>

        <div className="mt-2 border-t border-black pt-1 text-center text-[9px] leading-tight text-gray-700">
          Consulta NF-e - Dados obtidos no Portal da Transparencia do Governo Federal pela chave de acesso.
          Para realizar a consulta completa e oficial, acesse
          {" "}
          <span className="font-mono">
            https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&amp;tipoConteudo=7PhJ+gAVw2g=
          </span>
          {" "}
          e informe a chave de acesso no campo indicado.
        </div>
      </div>
    </div>
  );
}
