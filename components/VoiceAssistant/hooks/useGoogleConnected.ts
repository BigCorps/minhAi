// hooks/useGoogleConnected.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function useGoogleConnected(companyId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('google_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setIsConnected(!!data);
        setLoading(false);
      });
  }, [companyId]);

  return { isConnected, loading };
}
