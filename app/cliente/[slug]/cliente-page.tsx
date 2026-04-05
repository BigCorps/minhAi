'use client';

// ============================================================
// app/cliente/[slug]/cliente-page.tsx
//
// - Usa SlugHeaderWrapper com pageType='cliente' (mesmo header
//   do assistente, com troca de tema, navegação, avatar etc.)
// - Escuta eai:profileLogin para atualizar sem refresh de página
// - FIX: aguarda loading da Edge Function antes de redirecionar
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useProfile } from '@/hooks/useProfile';
import SlugHeaderWrapper from '@/components/slug/SlugHeaderWrapper';

const ClienteDashboard     = dynamic(() => import('@/components/cliente/dashboards/ClienteDashboard'));
const ColaboradorDashboard = dynamic(() => import('@/components/cliente/dashboards/ColaboradorDashboard'));
const FrentistaDashboard   = dynamic(() => import('@/components/cliente/dashboards/FrentistaDashboard'));
const AtendenteDashboard   = dynamic(() => import('@/components/cliente/dashboards/AtendenteDashboard'));
const CaixaDashboard       = dynamic(() => import('@/components/cliente/dashboards/CaixaDashboard'));
const GerenteDashboard     = dynamic(() => import('@/components/cliente/dashboards/GerenteDashboard'));
const TotemDashboard       = dynamic(() => import('@/components/cliente/dashboards/TotemDashboard'));

const DASHBOARD_MAP: Record<string, React.ComponentType<any>> = {
  cliente:       ClienteDashboard,
  colaborador:   ColaboradorDashboard,
  frentista:     FrentistaDashboard,
  atendente:     AtendenteDashboard,
  caixa:         CaixaDashboard,
  gerente:       GerenteDashboard,
  administrador: GerenteDashboard,
  totem:         TotemDashboard,
};

interface ClientePageProps {
  company: {
    id: string;
    slug: string;
    name: string;
    logo_url?: string | null;
    assistant_role?: string | null;
    webapp_enabled?: boolean;
    modo_vendas_enabled?: boolean;
    modo_fila_enabled?: boolean;
  };
}

export default function ClientePage({ company }: ClientePageProps) {
  const router = useRouter();
  const { profile, loading } = useProfile(company.slug);

  useEffect(() => {
    // ✅ Só redireciona APÓS a Edge Function auth-profile responder
    if (!loading && !profile) {
      router.replace(`/ia/${company.slug}`);
    }
  }, [loading, profile, router, company.slug]);

  // ── Loading: aguarda Edge Function ───────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header mesmo durante o loading */}
        <SlugHeaderWrapper
          company={company}
          slug={company.slug}
          pageType="cliente"
          overlayMode={false}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className="text-sm text-slate-400">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // ── Sem perfil: aguarda redirect do useEffect ─────────────
  if (!profile) return null;

  const Dashboard = DASHBOARD_MAP[profile.tipo] ?? ColaboradorDashboard;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header idêntico ao do assistente ─────────────── */}
      <SlugHeaderWrapper
        company={company}
        slug={company.slug}
        pageType="cliente"
        overlayMode={false}
      />

      {/* ── Dashboard do tipo do perfil ───────────────────── */}
      <main className="flex-1">
        <Dashboard
          profile={profile}
          company={company}
          theme="dark" // SlugHeaderWrapper controla o tema globalmente via next-themes
        />
      </main>
    </div>
  );
}
