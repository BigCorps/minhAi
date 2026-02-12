// components/CreditsProgressChartWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const CreditsProgressChart = dynamic(
  () => import('./CreditsProgressChart').then(mod => ({ default: mod.CreditsProgressChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    ),
  }
);

export function CreditsProgressChartWrapper({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return <CreditsProgressChart userId={userId} />;
}