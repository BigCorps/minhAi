'use client';
// ARQUIVO: app/dashboard/atendimentos/page.tsx
import { useState, useEffect } from 'react';
import { ConnectionManager } from './_components/ConnectionManager';
import { QuickActionsPanel } from './_components/QuickActionsPanel';
import { createClient } from '@/lib/supabase-browser';

export default function AtendimentosPage() {
  const supabase = createClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('companies')
        .select('id').eq('user_id', user.id).eq('is_active', true).order('name').limit(1);
      if (data?.[0]) setSelectedCompanyId(data[0].id);
    }
    load();
  }, []);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Serviços Meta</h1>
        <p className="text-muted-foreground mt-1">
          Configure seus assistentes ao WhatsApp, Instagram e Facebook.
        </p>
      </div>
      <div className="space-y-6">
        <ConnectionManager onCompanyChange={setSelectedCompanyId} />
        <QuickActionsPanel selectedCompanyId={selectedCompanyId} />
      </div>
    </div>
  );
}
