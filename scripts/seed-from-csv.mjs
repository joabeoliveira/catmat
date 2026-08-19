import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dadosDir = path.join(rootDir, 'dados');

const prisma = new PrismaClient();

const csvFiles = ['catmat.csv', 'catser.csv'];

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map((header) => header.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(';').map((value) => value.replace(/^"|"$/g, '').trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });

  return rows;
}

function toBool(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'sim' || normalized === 'yes';
}

function safeDate(value) {
  if (!value || (typeof value === 'string' && !value.trim())) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date();
  // PostgreSQL suporta anos entre 4713 AC e 294276 DC, mas valores absurdos no CSV indicam dado corrompido
  const year = d.getUTCFullYear();
  if (year < 1900 || year > 2200) return new Date();
  return d;
}

function safeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function importarCatmat(filePath) {
  const rows = parseCsv(filePath);
  if (!rows.length) {
    console.log(`ℹ️ Nenhuma linha encontrada em ${path.basename(filePath)}`);
    return 0;
  }

  const dados = rows
    .map((row) => ({
      codigoItem: safeInt(row.codigoItem),
      codigoGrupo: safeInt(row.codigoGrupo),
      nomeGrupo: (row.nomeGrupo || '').trim(),
      codigoClasse: safeInt(row.codigoClasse),
      nomeClasse: (row.nomeClasse || '').trim(),
      codigoPdm: safeInt(row.codigoPdm),
      nomePdm: (row.nomePdm || '').trim(),
      descricaoItem: (row.descricaoItem || '').trim(),
      codigoNcm: row.codigoNcm ? String(row.codigoNcm).trim() : null,
      aplicaMargemPreferencia: toBool(row.aplicaMargemPreferencia),
      dataHoraAtualizacao: safeDate(row.dataHoraAtualizacao),
    }))
    .filter((row) => row.codigoItem > 0);

  const batchSize = 1000;
  let total = 0;
  for (let i = 0; i < dados.length; i += batchSize) {
    const batch = dados.slice(i, i + batchSize);
    await prisma.catmatItem.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
  }

  console.log(`✅ Importados ${total} itens de ${path.basename(filePath)}`);
  return total;
}

async function importarCatser(filePath) {
  const rows = parseCsv(filePath);
  if (!rows.length) {
    console.log(`ℹ️ Nenhuma linha encontrada em ${path.basename(filePath)}`);
    return 0;
  }

  const dados = rows.map((row) => ({
    codigoItem: Number(row.codigoServico || row.codigoItem || 0),
    codigoGrupo: Number(row.codigoGrupo || 0),
    nomeGrupo: row.nomeGrupo || '',
    codigoClasse: String(row.codigoClasse || ''),
    nomeClasse: row.nomeClasse || '',
    codigoServico: Number(row.codigoServico || 0),
    nomeServico: row.nomeServico || row.descricaoItem || '',
    statusServico: toBool(row.statusServico),
  }));

  const batchSize = 1000;
  let total = 0;
  for (let i = 0; i < dados.length; i += batchSize) {
    const batch = dados.slice(i, i + batchSize);
    await prisma.catserItem.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
  }

  console.log(`✅ Importados ${total} itens de ${path.basename(filePath)}`);
  return total;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não está definida. Abortando seed.');
    process.exit(1);
  }

  console.log('🌱 Iniciando seed a partir dos CSVs em', dadosDir);

  let total = 0;
  for (const fileName of csvFiles) {
    const fullPath = path.join(dadosDir, fileName);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Arquivo não encontrado: ${fullPath}`);
      continue;
    }

    if (fileName === 'catmat.csv') {
      total += await importarCatmat(fullPath);
    } else if (fileName === 'catser.csv') {
      total += await importarCatser(fullPath);
    }
  }

  console.log(`🎉 Seed concluído (${total} registros processados).`);
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
