'use client';

interface DashboardProps {
  profile: any;
  company: any;
  theme: 'dark' | 'light';
}

export default function ColaboradorDashboard({ profile, company, theme }: DashboardProps) {
  const isDark = theme === 'dark';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
        >
          Painel de Colaborador
        </h1>
        <p
          className="text-lg"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          Bem-vindo, {profile.nome}
        </p>
      </div>

      <div
        className="rounded-2xl p-8 shadow-lg border text-center"
        style={{
          background: isDark
            ? 'rgba(30, 41, 59, 0.8)'
            : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark
            ? 'rgba(148, 163, 184, 0.1)'
            : 'rgba(203, 213, 225, 0.3)',
        }}
      >
        <div className="text-6xl mb-4">👷</div>
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)' }}
        >
          Dashboard em Desenvolvimento
        </h2>
        <p
          className="text-lg"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          Funcionalidades específicas para colaboradores serão adicionadas em breve.
        </p>
      </div>
    </div>
  );
}
