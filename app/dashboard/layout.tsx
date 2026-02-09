// app/dashboard/layout.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Busca o usuário na sessão do servidor
  const user = await getUser();
  
  // Proteção de rota: se não houver usuário logado, joga para o login
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      {/* Header fixo para TODAS as páginas do dashboard */}
      <DashboardHeader user={user} />
      
      {/* Conteúdo das páginas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}