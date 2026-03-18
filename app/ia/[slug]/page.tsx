import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import AssistenteClient from './assistente-client';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Verifica créditos do dono da empresa (lógica existente — sem alteração)
async function checkUserCredits(companyId: string) {
  const supabase = createClient();

  const { data: adminData } = await supabase
    .from('company_admins')
    .select('user_id')
    .eq('company_id', companyId)
    .limit(1)
    .single();

  let userId = adminData?.user_id;

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

  const { data: credits } = await supabase
    .from('user_credits')
    .select('available_credits')
    .eq('user_id', userId)
    .single();

  return credits?.available_credits || 0;
}

// ✅ NOVO: verifica se o webapp Consulting está ativo para este usuário
async function checkWebappEligibility(companyId: string): Promise<boolean> {
  const supabase = createClient();

  // Buscar user_id do dono
  const { data: adminData } = await supabase
    .from('company_admins')
    .select('user_id')
    .eq('company_id', companyId)
    .limit(1)
    .single();

  let userId = adminData?.user_id;

  if (!userId) {
    const { data: companyData } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', companyId)
      .single();
    userId = companyData?.user_id;
  }

  if (!userId) return false;

  // Verificar plano ativo com has_consultoria = true
  const { data: credits } = await supabase
    .from('user_credits')
    .select(`
      has_active_plan,
      plan_expires_at,
      active_plan_id,
      credits_packages!active_plan_id (
        has_consultoria
      )
    `)
    .eq('user_id', userId)
    .single();

  if (!credits?.has_active_plan) return false;
  if (!credits?.plan_expires_at) return false;
  if (new Date(credits.plan_expires_at) <= new Date()) return false;

  const pkg = credits.credits_packages as any;
  return pkg?.has_consultoria === true;
}

// ✅ NOVO: detecta se o acesso veio de um subdomínio de cliente
function isSubdomainAccess(): boolean {
  const headersList = headers();
  const host = headersList.get('host') || '';
  // Subdomínio = tem ponto E não é www.minhai.app nem localhost puro
  const isMinhai = host.endsWith('.minhai.app') && !host.startsWith('www.');
  const isDevSub  = host.includes('.localhost');
  return isMinhai || isDevSub;
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();

  const viaSubdomain = isSubdomainAccess();

  // ── Verificação de webapp (só se vier pelo subdomínio) ───────────────────
  if (viaSubdomain) {
    // webapp_enabled precisa estar ligado na empresa
    if (!company.webapp_enabled) {
      return <WebappInativo company={company} motivo="nao_configurado" />;
    }

    // Plano Consulting precisa estar ativo
    const webappOk = await checkWebappEligibility(company.id);
    if (!webappOk) {
      return <WebappInativo company={company} motivo="plano_expirado" />;
    }
  }

  // ── Verificação de créditos (fluxo normal existente) ────────────────────
  const remainingCredits = await checkUserCredits(company.id);
  const hasCredits = remainingCredits > 0;

  console.log('🔍 Verificação:', { companyId: company.id, remainingCredits, viaSubdomain });

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
          <h1 className="text-3xl font-bold text-white mb-4">Assistente Temporariamente Indisponível</h1>
          <p className="text-white/60 mb-8">
            O assistente de <span className="text-white font-semibold">{company.name}</span> está sendo atualizado no momento.
          </p>
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
            <p className="text-white/70 text-sm mb-4">Se você é o responsável por este assistente:</p>
            <a href="/dashboard" className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
              Acessar Painel
            </a>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
            <a href="https://minhai.app" className="text-xs text-white/30 hover:text-white/50 transition">
              minhAi - Uma IA para chamar de sua!
            </a>
          </div>
        </div>
      </div>
    );
  }

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

// ✅ NOVO: componente de webapp inativo (plano expirado ou não configurado)
function WebappInativo({
  company,
  motivo,
}: {
  company: { name: string; logo_url?: string | null };
  motivo: 'plano_expirado' | 'nao_configurado';
}) {
  const mensagem = motivo === 'plano_expirado'
    ? 'O plano deste assistente não está ativo no momento.'
    : 'Este assistente ainda não foi configurado como webapp.';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: '2rem', textAlign: 'center' }}>

        {/* Logo da empresa ou ícone padrão */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
            />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
          {company.name}
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          {mensagem}
        </p>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
          <a href="https://minhai.app" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            minhAi — Uma IA para chamar de sua!
          </a>
        </div>
      </div>
    </div>
  );
}

// Metadata dinâmica com branding da empresa
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, webapp_theme_color')
    .eq('slug', slug)
    .single();

  if (!company) {
    return { title: 'minhAi - Uma IA pra chamar de sua!' };
  }

  return {
    title: `${company.name} - minhAi`,
    description: `Converse com o assistente IA da ${company.name}`,
    // ✅ Ícone da empresa como favicon (via Vercel Image Optimization)
    icons: company.logo_url
      ? { icon: company.logo_url, apple: company.logo_url }
      : undefined,
    // ✅ Theme color para barra do navegador mobile
    themeColor: company.webapp_theme_color || '#f97316',
    openGraph: {
      title: `${company.name} - Assistente IA`,
      description: `Converse com o assistente IA da ${company.name}`,
      images: company.logo_url ? [{ url: company.logo_url }] : [],
    },
  };
}