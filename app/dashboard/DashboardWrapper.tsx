// app/(dashboard)/DashboardWrapper.tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

interface DashboardWrapperProps {
  user: any;
  children: React.ReactNode;
}

export function DashboardWrapper({ user, children }: DashboardWrapperProps) {
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