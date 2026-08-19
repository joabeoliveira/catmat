#!/bin/bash
echo "🚀 Iniciando setup do projeto padrão ouro..."

# 1. Instala dependências usando o pnpm de forma limpa
echo "📦 Instalando dependências..."
pnpm install

# 2. Copia o arquivo de ambiente se não existir
if [ ! -f .env ]; then
  echo "📄 Criando arquivo .env a partir do template..."
  cp .env.example .env
fi

# 3. Sobe os containers do Docker (PostgreSQL/Redis)
echo "🐳 Iniciando banco de dados no Docker..."
docker-compose up -d

# 4. Roda as migrações e gera o client do Prisma
echo "🗄️ Configurando o banco de dados com Prisma..."
pnpm prisma migrate dev
pnpm prisma generate

echo "✅ Tudo pronto! Execute 'pnpm dev' para iniciar o servidor."