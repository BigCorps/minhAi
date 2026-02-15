// app/ia/[slug]/page.tsx
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import AssistenteClient from './assistente-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Função para verificar créditos do USUÁRIO dono da empresa
async function checkUserCredits(companyId: string) {
  const supabase = createClient();

  // 1. Tentar obter o user_id via company_admins (fonte primária)
  const { data: adminData } = await supabase
    .from('company_admins')
    .select('user_id')
    .eq('company_id', companyId)
    .limit(1)
    .single();

  let userId = adminData?.user_id;

  // 2. Fallback: se não houver registro em company_admins,
  //    usa a coluna user_id diretamente na tabela companies.
  //    Isso cobre empresas criadas antes da tabela company_admins existir.
  if (!userId) {
    console.log('⚠️ Empresa sem admin em company_admins — tentando fallback via companies.user_id');

    const { data: companyData } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', companyId)
      .single();

    userId = companyData?.user_id;
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

export default async function AssistentePublicoPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) {
    notFound();
  }

  // Verificar créditos disponíveis DO USUÁRIO
  const remainingCredits = await checkUserCredits(company.id);
  const hasCredits = remainingCredits > 0;

  console.log('🔍 Verificação de créditos:', {
    companyId: company.id,
    companyName: company.name,
    remainingCredits,
    hasCredits
  });

  // Se não tem créditos, mostrar tela de inativo
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
            Assistente Temporariamente Indisponível
          </h1>

          <p className="text-white/60 mb-8">
            O assistente de <span className="text-white font-semibold">{company.name}</span> está sendo atualizado no momento.
          </p>

          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-white/70 text-sm mb-4">
              Se você é o responsável por este assistente:
            </p>
            
            <a href="/dashboard" className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
              Acessar Painel
            </a>
          </div>

          <div className="text-center">
            <p className="text-white/40 text-xs mb-2">
              Caso contrário, entre em contato:
            </p>
            <p className="text-white font-semibold text-sm">
              {company.name}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            
              href="https://eai.app.br"
              className="text-xs text-white/30 hover:text-white/50 transition"
            >
              eAi - Employee Automation Intelligence
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Tem créditos — renderizar o chat
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

// Gerar metadata dinâmica
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: company
      ? `${company.name} - eAi - Assistente IA com Voz`
      : 'eAi - Assistente IA com Voz',
    description: `Converse com o assistente IA da ${company?.name || 'empresa'}`,
  };
}
