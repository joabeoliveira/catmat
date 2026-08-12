"use client";

import React from "react";
import type { NFeResposta } from "@/features/nfe/nfe.service";
import { Button } from "@/components/ui/button"; // Componente da UI já existente no projeto
import { Printer } from "lucide-react";

interface DanfeViewerProps {
  dados: NFeResposta;
}

export function DanfeViewer({ dados }: DanfeViewerProps) {
  const { notaFiscalDTO, itensNotaFiscal } = dados;

  return (
    <div className="danfe-print-root space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold">Nota Fiscal Eletrônica</h2>
        <Button onClick={() => window.print()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Imprimir / Baixar DANFE (PDF)
        </Button>
      </div>

      {/* DANFE Container */}
      <div className="danfe-document border border-black p-4 bg-white text-black text-xs font-sans print:border-none print:p-0">
        <div className="text-center font-bold text-sm bg-gray-100 border-b border-black py-1 mb-2">
          DANFE - Documento Auxiliar da Nota Fiscal Eletrônica
        </div>

        {/* Cabeçalho */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border border-black p-2 mb-2">
          <div>
            <span className="block font-bold text-[10px] text-gray-600">EMITENTE</span>
            <div className="font-bold text-sm">{notaFiscalDTO.nomeFornecedor}</div>
            <div>CNPJ: {notaFiscalDTO.cnpjFornecedor}</div>
            <div>Município: {notaFiscalDTO.municipioFornecedor}</div>
          </div>

          <div className="text-center border-y md:border-y-0 md:border-x border-black py-2 md:py-0">
            <span className="block font-bold text-[10px] text-gray-600">NF-e</span>
            <div className="font-bold text-lg">Nº {notaFiscalDTO.numero}</div>
            <div>SÉRIE: {notaFiscalDTO.serie}</div>
          </div>

          <div>
            <span className="block font-bold text-[10px] text-gray-600">CHAVE DE ACESSO</span>
            <div className="font-mono bg-gray-100 p-1 text-center font-bold text-[11px] break-all border border-gray-300">
              {notaFiscalDTO.chaveNotaFiscal}
            </div>
            <div className="mt-1 text-[10px]">
              Emissão: <strong>{notaFiscalDTO.dataEmissao}</strong>
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div className="border border-black p-2 mb-2">
          <span className="block font-bold text-[10px] text-gray-600">DESTINATÁRIO</span>
          <div>Órgão Superior: <strong>{notaFiscalDTO.orgaoSuperiorDestinatario}</strong></div>
          <div>Órgão Destinatário: <strong>{notaFiscalDTO.orgaoDestinatario}</strong></div>
        </div>

        {/* Tabela de Itens */}
        <div className="font-bold text-center bg-gray-100 border-x border-t border-black py-1">
          DADOS DOS PRODUTOS / SERVIÇOS
        </div>
        <table className="w-full border-collapse border border-black text-left mb-2">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-[10px]">
              <th className="border border-black p-1">ITEM</th>
              <th className="border border-black p-1">DESCRIÇÃO</th>
              <th className="border border-black p-1">NCM</th>
              <th className="border border-black p-1">CFOP</th>
              <th className="border border-black p-1">UNID</th>
              <th className="border border-black p-1 text-right">QTD</th>
              <th className="border border-black p-1 text-right">VALOR UNIT.</th>
              <th className="border border-black p-1 text-right">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {itensNotaFiscal.map((item) => (
              <tr key={item.numeroProduto} className="break-inside-avoid border-b border-black text-[11px]">
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

        {/* Rodapé e Totais */}
        <div className="flex justify-between items-center border border-black p-2 bg-gray-50">
          <div>
            <span className="block font-bold text-[10px]">EVENTO MAIS RECENTE</span>
            <span>{notaFiscalDTO.tipoEventoMaisRecente} ({notaFiscalDTO.dataTipoEventoMaisRecente})</span>
          </div>
          <div className="text-right">
            <span className="block font-bold text-[10px]">VALOR TOTAL DA NF-e</span>
            <span className="text-base font-bold">R$ {notaFiscalDTO.valorNotaFiscal}</span>
          </div>
        </div>

        <div className="mt-3 border-t border-black pt-2 text-center text-[10px] text-gray-700">
          Consulta NF-e - Dados obtidos no Portal da Transparência do Governo Federal pela chave de acesso.
        </div>
      </div>
    </div>
  );
}
