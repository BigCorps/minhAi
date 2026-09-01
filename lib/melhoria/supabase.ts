// lib/melhoria/supabase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cliente único do navegador para a MelhorIA.
//
// ── BUG 1 (corrigido antes): duas instâncias de GoTrue ──────────────────────
// A primeira versão criava um `createBrowserClient` próprio, separado do
// `@/lib/supabase-browser`. Duas instâncias = dois GoTrue, e a segunda ainda
// não tinha a sessão logo após o login → consulta como anon → RLS nega → o
// card vermelho "não consegui carregar seus dados".
//
// ── BUG 2 (o desta correção): laço infinito de renderização ─────────────────
// `.schema('melhoria')` devolve um OBJETO NOVO a cada chamada. As telas fazem:
//
//     const mel = createMelhoriaClient();          // referência nova a cada render
//     const carregar = useCallback(async () => {…}, [supabase, mel, router]);
//     useEffect(() => { carregar(); }, [carregar]);
//
// Como `mel` muda de identidade a cada render, `carregar` também muda, o
// efeito dispara de novo, o `setState` provoca outro render — e assim sem
// parar. Toda tela ficava refazendo as consultas indefinidamente.
//
// Em "Meus dados" isso tinha um sintoma específico e confuso: o `carregar`
// chama `aplicarEscala(doBanco)`. Rodando em laço, ele sobrescrevia a escolha
// da pessoa com o valor do banco milissegundos depois do clique — daí o
// "escolho Normal e volta para Grande sozinho".
//
// Também explica a lentidão do Acompanhamento e um consumo de rede bem maior
// que o necessário em todas as telas.
//
// A correção é memoizar TAMBÉM o cliente de schema, para a referência ser
// estável entre renders.
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr';

type Cliente = ReturnType<typeof createBrowserClient>;

let instancia: Cliente | null = null;
let instanciaSchema: ReturnType<Cliente['schema']> | null = null;

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
 * ⚠️ A memoização não é otimização: é o que impede o laço de renderização
 * descrito no topo. Não troque por `melhoriaAuth().schema('melhoria')` direto.
 *
 * Se todas as consultas voltarem 404 / "relation does not exist", o schema não
 * está exposto: Supabase → Settings → API → Exposed schemas → `melhoria`.
 */
export function createMelhoriaClient() {
  if (!instanciaSchema) {
    instanciaSchema = melhoriaAuth().schema('melhoria');
  }
  return instanciaSchema;
}

/** Alias, para as telas ficarem legíveis: `const supabase = melhoriaAuth()`. */
export const createClient = melhoriaAuth;
