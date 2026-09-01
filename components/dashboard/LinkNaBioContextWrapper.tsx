// components/dashboard/LinkNaBioContextWrapper.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAssistant } from '@/contexts/AssistantContext';
import { createClient } from '@/lib/supabase-browser';
import LinkNaBioModalWrapper from './LinkNaBioModalWrapper';

interface AssistantLinkData {
  id: string;
  slug: string;
  modo_links_enabled: boolean;
}

export default function LinkNaBioContextWrapper() {
  const { selectedAssistantId } = useAssistant();
  const [data, setData] = useState<AssistantLinkData | null>(null);

  useEffect(() => {
    if (!selectedAssistantId) { setData(null); return; }

    const supabase = createClient();
    supabase
      .from('companies')
      .select('id, slug, modo_links_enabled, assistant_type')
      .eq('id', selectedAssistantId)
      .single()
      .then(({ data: company }) => {
        if (company && company.assistant_type !== 'vendas') setData({
          id: company.id,
          slug: company.slug,
          modo_links_enabled: company.modo_links_enabled ?? false,
        });
        else setData(null);
      });
  }, [selectedAssistantId]);

  if (!data) return null;

  return (
    <LinkNaBioModalWrapper
      companyId={data.id}
      slug={data.slug}
      initialEnabled={data.modo_links_enabled}
    />
  );
}
