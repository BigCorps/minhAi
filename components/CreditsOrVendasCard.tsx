'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { CreditsCard } from './CreditsCard';
import { VendasCard } from './VendasCard';

export function CreditsOrVendasCard({ userId }: { userId: string }) {
  const { selectedAssistantId } = useAssistant();
  const [assistantType, setAssistantType] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAssistantId) {
      setAssistantType(null);
      return;
    }
    supabase
      .from('companies')
      .select('assistant_type')
      .eq('id', selectedAssistantId)
      .single()
      .then(({ data }) => setAssistantType(data?.assistant_type ?? 'smart'));
  }, [selectedAssistantId]);

  if (assistantType === 'vendas' && selectedAssistantId) {
    return <VendasCard companyId={selectedAssistantId} />;
  }

  return <CreditsCard userId={userId} />;
}
