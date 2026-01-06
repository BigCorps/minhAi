# Voice Assistant Multi-Tenant

Sistema de atendimento ao cliente por voz com IA, multi-tenant com dashboard de gerenciamento.

## 🚀 Setup Rápido

### 1. Clone o repositório

```bash
git clone seu-repositorio.git
cd voice-assistant-multitenant
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 4. Execute o projeto

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📋 Próximos Passos

1. ✅ Estrutura base do projeto
2. ⏳ Configurar Supabase (database schema)
3. ⏳ Integrar APIs de voz (OpenAI, Porcupine)
4. ⏳ Implementar sistema de autenticação
5. ⏳ Criar dashboard de gerenciamento
6. ⏳ Implementar cliente de voz

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **Estilização:** Tailwind CSS
- **Deploy:** Vercel

## 📚 Documentação

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Suporte

Para dúvidas e suporte, abra uma issue no repositório.
