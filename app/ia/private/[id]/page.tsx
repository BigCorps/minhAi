// app/ia/private/[id]/page.tsx
import { createClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import AssistenteClient from '../../[slug]/assistente-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Função para verificar créditos do USUÁRIO dono da empresa.
async function checkUserCredits(companyId: string) {
  const supabase = createClient();

  // 1. Tentar obter o user_id direto da tabela companies (fonte primária para privados)
  const { data: companyData } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();

  let userId = companyData?.user_id;

  // 2. Fallback: tentar via company_admins caso user_id não esteja preenchido
  if (!userId) {
    console.log('⚠️ companies.user_id vazio — tentando fallback via company_admins');

    const { data: adminData } = await supabase
      .from('company_admins')
      .select('user_id')
      .eq('company_id', companyId)
      .limit(1)
      .single();

    userId = adminData?.user_id;
  }

  if (!userId) {
    console.log('⚠️ Empresa sem proprietário definido — companyId:', companyId);
    return 0;
  }

  console.log('👤 User ID do dono:', userId);

  // 3. Buscar créditos DO USUÁRIO
  const { data: credits } = await supabase
    .from('user_credits')
    .select('available_credits')
    .eq('user_id', userId)
    .single();

  const availableCredits = credits?.available_credits || 0;
  console.log('💰 Créditos disponíveis:', availableCredits);

  return availableCredits;
}

export default async function AssistentePrivadoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();

  // 1. Verificar autenticação — deve ser a primeira checagem
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirectTo=/ia/private/${id}`);
  }

  // 2. Buscar a empresa pelo private_slug (ou ID como fallback)
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .or(`private_slug.eq.${id},id.eq.${id}`)
    .single();

  if (error || !company) {
    notFound();
  }

  // 3. Verificar se o usuário logado é o dono da empresa
  if (company.user_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-slate-400">
            Você não tem permissão para acessar este assistente privado.
          </p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-400 hover:underline">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 4. Verificar créditos — só após confirmar que o usuário é o dono
  const remainingCredits = await checkUserCredits(company.id);
  const hasCredits = remainingCredits > 0;

  console.log('🔍 Verificação de créditos (privado):', {
    companyId: company.id,
    companyName: company.name,
    remainingCredits,
    hasCredits,
  });

  if (!hasCredits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border-2 border-amber-500/30">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Assistente Indisponível
          </h1>
          <p className="text-white/60 mb-8">
            O assistente <span className="text-white font-semibold">{company.name}</span> está sem créditos.
          </p>
          <a href="/dashboard" className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            Acessar Painel
          </a>
        </div>
      </div>
    );
  }

  // 5. Tudo certo — renderizar o chat
  return (
    <AssistenteClient
      company={{
        id: company.id,
        name: company.name,
        wake_word: company.wake_word || 'olá assistente',
        greeting_message: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
        logo_url: company.logo_url || undefined,
        assistant_role: company.assistant_role,
        hide_disabled_functions_carousel: company.hide_disabled_functions_carousel,
        carousel_auto_scroll: company.carousel_auto_scroll,
      }}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .or(`private_slug.eq.${id},id.eq.${id}`)
    .single();

  return {
    title: company ? `${company.name} (Privado) - minhAi` : 'Uma IA pra chamar de sua!',
    robots: 'noindex, nofollow',
  };
}
