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

// Função para verificar créditos da empresa
async function checkCompanyCredits(companyId: string) {
  const supabase = createClient();
  
  const { data: credits } = await supabase
    .from('company_credits')
    .select('available_credits')
    .eq('company_id', companyId)
    .single();
  
  return credits?.available_credits || 0;
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  // Next.js 16: params agora é async
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

  // 💳 Verificar créditos disponíveis
  const remainingCredits = await checkCompanyCredits(company.id);
  const hasCredits = remainingCredits > 0;

  // 🚫 Se não tem créditos, mostrar tela de inativo
  if (!hasCredits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md mx-auto p-8 text-center">
          {/* Ícone de Bloqueado */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/30">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Assistente Temporariamente Inativo
          </h1>

          {/* Descrição */}
          <p className="text-white/60 mb-2">
            O assistente virtual de <span className="text-white font-semibold">{company.name}</span> está sem créditos disponíveis no momento.
          </p>

          <p className="text-white/40 text-sm mb-8">
            Para reativar este assistente, é necessário adquirir mais créditos.
          </p>

          {/* Informações de Contato */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-white/70 text-sm mb-4">
              Se você é o responsável por este assistente:
            </p>
            <a
              href="https://itend.com.br/login"
              className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Acessar Painel e Recarregar Créditos
            </a>
          </div>

          {/* Link Alternativo */}
          <div className="text-center">
            <p className="text-white/40 text-xs mb-2">
              Caso contrário, entre em contato com:
            </p>
            <p className="text-white font-semibold text-sm">
              {company.name}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <a
              href="https://itend.com.br"
              className="text-xs text-white/30 hover:text-white/50 transition"
            >
              iTend - Assistentes Virtuais com IA
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Tem créditos, passar dados para client component
  return (
    <AssistenteClient
      company={{
        id: company.id,
        name: company.name,
        wake_word: company.wake_word || 'olá assistente',
        greeting_message: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
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
    title: company ? `${company.name} - Assistente Virtual` : 'Assistente Virtual',
    description: `Converse com o assistente virtual da ${company?.name || 'empresa'}`,
  };
}