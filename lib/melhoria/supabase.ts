// lib/melhoria/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cliente do navegador apontado para o schema `melhoria`.
//
// As tabelas da MelhorIA NÃO estão em `public` — estão no schema dedicado
// `melhoria`, no padrão do ConviteIA (schema `conviteria`). Por isso o cliente
// padrão do repo (`@/lib/supabase-browser`) não enxerga nenhuma delas.
//
// ⚠️ Se todas as consultas voltarem 404 / "relation does not exist", o problema
// quase sempre é o schema não estar exposto: Supabase → Settings → API →
// Exposed schemas → acrescente `melhoria`. É o erro nº 1 de schema dedicado, e
// não dá mensagem clara.
//
// Para o núcleo compartilhado (companies, user_credits, credits_packages,
// assistant_functions, lista_compras...) continue usando `@/lib/supabase-browser`
// — aquilo vive em `public` mesmo.
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr';

export function createMelhoriaClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'melhoria' } }
  );
}
