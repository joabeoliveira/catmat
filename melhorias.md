# Implementar melhorias no projeto

## Introdução

- O objetivo deste documento é detalhar as melhorias que podem ser implementadas no projeto atual, visando aumentar a eficiência, a qualidade do código e a experiência do usuário.

## Site alvo

`catmat.com.br` - foi realizado um estudo detalhado do site para identificar pontos de melhoria.

Sugestões de melhorias pelo gemini:

Para melhorar a assertividade do seu MVP e resolver o problema de encontrar os nomes mais apropriados para o catálogo, precisamos olhar para as entranhas de como um portal como o [Busca CATMAT](https://catmat.com.br/) estrutura sua engenharia de dados.

O grande gargalo em sistemas de compras públicas não é a falta de dados, mas sim a **padronização e a recuperação da informação (Search & Retrieval)**, visto que as descrições nos editais muitas vezes divergem da taxonomia oficial.

Aqui está a dissecação de como esse sistema funciona e as diretrizes exatas que você deve passar para a sua LLM de desenvolvimento.

### 1. A Arquitetura de Dados (A Base do Sistema)

O site deixa claro que consome "exclusivamente dados abertos e oficiais do Compras.gov.br e do Portal Nacional de Contratações Públicas (PNCP)".

* **Ingestão e Normalização:** O sistema não faz requisições diretas à API do governo a cada busca do usuário (isso seria lento). Ele faz o download dos *datasets* em massa (ou via web scraping/APIs programadas) e consolida isso em um banco de dados próprio.
* **Taxonomia Rígida:** Eles utilizam os "Grupos e classes". Isso significa que cada item de banco de dados não é apenas uma string de texto, mas um objeto relacional atrelado a uma categoria pai (ex: Grupo 15 - Medicamentos). Isso reduz o escopo da busca e melhora a precisão.

### 2. O Motor de Busca (O Segredo da Assertividade)

A página menciona **"Busca com correção ortográfica e similaridade"** e **"tecnologia de busca de alta performance"**. É aqui que o seu MVP precisa mudar. Consultas tradicionais de banco de dados (`LIKE '%termo%'` no SQL) são péssimas para catálogos extensos.

O sistema utiliza um motor de busca dedicado (Search Engine) ou extensões avançadas de banco de dados que fazem três coisas:

* **Fuzzy Matching (Tolerância a Erros):** Se o usuário digita "adap", o sistema já sugere "adaptador de lápis". Ele perdoa erros de digitação e autocompleta.
* **Full-Text Search (FTS):** Ranqueamento de resultados baseado na relevância da palavra (algoritmos como BM25), ignorando preposições e pronomes (Stop words).
* **Busca Semântica (Similaridade):** Entende o contexto. Se buscar por "remédio para dor", o sistema entende a intenção e busca por "Dipirona" ou analgésicos associados, através de vetorização (Embeddings).

---

### Como Orientar sua LLM a Melhorar seu MVP

Para que sua LLM gere o código de uma arquitetura otimizada, escalável e com buscas ultrarrápidas (ideal para rodar em containers dentro de painéis de hospedagem como EasyPanel ou Coolify), use os seguintes direcionamentos no seu prompt mestre:

**Diretriz 1: Substituir a Busca Básica por um Motor de Alta Performance**

* **O que pedir:** Instrua a LLM a implementar a busca usando **Meilisearch** ou **Typesense** (que podem ser facilmente conteinerizados via Docker). Se preferir manter tudo no banco de dados, exija que ela configure o PostgreSQL usando as extensões `pg_trgm` (para fuzzy search) e `tsvector` (para Full-Text Search).

**Diretriz 2: Implementar Busca Semântica (Vector Search)**

* **O que pedir:** Peça para a LLM criar um fluxo onde a descrição de cada item do CATMAT seja convertida em um vetor (usando APIs como OpenAI Embeddings ou modelos open-source). Salve esses vetores em um banco de dados vetorial (como o Supabase com `pgvector`). Assim, quando a busca for feita, o sistema compara a intenção do usuário com os itens do catálogo, resolvendo o problema de "nomes não apropriados".

**Diretriz 3: Enriquecimento de Sinônimos**

* **O que pedir:** Oriente a LLM a criar um script (em Node.js ou Python) que rode de forma assíncrona para gerar "tags" e "sinônimos populares" para os itens mais complexos do CATMAT, salvando-os em uma coluna dedicada no banco de dados. O motor de busca deve priorizar essa coluna de sinônimos na hora do match.

**Diretriz 4: Sugestões e Autocomplete Dinâmico**

* **O que pedir:** Peça a construção de um endpoint de API ultrarrápido (com cache via Cloudflare ou Redis) focado apenas em devolver *Typeahead/Autocomplete*. O frontend (usando CDN, sem peso de servidor no cliente) deve bater nessa API a cada tecla digitada para guiar o usuário para o nome oficial correto antes mesmo de ele apertar "Enter".

Você prefere que a gente foque em estruturar o prompt para criar um motor de busca independente (como o Meilisearch) ou otimizar as consultas dentro do seu banco de dados atual?


## Sugestões de melhorias pelo ChatGPT:

Atualizando o plano de tarefas (todo list) para incluir passos detalhados e em seguida abro o site no DevTools integrado para coletar o snapshot da página inicial.

Iniciando: *Abrir https://catmat.com.br no MCP DevTools e capturar snapshot* (2/5)

Abrindo https://catmat.com.br no navegador integrado para coletar o DOM e metadados.

Aberto [Navegador](vscode-browser:/d2cd8f64-2ad4-4d0c-acd4-0c63dd4b1d58?vscodeLinkType=browser)

Vou ler o snapshot do navegador para extrair título, meta, imagens e elementos-chave. Em seguida faço uma primeira avaliação rápida de acessibilidade e performance.

Read [](file:///c%3A/Users/user/AppData/Roaming/Code/User/workspaceStorage/c7f52f2e91014f45085f093cc0801df7/GitHub.copilot-chat/chat-session-resources/2ef70cea-7296-4a54-87fa-9eb062a4f5f2/call_rKAwWip2rizs4jYsLONC5PMT__vscode-1785976197953/content.txt)

Agora vou ler os arquivos relevantes do seu projeto (`src/app/page.tsx`, componentes de UI e serviços) para mapear onde aplicar melhorias comparadas ao site referência.Vou listar o diretório `src` para confirmar a estrutura e localizar os arquivos corretos.

Read [](file:///e%3A/apps/catmat/src)

Vou listar o diretório apps para ver as pastas disponíveis.

Read [](file:///e%3A/apps)

Read [](file:///e%3A/apps/catmat)

Read [](file:///e%3A/apps/catmat/appscatmat)

Read [](file:///e%3A/apps/catmat/appscatmat/src/app)

Read [](file:///e%3A/apps/catmat/appscatmat/src/app/page.tsx)

Read [](file:///e%3A/apps/catmat/appscatmat/src/components/shared/BuscaAvancada.tsx)

Read [](file:///e%3A/apps/catmat/appscatmat/src/hooks/useBuscaItens.ts)

Read [](file:///e%3A/apps/catmat/appscatmat/src/app/api/catmat/buscar/route.ts)

Read [](file:///e%3A/apps/catmat/appscatmat/src/features/catmar/catmat.service.ts)

Read [](file:///e%3A/apps/catmat/appscatmat/src/features/catmar/catmat.service.ts)

Vou atualizar a lista de tarefas com progresso e então ler `layout.tsx` para mapear onde inserir meta tags e melhorias de SEO.

Iniciando: *Rodar auditoria de acessibilidade e performance* (3/5)

Read [](file:///e%3A/apps/catmat/appscatmat/src/app/layout.tsx)

Capturei o snapshot de https://catmat.com.br e analisei o código do seu projeto — abaixo um plano prioritário de melhorias com apontamento direto para os arquivos do repositório.

**Resumo Rápido**
- Status: snapshot da referência coletado; leitura do código principal concluída.
- Objetivo: deixar seu projeto igual ou melhor que o site referência em UX, acessibilidade, SEO e performance.

**Melhorias Prioritárias**
- **SEO & Meta:** adicionar Open Graph, meta description, canonical e tags de compartilhamento (Twitter). (impacto alto)
- **Hero / Copy / CTA:** alinhar título, subtítulo e CTA para clareza e conversão. (impacto alto)
- **Acessibilidade:** garantir `aria-label` em campo de busca, botões com nomes acessíveis, `role`/landmarks, foco visível e `aria-live` em carregamento. (impacto alto)
- **Performance:** otimizar imagens (usar `next/image`), lazy-load, preload/preconnect para CDNs/fonts, cache de API (revalidate). (impacto alto)
- **Busca / UX:** melhorar feedback de carregamento (skeleton → aria-live), ordenação/quantidade por página, sugestões automáticas e histórico. (impacto médio)
- **API / Backend:** validação robusta de input, limites/padrões de paginação, caching server-side e tratamento de erros. (impacto médio)
- **Dados estruturados:** JSON‑LD para Organization + SearchAction (ajuda SEO e rich results). (impacto médio)
- **Observability:** adicionar logs/telemetria e monitor de erros nas rotas API. (impacto baixo)

**Arquivos alvo (ações concretas)**
- **Meta / layout:** src/app/layout.tsx — adicionar OG tags, favicons, preconnect e JSON‑LD.
- **Página inicial / hero:** src/app/page.tsx — ajustar copy, CTAs e marcação semântica (header/main).
- **Componente de busca:** src/components/shared/BuscaAvancada.tsx — adicionar `aria-label` no input, atributos em botões, `aria-live` para estado de carregamento, melhorar markup do form.
- **Hook de busca:** src/hooks/useBuscaItens.ts — adicionar timeouts, retries, e cache/rehydration opcional.
- **API route:** src/app/api/catmat/buscar/route.ts — validar payload, normalizar pagina/limite, responder com cabeçalhos de cache.
- **Serviço de domínio:** src/features/catmar/catmat.service.ts — revisar paginação, índices e otimizar consultas; fallback mock permanece.
- **Estilos & contraste:** src/styles/globals.css — checar contraste, foco e tokens de cor reutilizáveis.
- **Imagens e ícones:** revisar onde imagens são usadas no projeto e migrar para `next/image` quando aplicável.

**Exemplos rápidos de mudanças sugeridas**
- Em src/app/layout.tsx: adicionar `metadata` Open Graph e `<link rel="preconnect">` para fontes/CDN.
- Em src/components/shared/BuscaAvancada.tsx: tornar o input `<Input aria-label="Campo de busca CATMAT" />`, adicionar `aria-live="polite"` a um elemento que mostra "Buscando..." e garantir `type="submit"` no botão principal (já tem, ok).
- Em src/hooks/useBuscaItens.ts: adicionar um cache simples com revalidate e timeout nos fetches.

**Próximos passos (o que você quer que eu faça agora?)**
- Opção A: eu implemento as mudanças de **SEO/meta + acessibilidade mínima + input aria-label** (pequena PR).  
- Opção B: eu rodo auditoria automática (Lighthouse / acessibilidade) no snapshot e entrego relatório detalhado (LCP, FID, CLS, a11y).  
- Opção C: eu aplico a lista completa de melhorias prioritárias (mais trabalho; faço em etapas).

Diga qual opção prefere e se aprova que eu comece aplicando as mudanças no código (A/B/C).

## Sugestão de melhorias pelo Fable 5

> Análise feita em 05/08/2026 navegando no site real (catmat.com.br, incluindo teste de busca por "dipirona 500mg") e lendo o código atual do projeto (`appscatmat/`). As sugestões abaixo apontam arquivos reais e estão ordenadas por impacto.
>
> **Plano de execução detalhado (para o agente executor): [`PLANO-EXECUCAO.md`](PLANO-EXECUCAO.md)** — contém tarefas por arquivo, SQL de referência, critérios de aceitação por fase e registro de desvios para auditoria posterior.

### O que o catmat.com.br faz que nós ainda não fazemos

Observado ao vivo no site de referência:

1. **Busca via URL (`/?q=dipirona+500mg`)** — resultado compartilhável, indexável pelo Google, com título dinâmico (`Resultados para "dipirona 500mg"`). Nosso projeto usa `POST /api/catmat/buscar` com estado só no cliente: nada é compartilhável nem indexável.
2. **Score de compatibilidade por resultado (100%, 97%, 82%...)** com facetas por faixa: "Resultado exato (3)", "Alta similaridade (7)", "Mais similares (90)". Isso dá confiança ao usuário — ele sabe *por que* o item apareceu.
3. **Página de detalhe por item** (`/material/{codigo}`) — cada um dos 160k+ itens é uma página SEO. É provavelmente a maior fonte de tráfego orgânico deles.
4. **Autocomplete na home** com sugestões populares e correção de digitação ("adap" → "adaptador de lápis").
5. **Utilidades de fluxo**: botão "Copiar CATMAT", favoritos (localStorage), ordenação (compatibilidade/código), "Ver mais resultados", toggle claro/escuro.
6. **SEO forte**: páginas de conteúdo (`/o-que-e-catmat`, `/grupos`, `/sobre`), navegação por grupos/classes, título e meta dinâmicos, prova social (162.919 itens, 2.700+ órgãos).
7. **API pública documentada** (`/api-docs`) e exportação de planilhas — funcionam como aquisição de usuários.

### Onde nosso código está mais fraco (problemas concretos)

- **`catmat.service.ts` (buscarItens)**: o ranqueamento em memória pega no máximo `max(200, limite*10)` candidatos ordenados por `codigoPdm asc` — ou seja, para termos com milhares de matches, os candidatos ranqueados são um subconjunto **arbitrário** (os menores códigos PDM), não os mais relevantes. O `total` reportado também diverge do que é ranqueado. Isso é um bug de relevância, não só de performance.
- **Busca por `contains` (ILIKE `%termo%`)**: sem tolerância a erro de digitação, sem acento-insensibilidade (usuário digita "lampada", banco tem "lâmpada" → zero resultados), sem ranking BM25.
- **`route.ts`**: não valida o payload (o projeto já tem `zod` instalado e não usa aqui), não limita `limite` (um `limite: 100000` derruba o servidor), sem cache headers.
- **`useBuscaItens.ts`**: fetch sem debounce, sem `AbortController` (respostas fora de ordem podem sobrescrever a busca atual), sem tratamento de erro visível ao usuário.
- **`BuscaAvancada.tsx`**: filtros de Grupo/Classe **hardcoded** (só 70/93 e 7010/9310); input sem `aria-label`; busca inicial fixa "papel"; export CSV exporta preço `0` (não integra com `/api/catmat/precos`); grade em `sessionStorage` (perde ao fechar aba — referência usa favoritos persistentes).
- **`layout.tsx`**: metadata mínima — sem Open Graph, sem canonical, sem JSON-LD, sem `sitemap.ts`/`robots.ts`.

### Plano priorizado

#### Fase 1 — Motor de busca de verdade (maior impacto, é o coração do produto)

Já usamos PostgreSQL, então o caminho certo é a Diretriz 1 do Gemini na variante "dentro do banco" — sem novo container:

1. Migration habilitando `unaccent` + `pg_trgm` e adicionando coluna gerada `tsv tsvector` (com dicionário `portuguese`) sobre `descricaoItem || nomePdm || nomeClasse || nomeGrupo`, com índice GIN; índice GIN `gin_trgm_ops` sobre `descricaoItem` e `nomePdm`.
2. Reescrever `buscarItens` com `prisma.$queryRaw`: `ts_rank_cd` (full-text, peso maior para `nomePdm`) combinado com `similarity()` (fuzzy/typo), tudo `unaccent`ado. Ranking, paginação e `total` calculados **no banco** — elimina o bug do subconjunto de 200.
3. Expor o score normalizado (0–100%) no resultado e classificar em faixas ("exato" / "alta similaridade" / "similar") — igualamos o diferencial visível da referência.
4. Facetas reais: `filtrosSugeridos` com `GROUP BY` + contagem (grupo/classe/PDM), substituindo os selects hardcoded do `BuscaAvancada.tsx` por filtros dinâmicos com contadores.

#### Fase 2 — Busca na URL + página de detalhe (SEO e compartilhamento)

1. Migrar a busca para `GET /?q=termo&grupo=&classe=&pagina=` (server component lendo `searchParams`, com `generateMetadata` dinâmico). Manter o endpoint JSON como `GET /api/catmat/buscar?q=` com `Cache-Control: s-maxage` — busca é idempotente, POST impede cache.
2. Criar `/material/[codigo]/page.tsx`: descrição completa, hierarquia grupo→classe→PDM, NCM, margem de preferência, botão copiar código, itens do mesmo PDM, e estatísticas de preço (média/mediana/menor/maior) vindas de `CompraItem` — aqui já ficamos **melhores** que a referência, que separa preço da consulta.
3. `sitemap.ts` (home, grupos, classes e itens mais buscados), `robots.ts`, Open Graph/canonical no `layout.tsx`, JSON-LD (`WebSite` + `SearchAction`, e `Product`-like no detalhe).

#### Fase 3 — Autocomplete e UX de busca

1. Endpoint `GET /api/catmat/sugestoes?q=` ultra-leve (só `nomePdm` distinto + trigram, `LIMIT 8`, cache agressivo) + combobox acessível no input com debounce de ~150ms e `AbortController` no `useBuscaItens.ts`.
2. "Você quis dizer…?" quando zero resultados (melhor sugestão por `similarity`), estados de erro visíveis e `aria-live` no carregamento.
3. Correções rápidas no `BuscaAvancada.tsx`: `aria-label` no input, remover termo inicial fixo "papel", botão copiar código em cada card, ordenação (relevância/código).

#### Fase 4 — Onde superamos a referência (nosso diferencial: a grade)

A referência é só consulta; nosso produto monta **grade de cotação com preços** — é isso que devemos afiar em vez de copiá-los:

1. Integrar a grade com `/api/catmat/precos`: ao adicionar item, buscar automaticamente média/mediana/menor/maior de `CompraItem`, com corte de outliers (IQR) — o "espurgo" já prometido na UI vira funcionalidade real.
2. Export CSV/XLSX com preços reais por critério escolhido (hoje exporta `0`), incluindo fonte e período das compras usadas no cálculo — vira documento defensável de pesquisa de preços (exigência da Lei 14.133/2021, IN 65/2021).
3. Persistir a grade em `localStorage` (não `sessionStorage`) e permitir múltiplas grades nomeadas.
4. (Fase posterior) Busca semântica com `pgvector` sobre `nomePdm`/descrição — resolve "remédio para dor" → dipirona. Fazer **depois** do FTS+trigram, que já resolve 90% dos casos com custo quase zero.

#### Fase 5 — Robustez do backend

1. `route.ts`: validar com `zod` (`limite` máx. 100, `pagina` ≥ 1, `termo` máx. 200 chars), respostas de erro estruturadas.
2. Cache: `s-maxage=3600, stale-while-revalidate` nas buscas GET; a tabela `BuscaCache` do schema pode ser aposentada em favor de cache HTTP/CDN (mais simples e já resolve).
3. Rate limiting básico no endpoint público e logs estruturados de termos buscados (insumo para sinônimos e "sugestões populares", como a referência exibe).

### O que eu NÃO faria agora

- **Meilisearch/Typesense**: adiciona um container, sincronização de índice e ponto de falha. Postgres com `pg_trgm` + `tsvector` entrega o mesmo nível da referência para 160k linhas (a própria referência aparenta usar exatamente essa abordagem, dado o comportamento de "similaridade" observado).
- **Embeddings/pgvector já**: custo e complexidade altos antes de esgotar FTS + sinônimos (Diretrizes 2/3 do Gemini valem, mas como fase posterior).
- **Copiar o site institucional inteiro** (blog, páginas "quem somos" etc.) antes do motor de busca estar à altura — conteúdo sem busca boa não retém ninguém.

### Ordem sugerida de execução

| Etapa | Entrega | Esforço | Impacto |
| --- | --- | --- | --- |
| 1 | FTS + trigram no Postgres, ranking no banco, score % | médio | altíssimo |
| 2 | Busca via URL (GET) + metadata dinâmica | baixo | alto |
| 3 | Página `/material/[codigo]` com preços | médio | alto |
| 4 | Autocomplete + facetas dinâmicas | médio | alto |
| 5 | Grade com preços reais + export defensável | médio | diferencial |
| 6 | SEO técnico (sitemap, JSON-LD, OG) | baixo | médio |
| 7 | Validação zod, cache, rate limit | baixo | médio |




