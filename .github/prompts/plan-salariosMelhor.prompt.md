# [PLANO DE ARQUITETURA E IMPLEMENTAÇÃO] - Enriquecimento de Pesquisas Salariais com Atividades do CBO

## 🎯 Contexto e Objetivo
Precisamos evoluir a funcionalidade de pesquisas salariais do sistema (já muito bem acolhida pelos usuários e crítica para retenção). 
O objetivo é **permitir que o usuário selecione e inclua as atividades oficiais do posto de trabalho (com base no CBO)** nos resultados da pesquisa e relatórios, gerando uma visão mais completa e robusta (ideal para ETPs, termos de referência e memoriais descritivos).

## 🛠️ Stack Tecnológica Envolvida
- **Backend/Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **ORM/Banco de Dados:** Prisma ORM, PostgreSQL (`evolution`)
- **Infraestrutura/Dados:** Arquivos CSV armazenados/baixados via MinIO (seguindo o padrão já utilizado nas demais cargas do projeto).

## 📊 Especificação dos Dados de Entrada
Os dados serão ingeridos a partir do arquivo CSV: `data/cbo_perfilocupacional.csv` que será disponibilizado no MinIO, conforme outras cargas realizadas no projeto.

### Estrutura do CSV:
- `COD_GRANDE_GRUPO`: Código do grande grupo ocupacional
- `COD_SUBGRUPO_PRINCIPAL`: Código do subgrupo principal
- `COD_SUBGRUPO`: Código do subgrupo
- `COD_FAMILIA`: Código da família ocupacional
- `COD_OCUPACAO`: Código da ocupação (Relaciona com o CBO da tabela principal)
- `SGL_GRANDE_AREA`: Sigla da grande área de atuação
- `NOME_GRANDE_AREA`: Nome da grande área de atuação
- `COD_ATIVIDADE`: Código da atividade
- `NOME_ATIVIDADE`: Descrição detalhada da atividade

---

## 📋 Tarefa para a IA
Como engenheiro de software sênior, elabore um **plano de execução passo a passo** detalhando:

1. **Modelagem de Dados (Prisma Schema):** Como estruturar a nova tabela ou relação (ex: `SalarioCboAtividade`) no `schema.prisma`, garantindo índices corretos de performance.
2. **Pipeline de Ingestão / Seed:** Como estruturar o script Node.js (seguindo o padrão atual do repositório na pasta `scripts/`) para ler o CSV `cbo_perfilocupacional.csv` (integrado ao MinIO se aplicável) e popular a base.
3. **Camada de API (Backend):** O desenho do endpoint em Next.js App Router para consultar as atividades por CBO/ocupação (`/api/salarios/[cbo]/atividades`).
4. **Experiência do Usuário (Frontend/UI):** Como adaptar a interface de pesquisa/detalhes de salários para permitir a seleção interativa das atividades (checkboxes/multiselect) e sua inclusão dinâmica na exportação ou visualização do posto.

Por favor, forneça o plano estruturado em fases claras e código limpo e idiomático para cada etapa.