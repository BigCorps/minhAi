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

// Função para verificar créditos do USUÁRIO dono da empresa
async function checkUserCredits(companyId: string) {
  const supabase = createClient();
  
  // 1. Buscar user_id do dono da empresa (usando a coluna user_id que adicionamos)
  const { data: companyData } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single();
  
  if (!companyData?.user_id) {
    return 0;
  }

  // 2. Buscar créditos DO USUÁRIO
  const { data: credits } = await supabase
    .from('user_credits')
    .select('available_credits')
    .eq('user_id', companyData.user_id)
    .single();
  
  return credits?.available_credits || 0;
}

export default async function AssistentePrivadoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();

  // 1. Verificar se o usuário está logado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    // Redirecionar para login se não estiver autenticado
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

  // 3. Verificar se o usuário logado tem permissão (é o dono da empresa)
  if (company.user_id !== user.id) {
    // Se não for o dono, não tem acesso ao chat privado
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-slate-400">Você não tem permissão para acessar este assistente privado.</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-400 hover:underline">Voltar ao Dashboard</a>
        </div>
      </div>
    );
  }

  // 4. Verificar créditos
  const remainingCredits = await checkUserCredits(company.id);
  const hasCredits = remainingCredits > 0;

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
          <h1 className="text-3xl font-bold text-white mb-4">Assistente Indisponível</h1>
          <p className="text-white/60 mb-8">O assistente <span className="text-white font-semibold">{company.name}</span> está sem créditos.</p>
          <a href="/dashboard" className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">Acessar Painel</a>
        </div>
      </div>
    );
  }

  // 5. Renderizar o chat (reutilizando o componente público)
  return (
    <AssistenteClient
      company={{
        id: company.id,
        name: company.name,
        wake_word: company.wake_word || 'olá assistente',
        greeting_message: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
        logo_url: company.logo_url || undefined,
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
    title: company ? `${company.name} (Privado) - eAi` : 'Assistente Privado - eAi',
    robots: 'noindex, nofollow', // Não indexar chats privados
  };
}
