# AI Context & Project Boilerplate Guidelines

## Reference: Conversation on Architecture, Scalability, and Vibe Coding (Stack: Next.js + TypeScript + Tailwind CSS)

Esse documento serve como contexto mestre (`AI_CONTEXT.md`) para orientar Modelos de Linguagem (LLMs) na inicialização, expansão e manutenção de novos projetos de software, garantindo um desenvolvimento escalável, profissional e de alta performance no modelo de **Vibe Coding**.

---

## 1. A Stack Padrão Ouro (The Tech Stack)

Ao iniciar qualquer projeto a partir deste repositório base, a LLM deve obrigatoriamente respeitar e utilizar a seguinte infraestrutura:

* **Framework:** **Next.js** (App Router). Escolhido pela capacidade Fullstack nativa (Frontend + API Routes), renderização otimizada (SSR/SSG), roteamento intuitivo baseado em arquivos e infraestrutura resiliente.
* **Linguagem:** **TypeScript**. Obrigatório para a definição de tipos estáticos e contratos rígidos. Reduz bugs humanos e serve como "âncora de realidade" para a própria IA, evitando alucinações de código.
* **Estilização:** **Tailwind CSS**. Classes utilitárias direto no JSX/TSX. Garante velocidade máxima de estilização, elimina a necessidade de múltiplos arquivos CSS e facilita a geração de componentes visuais coesos por parte da IA.
* **Ferramentas de IA e Ecossistema:** Priorizar o uso de ecossistemas integrados modernos (como o **Vercel AI SDK**) para recursos de inteligência artificial na interface, como editores de texto ricos (Tiptap/Lexical) com streaming de dados em tempo real, caso seja necessário do projeto.

* mais detalhes no arquivo `stack.md` que contém a stack padrão ouro completa, incluindo banco de dados, ORM, controle de versão, hospedagem, CI/CD e monitoramento.

---

## 2. Diretrizes de Arquitetura e Escalabilidade Seguro (Anti-Quebra)

Para evitar que o projeto se perca, caso cresça, ou misture contextos, a estrutura deve seguir rigidamente os seguintes pilares de isolamento:

### A. Princípio dos Contratos Rígidos (TypeScript First)

* **Regra:** Antes de escrever qualquer lógica de componente, tela ou API para um novo recurso, primeiro deve ser  definido e estruturado os tipos em arquivos isolados (ex: `features/modulo.types.ts`).
* **Objetivo:** Criar barreiras matemáticas e estruturais que a IA (vibe coding) é obrigada a respeitar nos passos seguintes.

### B. Isolamento de Rotas e Módulos (Next.js App Router)

* **Regra:** Novas funcionalidades complexas ou novos módulos solicitados por clientes (ex: incluir um Plano de Contratação Anual (PAC) em um sistema de cotações já existente) devem ser criados em diretórios de rotas totalmente novos e independentes.
* *Estrutura de Exemplo:*

    ** `src/app/cotacoes/` -> Legado/Recurso Existente (Intocado e Protegido)

    ** `src/app/pac/` -> Novo Módulo (Livre para a IA atuar sem risco de efeitos colaterais na rota vizinha)

### C. Modularização de Banco de Dados e APIs

* **Regra:** Rotas de API backend dentro do Next.js devem ser isoladas por recurso (ex: `/api/cotacoes` e `/api/pac`). A comunicação e transição de dados entre módulos distintos devem ocorrer por funções de serviço explicitamente mapeadas, nunca misturando lógica de arquivos internos.

---

## 3. Manual de Boas Práticas para Vibe Coding (Prompting & IA Workflow)

Quando este repositório for ser utilizado para desenvolvimento, as seguintes regras de interação devem ser seguidas/sugeridas para manter a estabilidade do código:

1. **Contexto Enxuto (Alimentação em Pílulas):** Nunca devo enviar o projeto inteiro para a janela de contexto da IA se o objetivo for criar ou alterar apenas um módulo. Devo fornecer apenas os arquivos de tipos específicos e as páginas da rota em desenvolvimento.

2. **Desenvolvimento Incremental Passo a Passo:** Devo orientar a IA a trabalhar de forma fásica:
    * *Passo 1:* Definição de Tipos e Contratos (`.types.ts`).
    * *Passo 2:* Estruturação do banco de dados/API mocks (`/api/...`).
    * *Passo 3:* Criação da interface visual crua com Tailwind.
    * *Passo 4:* Conexão da lógica e estado da tela com a API.
3. **Blindagem Antiga:** Proíba explicitamente a IA de alterar arquivos fora do escopo da nova *Feature* a menos que seja solicitado via refatoração planejada.

---

## 4. Filosofia de Refatoração e Legado (Estratégia do Estrangulamento)

Caso o ecossistema precise integrar ou substituir sistemas antigos (ex: migrar um sistema antigo em PHP Puro + Bootstrap para esta stack moderna devido a necessidades de UX rica, integrações nativas de IA ou velocidade de escala):

* **Não destrua o legado de uma vez:** O código antigo que gera valor deve ser mantido online.
* **Abordagem:** Transforme o sistema antigo temporariamente em uma API de dados (JSON) e construa o novo Frontend em Next.js isolado. Gradualmente, migre as regras de negócio para dentro da nova stack moderna até a desativação completa do sistema legado de forma segura e transparente para os usuários.
