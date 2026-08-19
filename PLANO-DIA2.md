# Plano — Dia 2 (09/08/2026)

> Meta: superar o catmat.com.br em funcionalidade, com foco no problema central do comprador público — **encontrar o código certo do que precisa comprar** — e transformar a grade numa ferramenta de cotação profissional e defensável (Lei 14.133/2021 / IN 65/2021).
>
> Execução: Claude implementa direto (código → build → teste visual → push → usuário clica Deploy → validação em produção). Uma fase por deploy, na ordem abaixo.

## Fase A — Grade profissional (PRIMEIRO, pedido do usuário)

A grade persiste no navegador (correto), mas falta controle sobre esse ciclo de vida:

- [ ] **A1. Limpar grade** — botão com confirmação em dois cliques ("Limpar grade" → "Confirmar?"), esvazia a grade ativa para iniciar outra cotação sem excluí-la.
- [ ] **A2. Ciclo de vida visível** — cada grade guarda `criadaEm`/`atualizadaEm`; ao reabrir o navegador com itens antigos, o painel mostra "Grade 'principal' · N itens · iniciada em DD/MM" para o usuário decidir se continua ou limpa. Migração automática do formato antigo do localStorage.
- [ ] **A3. Quantidade por item + total da cotação** — campo de quantidade em cada linha (cotação real tem quantidade); total da linha (qtd × preço do critério) e **valor total estimado da grade** no resumo — o número que vai para o ETP/termo de referência.
- [ ] **A4. Export profissional** — CSV ganha colunas `quantidade` e `valorTotalItem`; nome do arquivo com grade e data (`grade-principal-2026-08-09.csv`).

**Aceitação:** fechar e reabrir o navegador mantém a grade com aviso de quando foi iniciada; "Limpar" zera só a grade ativa; total da cotação soma qtd × preço; CSV abre no Excel com os novos campos.

## Fase B — Tema claro/escuro (paridade final com a referência)

- [ ] Tokens de cor via classes `dark:` do Tailwind (`darkMode: 'class'`) em todos os componentes; toggle no header com persistência em localStorage + respeito ao `prefers-color-scheme`; sem flash de tema errado (script inline no `<head>`).

**Aceitação:** alternar tema em qualquer página aplica em todas; preferência sobrevive ao reload; contraste legível nos dois temas (busca, detalhe, gráfico, grade).

## Fase C — Encontrar o código certo (o diferencial de produto)

- [ ] **C1. Sugestões populares na home** — chips clicáveis abaixo da busca com termos frequentes (curadoria inicial: caneta, papel A4, dipirona, notebook, gasolina, etc.), como a referência faz.
- [ ] **C2. "Ver mais similares"** — quando o FTS encontra resultados, botão ao fim da lista que expande com a busca trigram (hoje ela só roda com zero resultados) — cobre termos genéricos sem custo na busca padrão.
- [ ] **C3. Agrupamento por PDM nos resultados** — "Este padrão tem N variações" com link para ver todas (`/?pdm=X`); ajuda a navegar do genérico ("dipirona") ao específico (a dosagem/forma certa).
- [ ] **C4. Sinônimos populares → termo oficial** — dicionário curado inicial (remédio→medicamento, carro→veículo, computador→microcomputador…) aplicado quando a busca zera; registrado nos logs para crescer com uso real.

**Aceitação:** buscar "remédio para dor" leva a um caminho até dipirona/analgésicos em ≤ 2 cliques; termos genéricos oferecem expansão em vez de lista vazia.

## Fase D — Espurgo selecionável (completa a Skill 5)

- [ ] Método de corte de outliers selecionável na grade e no detalhe: IQR (padrão), desvio padrão (limiar 2) ou percentil (5–95); endpoint aceita `metodo` e `limiar`; UI mostra quantos foram cortados por cada método.

## Fase E — Infra e higiene (encaixar entre deploys)

- [ ] `ALTER DATABASE evolution REFRESH COLLATION VERSION;` + `REINDEX DATABASE evolution;` no terminal do Postgres (usuário executa, horário de baixo uso).
- [ ] Logs de busca sem resultado → lista dos termos que zeram (insumo para C4).
- [ ] (Futuro) database próprio para o CATMAT, separado da Evolution API.

## Registro de progresso

- (preencher conforme as fases fecham)
