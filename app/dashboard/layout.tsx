// app/dashboard/layout.tsx
// LAYOUT SIMPLES - SEM THEMECONTEXT

import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}