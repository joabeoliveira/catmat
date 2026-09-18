# Perguntas para destravar o Codex/Copilot e eu entender o projeto real

Responda o que souber; onde não souber, diga "não sei" — isso também é informação útil.

---

## Bloco 1 — Estrutura atual do repositório

1. Qual o nome/escopo do repositório? É monorepo, app único, ou tem pacotes separados?
2. O `src/` segue exatamente `src/features/<modulo>`? Quais módulos já existem?
3. Existe algum módulo que já lida com **dados governamentais** (PNCP, CNPJ)? Onde ele fica? Como está organizado (service, client, parser, types)?
4. Existe um padrão de **repository** ou o Prisma é chamado direto nos services/rotas?
5. Existe pasta `src/lib/` com clientes compartilhados (prisma, redis, fetch wrapper)? O que tem lá hoje?
6. Como estão organizadas as **API Routes**? Todas em `src/app/api/<dominio>/route.ts`? Existe algum helper para padronizar resposta/erro?
7. Existe algum **middleware.ts** global? O que ele faz (auth, log, CORS)?
8. Existe algum **instrumentation.ts** (hook de boot do Next 14)? Se não, topa criar?

**Por que importa:** o Codex vai propor código novo; se ele seguir o padrão existente (ex.: `features/pncp/services/...`), a integração fica natural. Se não houver padrão, precisamos definir um antes.

---

## Bloco 2 — Prisma e banco

9. Onde está o `schema.prisma`? Quantos models já existem? Algum deles é de "dados externos/sincronizados"?
10. Já existe algum model com **enum** ou **Decimal**? Como vocês lidam com Decimal no frontend (serialização)?
11. Como vocês fazem migrations em produção? `prisma migrate deploy` no deploy do Easypanel?
12. Existe **seed** (`prisma/seed.ts`)? O que ele popula?
13. Vocês usam **Prisma Client Extensions** ou middleware (ex.: soft delete, auditoria)?
14. Existe alguma tabela de **log de sincronização** ou **controle de jobs** em outro módulo que eu possa reaproveitar?
15. O `buscaText`/`tsvector`/`trigram`/`unaccent` — já está em algum model? Como vocês geram o `tsvector` (coluna gerada, trigger, ou aplicação)?

**Por que importa:** reaproveitar padrões de sync/log/auditoria evita criar tabelas paralelas. E o `tsvector` precisa de migration específica (`CREATE EXTENSION`, índice GIN, coluna gerada).

---

## Bloco 3 — MinIO e storage

16. O MinIO está no mesmo `docker-compose.yml` ou em compose separado?
17. Já existe algum código TS que fala com MinIO (SDK `minio`, `@aws-sdk/client-s3`, ou outro)? Onde?
18. Existe bucket já criado? Padrão de nomes (ex.: `empresa-<dominio>-<ambiente>`)?
19. Vocês usam **URLs pré-assinadas** para o frontend acessar objetos, ou o backend faz proxy?
20. Existe política de lifecycle/backup configurada hoje?
21. As credenciais vêm de `.env` / Easypanel env vars? Existe um padrão de leitura (ex.: `env.ts` com Zod)?

**Por que importa:** se já há um cliente MinIO padronizado, o Codex deve reusar; se não, criamos `src/lib/minio.ts` seguindo o padrão dos outros clientes.

---

## Bloco 4 — Redis

22. Redis está no compose? Qual imagem/versão?
23. Já existe código usando Redis (cache, rate limit, lock)? Qual lib (`ioredis`, `redis`, `@upstash/redis`)?
24. Existe padrão de chave (ex.: `app:<dominio>:<entidade>:<id>`)?
25. Se não há uso ainda, topa introduzir agora só para este módulo ou prefere manter opcional?

**Por que importa:** se Redis é opcional hoje, o módulo ANP deve funcionar **sem** ele (degradação graciosa). Se já há uso, seguimos o padrão.

---

## Bloco 5 — Padrões de código e convenções

26. Existe **ESLint + Prettier** configurados? Regras específicas (ex.: `no-console`, ordenação de imports)?
27. Usam **TypeScript strict**? `noUncheckedIndexedAccess`? `exactOptionalPropertyTypes`?
28. Existe padrão de **nomenclatura** (camelCase, PascalCase, kebab-case para arquivos)?
29. Como vocês tratam **erros** em API Routes? Existe classe `AppError` ou similar?
30. Existe padrão de **validação de entrada** com Zod em rotas? Onde ficam os schemas (junto da rota, em `features/<modulo>/schemas`)?
31. Usam **Server Actions** em algum lugar, ou tudo via API Route?
32. Existe padrão de **testes**? Vitest, Jest, Playwright? Onde ficam? Existe cobertura mínima?

