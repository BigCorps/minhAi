'use client';

// ============================================================
// app/cliente/[slug]/cliente-page.tsx
//
// FIX: useProfile chama Edge Function auth-profile (~300ms).
// O redirect só pode ocorrer DEPOIS de loading=false.
// Sem isso, usuário logado é redirecionado para /ia/[slug].
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useProfile } from '@/hooks/useProfile';

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
  };
  theme: 'dark' | 'light';
}

export default function ClientePage({ company, theme }: ClientePageProps) {
  const router = useRouter();
  const { profile, loading } = useProfile(company.slug);

  useEffect(() => {
    // ✅ Só redireciona APÓS a Edge Function auth-profile responder
    if (!loading && !profile) {
      router.replace(`/ia/${company.slug}`);
    }
  }, [loading, profile, router, company.slug]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: theme === 'dark' ? 'rgb(2, 6, 23)' : 'rgb(248, 250, 252)' }}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        <p
          className="text-sm"
          style={{ color: theme === 'dark' ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          Verificando sessão...
        </p>
      </div>
    );
  }

  if (!profile) return null;

  const Dashboard = DASHBOARD_MAP[profile.tipo] ?? ColaboradorDashboard;

  return <Dashboard profile={profile} company={company} theme={theme} />;
}
