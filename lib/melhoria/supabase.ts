// lib/melhoria/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ CORREÇÃO DA CAUSA DO CARD VERMELHO NO PRIMEIRO LOGIN.
//
// A versão anterior fazia isto:
//
//     createBrowserClient(url, key, { db: { schema: 'melhoria' } })
//
// ou seja, criava uma SEGUNDA instância de cliente, separada do
// `@/lib/supabase-browser`. Cada `createBrowserClient` instancia um GoTrue
// próprio, e o Supabase avisa disso no console:
//
//     Multiple GoTrueClient instances detected in the same browser context
//
// A segunda instância precisa hidratar a sessão do storage por conta própria.
// Nos primeiros milissegundos depois do login ela ainda não tem o token, então
// a consulta sai como `anon`, a RLS nega, o resultado volta vazio — e a tela
// mostra "Não consegui carregar seus dados", mesmo com o perfil existindo no
// banco.
//
// Confirmado no banco: o perfil estava lá e a RLS aceitava a leitura para
// aquele usuário. O problema nunca foi permissão; era o cliente sem sessão.
//
// A correção é ter UMA instância só, memoizada, e trocar de schema por
// consulta com `.schema('melhoria')` — suportado desde o supabase-js 2.10
// (o projeto está no 2.112.3).
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr';

type Cliente = ReturnType<typeof createBrowserClient>;

let instancia: Cliente | null = null;

/**
 * Cliente único do navegador. Use este em TODAS as telas da MelhorIA, tanto
 * para `public` quanto para a autenticação — nunca misture com outra chamada
 * a `createBrowserClient`.
 */
export function melhoriaAuth(): Cliente {
  if (!instancia) {
    instancia = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return instancia;
}

/**
 * Mesma instância, apontada para o schema `melhoria`.
 *
 * Se todas as consultas voltarem 404 / "relation does not exist", o schema não
 * está exposto: Supabase → Settings → API → Exposed schemas → `melhoria`.
 */
export function createMelhoriaClient() {
  return melhoriaAuth().schema('melhoria');
}

/** Alias, para as telas ficarem legíveis: `const supabase = melhoriaAuth()`. */
export const createClient = melhoriaAuth;
