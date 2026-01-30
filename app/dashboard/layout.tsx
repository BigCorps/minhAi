// app/(dashboard)/layout.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
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
    <ThemeProvider>
      <DashboardWrapper user={user}>
        {children}
      </DashboardWrapper>
    </ThemeProvider>
  );
}