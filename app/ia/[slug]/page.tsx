// app/ia/[slug]/page.tsx
import { createClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AssistenteClient from './assistente-client';
import { createAdminClient } from '@/lib/supabase-admin';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Verifica acesso: plano ativo OU créditos disponíveis
async function checkUserAccess(companyId: string): Promise<boolean> {
  const supabase = createAdminClient();

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
    return false;
  }

  const { data: credits } = await supabase
    .from('user_credits')
    .select('available_credits, has_active_plan, plan_expires_at')
    .eq('user_id', userId)
    .single();

  if (!credits) return false;

  // ✅ Plano ativo dentro da validade → acesso liberado independente de créditos
  const hasActivePlan =
    credits.has_active_plan === true &&
    credits.plan_expires_at != null &&
    new Date(credits.plan_expires_at) > new Date();

  if (hasActivePlan) return true;

  // Sem plano → verificar créditos disponíveis
  return (credits.available_credits || 0) > 0;
}

// Verifica se o webapp está elegível (Consulting ativo ou Trial)
async function checkWebappEligibility(companyId: string): Promise<boolean> {
  const supabase = createAdminClient();

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

  const { data: credits } = await supabase
    .from('user_credits')
    .select('has_active_plan, plan_expires_at, active_plan_id, active_plan_name')
    .eq('user_id', userId)
    .single();

  if (!credits?.has_active_plan) return false;
  if (!credits?.plan_expires_at) return false;
  if (new Date(credits.plan_expires_at) <= new Date()) return false;

  // Trial tem acesso ao webapp
  const isTrial = credits.active_plan_name === 'Trial' && !credits.active_plan_id;
  if (isTrial) return true;

  // Não é trial — verificar se o pacote tem has_consultoria
  if (!credits.active_plan_id) return false;

  const { data: pkg } = await supabase
    .from('credits_packages')
    .select('has_consultoria')
    .eq('id', credits.active_plan_id)
    .single();

  return pkg?.has_consultoria === true;
}

export default async function AssistentePublicoPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();

  // ✅ Fix Next.js 15 — headers() é assíncrono
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const MINHAI_DOMAINS = [
    '.minhai.app',
    '.minhai.com.br',
    '.minhaia.app',
    '.nossaia.app',
    '.suaia.app',
  ];
  const isDevSub = host.includes('.localhost');
  const viaSubdomain = isDevSub || MINHAI_DOMAINS.some(d =>
    host.endsWith(d) && !host.startsWith('www.')
  );

const isVendas = company.assistant_type === 'vendas';

  // ── Verificação de webapp (só se vier pelo subdomínio) ───────────────────
  if (viaSubdomain) {
    // Versão Vendas: webapp sempre liberado para este assistente
    if (!isVendas) {
      if (!company.webapp_enabled) {
        return <WebappInativo company={company} motivo="nao_configurado" />;
      }

      const webappOk = await checkWebappEligibility(company.id);
      if (!webappOk) {
        return <WebappInativo company={company} motivo="plano_expirado" />;
      }
    }
  }

  // ── Verificação de acesso (créditos ou plano ativo) ──────────────────────
  // Versão Vendas: acesso sempre liberado (modelo gratuito + comissão)
  const hasAccess = isVendas || await checkUserAccess(company.id);
  console.log('🔍 Verificação:', { companyId: company.id, hasAccess, viaSubdomain, isVendas });

  if (!hasAccess) {
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

  if (viaSubdomain) {
    const home = company.webapp_home ?? 'ia';

    if (home === 'vendas' && company.modo_vendas_enabled) {
      redirect(`/vendas`);
    }
    if (home === 'fila' && company.modo_fila_enabled) {
      redirect(`/fila`);
    }
    if (home === 'links' && company.modo_links_enabled) {
      redirect(`/link`);
    }
    if (home === 'site' && company.website) {
      redirect(`/site`);
    }
  }

  return (
    <AssistenteClient
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        wake_word: company.wake_word || 'olá assistente',
        greeting_message: company.greeting_message || 'Olá! Como posso ajudar você hoje?',
        logo_url: company.logo_url || undefined,
        assistant_role: company.assistant_role,
        hide_disabled_functions_carousel: company.hide_disabled_functions_carousel,
        carousel_auto_scroll: company.carousel_auto_scroll,
        webapp_enabled: company.webapp_enabled ?? false,
        webapp_home: company.webapp_home ?? null,
        modo_vendas_enabled: company.modo_vendas_enabled ?? false,
        modo_fila_enabled: company.modo_fila_enabled ?? false,
        modo_links_enabled: company.modo_links_enabled ?? false,
      }}
    />
  );
}

// Componente de webapp inativo
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

// Metadata dinâmica — themeColor movido para viewport (fix Next.js 15)
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, webapp_logo_url')
    .eq('slug', slug)
    .single();

  if (!company) {
    return { title: 'minhAi - Uma IA pra chamar de sua!' };
  }

  // Priorizar webapp_logo_url (ícone do PWA) sobre logo_url (header do assistente)
  const iconUrl = company.webapp_logo_url || null;

  return {
    title: `${company.name} - minhAi`,
    description: `Converse com o assistente IA da ${company.name}`,
    // Só define icons se tiver webapp_logo_url — evita URLs externas problemáticas
    icons: iconUrl
      ? { icon: iconUrl, apple: iconUrl }
      : undefined,
    openGraph: {
      title: `${company.name} - Assistente IA`,
      description: `Converse com o assistente IA da ${company.name}`,
      images: iconUrl ? [{ url: iconUrl }] : [],
    },
  };
}

// ✅ Fix Next.js 15 — themeColor deve estar em generateViewport, não generateMetadata
export async function generateViewport({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('webapp_theme_color')
    .eq('slug', slug)
    .single();

  return {
    themeColor: company?.webapp_theme_color || '#f97316',
  };
}
