CREATE TABLE IF NOT EXISTS "arp_atas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "numero_controle_pncp_ata" TEXT NOT NULL UNIQUE,
  "numero_controle_pncp_compra" TEXT,
  "numero_ata_registro_preco" TEXT NOT NULL,
  "codigo_unidade_gerenciadora" TEXT NOT NULL,
  "nomeUnidadeGerenciadora" TEXT,
  "codigo_orgao" INTEGER,
  "nomeOrgao" TEXT,
  "link_ata_pncp" TEXT,
  "link_compra_pncp" TEXT,
  "numero_compra" TEXT,
  "ano_compra" TEXT,
  "codigo_modalidade_compra" TEXT,
  "nome_modalidade_compra" TEXT,
  "data_assinatura" DATE,
  "data_vigencia_inicial" DATE,
  "data_vigencia_final" DATE,
  "valor_total" DOUBLE PRECISION,
  "status_ata" TEXT,
  "objeto" TEXT,
  "quantidade_itens" INTEGER,
  "data_hora_atualizacao" TIMESTAMP(3),
  "data_hora_inclusao" TIMESTAMP(3),
  "data_hora_exclusao" TIMESTAMP(3),
  "ata_excluido" BOOLEAN NOT NULL DEFAULT false,
  "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "arp_atas_vigencia_idx" ON "arp_atas" ("data_vigencia_final");
CREATE INDEX IF NOT EXISTS "arp_atas_uasg_idx" ON "arp_atas" ("codigo_unidade_gerenciadora");

CREATE TABLE IF NOT EXISTS "arp_itens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ata_id" TEXT NOT NULL REFERENCES "arp_atas"("id") ON DELETE CASCADE,
  "numero_controle_pncp_ata" TEXT NOT NULL,
  "numero_item" TEXT NOT NULL,
  "codigo_item" INTEGER,
  "descricao_item" TEXT,
  "descricao_detalhada" TEXT,
  "tipo_item" TEXT,
  "numero_compra" TEXT,
  "ano_compra" TEXT,
  "data_assinatura" DATE,
  "data_vigencia_inicial" DATE,
  "data_vigencia_final" DATE,
  "ni_fornecedor" TEXT,
  "nome_razao_social_fornecedor" TEXT,
  "quantidade_homologada_vencedor" DOUBLE PRECISION,
  "quantidade_homologada_item" DOUBLE PRECISION,
  "quantidade_registrada" DOUBLE PRECISION,
  "unidade_medida" TEXT,
  "valor_unitario" DOUBLE PRECISION,
  "valor_total" DOUBLE PRECISION,
  "maximo_adesao" DOUBLE PRECISION,
  "numero_controle_pncp_compra" TEXT,
  "id_compra" TEXT,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "arp_itens_ata_item_key" UNIQUE ("numero_controle_pncp_ata", "numero_item")
);
CREATE INDEX IF NOT EXISTS "arp_itens_codigo_item_idx" ON "arp_itens" ("codigo_item");
CREATE INDEX IF NOT EXISTS "arp_itens_vigencia_idx" ON "arp_itens" ("data_vigencia_final");
CREATE INDEX IF NOT EXISTS "arp_itens_descricao_idx" ON "arp_itens" ("descricao_item");
