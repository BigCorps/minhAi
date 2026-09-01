'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';

const CreditsProgressChart = dynamic(
  () => import('./CreditsProgressChart').then(mod => ({ default: mod.CreditsProgressChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

const VendasProgressChart = dynamic(
  () => import('./VendasProgressChart').then(mod => ({ default: mod.VendasProgressChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  );
}

export function CreditsProgressChartWrapper({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);
  const [isVendas, setIsVendas] = useState(false);
  const { selectedAssistantId } = useAssistant();
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!selectedAssistantId) { setIsVendas(false); return; }
    supabase
      .from('companies')
      .select('assistant_type')
      .eq('id', selectedAssistantId)
      .single()
      .then(({ data }) => setIsVendas(data?.assistant_type === 'vendas'));
  }, [selectedAssistantId]);

  if (!mounted) return <ChartSkeleton />;

  if (isVendas && selectedAssistantId) {
    return <VendasProgressChart companyId={selectedAssistantId} />;
  }

  return <CreditsProgressChart userId={userId} />;
}
