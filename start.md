# 1. Copiar template

cp -r stack-padrao/ mvp_grade_catmat_catser

# 2. Instalar dependências

pnpm install
pnpm add -D prettier prettier-plugin-tailwindcss
pnpm add clsx tailwind-merge lucide-react
pnpm add -D tailwindcss-animate

# 3. Rodar setup

./init-project.sh