'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import SlugHeader from '@/components/slug/SlugHeader';
import SlugFooter from '@/components/slug/SlugFooter';
import CategoryCarousel from '@/components/CategoryCarousel';

// Importações dinâmicas dos dashboards
import dynamic from 'next/dynamic';

const ClienteDashboard = dynamic(
  () => import('@/components/cliente/dashboards/ClienteDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const ColaboradorDashboard = dynamic(
  () => import('@/components/cliente/dashboards/ColaboradorDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const TotemDashboard = dynamic(
  () => import('@/components/cliente/dashboards/TotemDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const GerenteDashboard = dynamic(
  () => import('@/components/cliente/dashboards/GerenteDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const FrentistaDashboard = dynamic(
  () => import('@/components/cliente/dashboards/FrentistaDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const AtendenteDashboard = dynamic(
  () => import('@/components/cliente/dashboards/AtendenteDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

const CaixaDashboard = dynamic(
  () => import('@/components/cliente/dashboards/CaixaDashboard'),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

interface ClientePageProps {
  company: any;
}

// Skeleton de carregamento
function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

export default function ClientePage({ company }: ClientePageProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { profile, logout } = useProfile(company.slug);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redireciona se não estiver logado
  useEffect(() => {
    if (mounted && !profile) {
      router.push(`/ia/${company.slug}`);
    }
  }, [mounted, profile, router, company.slug]);

  if (!mounted || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const isDark = theme === 'dark';

  // Mapeia profile_type para componente de dashboard
  const renderDashboard = () => {
    switch (profile.profile_type) {
      case 'cliente':
        return <ClienteDashboard profile={profile} company={company} theme={theme} />;
      
      case 'colaborador':
        return <ColaboradorDashboard profile={profile} company={company} theme={theme} />;
      
      case 'totem':
        return <TotemDashboard profile={profile} company={company} theme={theme} />;
      
      case 'gerente':
        return <GerenteDashboard profile={profile} company={company} theme={theme} />;
      
      case 'frentista':
        return <FrentistaDashboard profile={profile} company={company} theme={theme} />;
      
      case 'atendente':
        return <AtendenteDashboard profile={profile} company={company} theme={theme} />;
      
      case 'caixa':
        return <CaixaDashboard profile={profile} company={company} theme={theme} />;
      
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className={`text-lg ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Tipo de perfil não reconhecido: {profile.profile_type}
            </p>
            <button
              onClick={() => logout()}
              className="px-6 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Fazer Logout
            </button>
          </div>
        );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: isDark
          ? 'linear-gradient(to bottom, rgb(15, 23, 42), rgb(30, 41, 59))'
          : 'linear-gradient(to bottom, rgb(248, 250, 252), rgb(241, 245, 249))',
      }}
    >
      {/* Header com botões de navegação */}
      <SlugHeader
        company={company}
        slug={company.slug}
        pageType="cliente"
        theme={theme}
        modo_vendas_enabled={company.modo_vendas_enabled ?? true}
        modo_fila_enabled={company.modo_fila_enabled ?? false}
      />

      {/* Dashboard principal (baseado em profile_type) */}
      <main className="flex-1 w-full">
        {renderDashboard()}
      </main>

      {/* Carousel de funções */}
      <CategoryCarousel
        companyId={company.id}
        onFunctionClick={(functionKey) => {
          console.log('Função clicada:', functionKey);
          // TODO: Implementar handlers de função
        }}
        theme={theme}
        hideDisabledFunctions={false}
        autoScroll={true}
      />

      {/* Footer */}
      <SlugFooter
        slug={company.slug}
        theme={theme}
        assistantRole={company.assistant_role}
        companyId={company.id}
      />
    </div>
  );
}
