'use client';

// app/pix/callback/page.tsx
// Callback OAuth do Google para o fluxo Pix Wiki.
// Baseado no callback existente do projeto (app/auth/callback/page.tsx).
//
// O fluxo do Pix Wiki passa os dados do formulário via query string antes
// de redirecionar pro Google:
//   /pix/callback?slug=minha-loja&nome=...&pix=...&logo=...&doc=...&docTipo=...&pixTipo=...
//
// Após trocar o code pela session, esse callback cria a empresa e redireciona
// pro dashboard. Se qualquer dado obrigatório faltar (ex: usuário abriu o
// callback direto sem ter preenchido o formulário), redireciona pra /pix
// com erro.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function PixCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'loading' | 'creating' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handle = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code       = params.get('code');
        const error      = params.get('error');
        const slug       = params.get('slug');
        const nome       = params.get('nome');
        const pix        = params.get('pix');
        const logo       = params.get('logo') || '';
        const doc        = params.get('doc') || '';
        const docTipo    = params.get('docTipo') || '';
        const pixTipo    = params.get('pixTipo') || '';
        const wa         = params.get('wa') || '';
        const emailParam = params.get('email') || '';

        // ── Erro vindo do OAuth ──────────────────────────────────────────────
        if (error) {
          throw new Error(`Erro de autenticação: ${error}`);
        }

        // ── Sem code: não veio do fluxo OAuth ───────────────────────────────
        if (!code) {
          // Pode já estar logado — tenta pegar sessão existente
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            router.replace('/pix?error=auth_error');
            return;
          }
        } else {
          // ── Troca o code pela session ────────────────────────────────────
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw new Error(exchangeErr.message);
        }

        // ── Pega usuário autenticado ─────────────────────────────────────────
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) throw new Error('Não foi possível obter dados do usuário.');

        // ── Dados obrigatórios do formulário ─────────────────────────────────
        if (!slug || !nome || !pix) {
          // Dados não vieram na query string — redireciona de volta pro formulário.
          // Isso acontece se o usuário acessar /pix/callback direto sem ter
          // preenchido o formulário primeiro.
          router.replace('/pix?error=missing_data');
          return;
        }

        setStatus('creating');

        // ── 1. Verifica se o slug ainda está disponível (pode ter sido tomado
        //      enquanto o usuário fazia o login no Google) ────────────────────
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          // Slug foi tomado durante o OAuth — redireciona pro formulário
          // com erro claro pra escolher outro
          router.replace(`/pix?error=slug_taken&slug=${slug}`);
          return;
        }

        // ── 2. Cria a empresa ─────────────────────────────────────────────────
        const { data: company, error: companyErr } = await supabase
          .from('companies')
          .insert({
            name: decodeURIComponent(nome),
            slug,
            logo_url: logo ? decodeURIComponent(logo) : null,
            is_active: true,
            is_public: true,
            assistant_type: 'smart',
            user_id: user.id,
            whatsapp_number: wa ? decodeURIComponent(wa) : null,
            email_contato: emailParam ? decodeURIComponent(emailParam) : null,
          })
          .select('id')
          .single();

        if (companyErr || !company) {
          throw new Error('Erro ao criar empresa. Tente novamente.');
        }

        // ── 3. Salva chave de saque e documento no perfil ─────────────────────
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            withdrawal_pix_key: decodeURIComponent(pix),
            withdrawal_pix_key_type: pixTipo || null,
            documento: doc ? decodeURIComponent(doc) : null,
            documento_tipo: docTipo || null,
          }, { onConflict: 'user_id' });

        // ── 4. Short link (pix.wiki/slug → minhai.app/pix/slug) ───────────────
        await supabase
          .from('short_links')
          .insert({
            slug,
            type: 'pix_wiki',
            company_id: company.id,
            user_id: user.id,
            original_url: `https://minhai.app/pix/${slug}`,
          });

        // ── 5. Registra lead na demo_sessions ────────────────────────────────
        await supabase
          .from('demo_sessions')
          .insert({
            nome_negocio: decodeURIComponent(nome),
            email:  emailParam ? decodeURIComponent(emailParam) : null,
            phone:  wa ? decodeURIComponent(wa) : null,
            origem_simples: 'pixwiki',
            linked_user_id: user.id,
            linked_company_id: company.id,
            linked_at: new Date().toISOString(),
            status: 'converted',
          });

        // ── Sucesso — vai pro dashboard ───────────────────────────────────────
        router.replace('/dashboard?pixwiki=1');

      } catch (err: any) {
        console.error('[pix/callback]', err);
        setErrorMsg(err.message || 'Erro inesperado.');
        setStatus('error');
      }
    };

    handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-white font-semibold text-center">Algo deu errado</p>
        <p className="text-white/40 text-sm text-center max-w-xs">{errorMsg}</p>
        <button
          onClick={() => router.replace('/pix')}
          className="px-5 py-2 bg-white/5 text-white/70 rounded-xl text-sm hover:bg-white/10 transition-colors"
        >
          Voltar e tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-white/60 text-sm text-center">
        {status === 'loading' ? 'Autenticando…' : 'Configurando seu link PIX…'}
      </p>
    </div>
  );
}