**Por que importa:** o Codex gera código que precisa passar no lint e seguir o estilo. Se você colar essas respostas no chat do Copilot, ele já calibra a geração.

---

## Bloco 6 — Frontend e UI

33. O layout base do dashboard já existe? Onde (`src/app/(dashboard)/layout.tsx`)?
34. Existe padrão de **página de listagem com filtros**? Algum módulo que já faça isso (ex.: PNCP) que eu possa espelhar?
35. Usam **TanStack Query** ou só Server Components + `fetch`?
36. Usam **TanStack Table** ou tabelas shadcn puras?
37. Existe biblioteca de gráficos já instalada (Recharts, Tremor, Chart.js)?
38. Existe padrão de **loading/error** no App Router (`loading.tsx`, `error.tsx`)?
39. Existe component de **status badge** ou **semana** reutilizável?

**Por que importa:** a UI do módulo ANP deve parecer parte do sistema, não um enxerto. Espelhar um módulo existente (PNCP?) acelera muito.

---

## Bloco 7 — Deploy e operação

40. O deploy no Easypanel é via **build da imagem Docker** ou via **Nixpacks/Heroku buildpack**?
41. Existe **cron nativo** no Easypanel configurado para outros jobs? Como está configurado?
42. Existe **healthcheck** da aplicação (`/api/health`)? O que ele verifica?
43. Existe padrão de **log estruturado** (pino, winston) ou é `console.log`?
44. Existem **variáveis de ambiente** padronizadas em um `env.ts` com Zod? Onde?
45. Existe algum **painel admin** interno para disparar jobs manualmente?

**Por que importa:** o cron do Easypanel precisa de um endpoint público/autenticado; o healthcheck deve incluir MinIO/Postgres; logs estruturados ajudam a debugar sync.

---

## Bloco 8 — Contexto de negócio e escopo do módulo ANP

46. Quem vai **consumir** esses preços? É dashboard interno, API para clientes, relatório?
47. Precisa de **histórico completo** ou só a semana atual?
48. Precisa de **comparação entre semanas** (variação %)?
49. Precisa de **comparação entre localidades** (ex.: SP vs RJ)?
50. Precisa de **exportação** (CSV, PDF)?
51. Existe **regra de negócio** sobre quais produtos importam (ex.: só gasolina e diesel)?
52. Precisa de **alertas** quando preço variar acima de X%?
53. O módulo é **público** ou restrito a usuários autenticados?
54. Existe **multi-tenant** no sistema? Se sim, os preços ANP são compartilhados entre tenants ou por tenant?

**Por que importa:** isso define se o modelo precisa de `tenantId`, se a API precisa de paginação agressiva, se precisa de materialized views, etc.

---

## Bloco 9 — Perguntas específicas para o Codex/Copilot

Se você colar isto no chat do Copilot junto com o repositório aberto, ele ganha contexto:

55. "Liste todos os models do Prisma e seus relacionamentos."
56. "Mostre um exemplo de API Route deste projeto que valida entrada com Zod e trata erro."
57. "Mostre um exemplo de service em `src/features/` que chama Prisma e é testável."
58. "Mostre o padrão de cliente externo (fetch) usado no módulo PNCP."
59. "Mostre como o projeto lê variáveis de ambiente (existe `env.ts`?)."
60. "Mostre um exemplo de componente de tabela com filtros no frontend."
61. "Existe algum cliente MinIO já configurado? Se sim, mostre a interface."
62. "Existe algum uso de Redis? Se sim, mostre o padrão."
63. "Qual o padrão de nome de arquivo e pasta em `src/features/`?"
64. "Quais bibliotecas já estão no `package.json` relacionadas a: filas, cron, storage, validação, datas?"

**Dica prática:** no Copilot Chat do VS Code, use `@workspace` + perguntas como as acima. Ele varre o repositório e responde com base no código real — muito melhor que descrever manualmente.

---

## Bloco 10 — O que eu preciso que você me traga de volta

Para eu refinar o plano com precisão, me mande (mesmo que parcialmente):

1. **Árvore de diretórios** de `src/` (2–3 níveis) — pode ser `tree -L 3 src` ou print.
2. **`schema.prisma`** (ou pelo menos os models que você acha que podem se relacionar com ANP).
3. **`package.json`** (dependencies e scripts).
4. **`docker-compose.yml`** (ou o trecho com app/db/redis/minio).
5. **Um exemplo** de API Route existente (de preferência do módulo PNCP).
6. **Um exemplo** de service existente em `src/features/`.
7. **`middleware.ts`** e **`instrumentation.ts`** (se existirem).
8. **`.env.example`** ou lista de variáveis usadas (sem valores sensíveis).
9. **`prisma/migrations/`** — só os nomes das pastas, para eu ver a evolução.
10. Se houver, o **`README.md`** com convenções do projeto.

---
