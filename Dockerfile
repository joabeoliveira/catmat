FROM node:22-slim AS deps
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --include=dev

FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garante a existencia das pastas exigidas pelo runner
RUN mkdir -p ./public ./dados

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Instala o Prisma CLI e Client (5.x) localmente para uso no runner
RUN npm install --no-save @prisma/client@5.22.0 prisma@5.22.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
RUN mkdir -p ./dados

# SDK do MinIO para os scripts de import (não entra no trace do standalone do Next)
RUN npm install --no-save @aws-sdk/client-s3@^3.600.0

RUN ./node_modules/.bin/prisma generate
RUN ./node_modules/.bin/prisma db push --skip-generate || echo "db push ignorado (sem banco)"
RUN if [ -f ./scripts/seed-from-csv.mjs ]; then node ./scripts/seed-from-csv.mjs || echo "seed opcional falhou"; fi

EXPOSE 3000
CMD ["node", "server.js"]