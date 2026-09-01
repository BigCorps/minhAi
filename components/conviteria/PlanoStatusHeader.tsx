'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function PlanoStatusHeader() {
  const [dados, setDados] = useState<{
    ativo?: boolean;
    diasRestantes?: number;
  } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const sb = createClient();
      const sessao = (await sb.auth.getSession()).data.session;
      if (!sessao?.access_token) return;

      const r = await fetch('/api/conviteria/plano', {
        headers: { Authorization: `Bearer ${sessao.access_token}` },
      });

      if (!r.ok) return;
      const d = await r.json();
      setDados(d);
    } catch {
      // O botão continua utilizável como "Planos" mesmo se o status falhar.
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ativo = Boolean(dados?.ativo);
  const dias = Math.max(0, Number(dados?.diasRestantes ?? 0));

  function abrirPlano() {
    document.getElementById('plano-mensal')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <button
      type="button"
      onClick={abrirPlano}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium"
      style={{ borderColor: '#c0607844', color: '#7c5560', backgroundColor: '#fff' }}
      title={ativo ? `Plano mensal ativo — ${dias} dias restantes` : 'Ver planos'}
    >
      <CalendarClock className="h-4 w-4" />
      <span>{ativo ? `${dias} dia${dias === 1 ? '' : 's'}` : 'Planos'}</span>
    </button>
  );
}
