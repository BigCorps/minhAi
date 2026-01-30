// app/(dashboard)/layout.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardWrapper } from './DashboardWrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardWrapper user={user}>
      {children}
    </DashboardWrapper>
  );
}