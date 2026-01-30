// app/(dashboard)/layout.tsx
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

// Client component separado para aplicar classes baseadas no tema
'use client';

import { useTheme } from '@/contexts/ThemeContext';

function DashboardWrapper({ user, children }: { user: any; children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'
    }`}>
      <DashboardHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}