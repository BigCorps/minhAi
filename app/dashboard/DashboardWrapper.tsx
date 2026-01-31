// app/(dashboard)/DashboardWrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

interface DashboardWrapperProps {
  user: any;
  children: React.ReactNode;
}

function DashboardContent({ user, children }: DashboardWrapperProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Renderiza placeholder durante SSR
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-16 bg-slate-800 rounded mb-4"></div>
            <div className="h-32 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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

export function DashboardWrapper({ user, children }: DashboardWrapperProps) {
  return (
    <ThemeProvider>
      <DashboardContent user={user}>
        {children}
      </DashboardContent>
    </ThemeProvider>
  );
}