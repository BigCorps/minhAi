# Guia de Setup - Voice Assistant Multi-Tenant

Este guia vai te orientar no setup completo do projeto, passo a passo.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no GitHub
- Conta no Supabase (gratuita)
- Conta no Vercel (gratuita)

---

## 🚀 Parte 1: Setup Local e GitHub

### 1. Upload para o GitHub

```bash
# Inicializar repositório Git
git init

# Adicionar todos os arquivos
git add .

# Fazer primeiro commit
git commit -m "Initial commit: Voice Assistant base structure"

# Criar repositório no GitHub (via interface web)
# Depois conectar o repositório local:
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git branch -M main
git push -u origin main
```

### 2. Instalar dependências localmente

```bash
npm install
```

---

## 🗄️ Parte 2: Configurar Supabase

### 1. Criar projeto no Supabase

1. Acesse: https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Name:** voice-assistant (ou o nome que preferir)
   - **Database Password:** Crie uma senha forte (ANOTE!)
   - **Region:** South America (São Paulo) - se disponível
4. Aguarde ~2 minutos para o projeto ser criado

### 2. Executar o Schema SQL

1. No painel do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Copie TODO o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a execução (deve levar ~5 segundos)
8. Verifique se apareceu "Success" em verde

### 3. Copiar as credenciais do Supabase

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem)
2. Clique em **API** no menu lateral
3. Copie as seguintes informações:

```
Project URL: https://seu-projeto.supabase.co
anon/public key: eyJhbGc... (key longa)
service_role key: eyJhbGc... (key longa - SECRETA!)
```

### 4. Configurar variáveis de ambiente localmente

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o arquivo .env.local e adicione as credenciais:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Testar conexão local

```bash
npm run dev
```

Abra http://localhost:3000 no navegador. Você deve ver a landing page funcionando!

---

## ☁️ Parte 3: Deploy no Vercel

### 1. Conectar repositório ao Vercel

1. Acesse: https://vercel.com
2. Clique em **Add New** → **Project**
3. Conecte sua conta do GitHub (se ainda não conectou)
4. Selecione o repositório `voice-assistant-multitenant`
5. Clique em **Import**

### 2. Configurar variáveis de ambiente no Vercel

Na tela de configuração do projeto:

1. Expanda a seção **Environment Variables**
2. Adicione as seguintes variáveis:

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://seu-projeto.supabase.co

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: sua-anon-key-aqui

Name: SUPABASE_SERVICE_ROLE_KEY
Value: sua-service-role-key-aqui (MARQUE COMO SECRET!)

Name: NEXT_PUBLIC_APP_URL
Value: https://seu-projeto.vercel.app (será gerado automaticamente)
```

3. Clique em **Deploy**

### 3. Aguardar o deploy

- O deploy leva ~2-3 minutos
- Você verá logs de build em tempo real
- Quando terminar, clique em **Visit** para ver o site online

---

## ✅ Verificação de Sucesso

Se tudo deu certo, você deve ter:

1. ✅ Site rodando localmente em `http://localhost:3000`
2. ✅ Site rodando online no Vercel
3. ✅ Landing page aparecendo com design laranja/branco
4. ✅ Página `/dashboard` acessível (ainda placeholder)
5. ✅ Supabase com 5 tabelas criadas:
   - companies
   - company_admins
   - company_prompts
   - conversations
   - messages

### Como verificar as tabelas do Supabase:

1. No Supabase, vá em **Table Editor**
2. Você deve ver as 5 tabelas listadas no menu lateral
3. Clique em `companies` - deve ter 1 registro: "Restaurante Bella Vista"
4. Clique em `company_prompts` - deve ter 1 registro: "Atendimento Padrão"

---

## 🐛 Troubleshooting

### Erro: "Module not found"

```bash
# Deletar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Invalid Supabase URL"

- Verifique se copiou a URL completa (incluindo https://)
- Verifique se não tem espaços antes/depois da URL
- Refaça o arquivo .env.local

### Erro: SQL execution failed

- Verifique se copiou TODO o conteúdo do schema.sql
- Tente executar novamente (é seguro, não vai duplicar)
- Se persistir, delete o projeto Supabase e crie novo

### Site não abre no Vercel

- Verifique se o deploy terminou (status "Ready")
- Aguarde 1-2 minutos para propagação DNS
- Limpe o cache do navegador (Ctrl+Shift+R)

---

## 🎯 Próximos Passos

Agora que o projeto base está rodando, vamos para as próximas etapas:

1. ⏳ **Configurar OpenAI API** (Whisper, GPT, TTS)
2. ⏳ **Configurar Porcupine Wake Word**
3. ⏳ **Implementar sistema de autenticação**
4. ⏳ **Criar CRUD de prompts**
5. ⏳ **Desenvolver cliente de voz**

**Me avise quando tiver terminado essa parte e vamos para a próxima!** 🚀
