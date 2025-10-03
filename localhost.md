# 🏠 Executar Chad Maker Forge Localmente

Guia rápido para rodar o projeto em localhost para desenvolvimento e testes.

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou bun
- Git

---

## 🚀 Instalação e Execução

### 1. Clonar o Repositório

```bash
# Se o repositório for privado, você precisará de autenticação
git clone https://github.com/DevGuipe/chad-maker-forge.git
cd chad-maker-forge
```

**Para repositórios privados:**
- Use Personal Access Token ou configure SSH key
- Veja detalhes no [INSTALLATION.md](INSTALLATION.md)

### 2. Instalar Dependências

```bash
# Com npm
npm install

# Ou com bun (mais rápido)
bun install
```

### 3. Executar em Modo Desenvolvimento

```bash
# Com npm
npm run dev

# Ou com bun
bun dev
```

O projeto estará disponível em: **http://localhost:8080**

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Gera build de produção
npm run preview      # Visualiza build localmente

# Linting
npm run lint         # Verifica código com ESLint
```

---

## 🌐 Configuração do Supabase

O projeto já vem com configurações do Supabase no arquivo `.env`:

```env
VITE_SUPABASE_PROJECT_ID="imyajbdqytdrefdnvgej"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://imyajbdqytdrefdnvgej.supabase.co"
```

**Nota:** Estas são chaves públicas e podem ser expostas no frontend.

---

## 🧪 Testando Funcionalidades

### Telegram WebApp
- No ambiente local, o componente usa dados mockados para desenvolvimento
- Para testar com Telegram real, deploy em produção é necessário

### Criação de Memes
- Todas as funcionalidades de edição funcionam localmente
- Upload e galeria utilizam o Supabase configurado

### Base de Dados
- O projeto está conectado ao Supabase em produção
- Dados criados localmente serão salvos no banco real

---

## 🚨 Troubleshooting

### Erro de Porta em Uso
```bash
# Se a porta 8080 estiver ocupada
npx kill-port 8080

# Ou altere a porta no vite.config.ts
```

### Problemas de Dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm package-lock.json
npm install
```

### Erro de Telegram WebApp
```bash
# Normal em localhost - usa dados mockados
# Verifique o console para confirmação
```

---

## 📁 Estrutura do Projeto

```
chad-maker-forge/
├── src/
│   ├── components/          # Componentes React
│   ├── pages/              # Páginas da aplicação
│   ├── lib/                # Utilitários e configurações
│   └── integrations/       # Integrações (Supabase)
├── public/                 # Arquivos estáticos
└── supabase/              # Configurações e funções
```

---

## ⚡ Dicas de Desenvolvimento

1. **Hot Reload**: Mudanças no código são refletidas automaticamente
2. **DevTools**: Use React Developer Tools para debug
3. **Console**: Monitore o console para logs e erros
4. **Network**: Verifique chamadas à API no DevTools

---

## 🔄 Workflow Recomendado

1. **Desenvolva localmente** com `npm run dev`
2. **Teste funcionalidades** no localhost:8080
3. **Faça build** com `npm run build` 
4. **Deploy** seguindo [INSTALLATION.md](INSTALLATION.md)

---

*💡 Para produção completa, siga o guia em [INSTALLATION.md](INSTALLATION.md)*