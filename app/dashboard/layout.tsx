// app/dashboard/layout.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

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

  // Retorna apenas os filhos, sem wrappers de contexto de tema
  return (
    <>
      {children}
    </>
  );
}
