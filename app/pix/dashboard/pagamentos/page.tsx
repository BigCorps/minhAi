'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';
import PixPaymentModeSettings from '@/components/pix/PixPaymentModeSettings';

type Company = { id: string; name: string; plan_access: boolean; mp_connected: boolean; pix_key: string | null };

export default function PixWikiPagamentosPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [plan, setPlan] = useState<'free' | 'link' | 'pro'>('free');

  useEffect(() => {
    const savedTheme = localStorage.getItem('pixWikiTheme');
    setDark(savedTheme ? savedTheme !== 'light' : !window.matchMedia('(prefers-color-scheme: light)').matches);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/pix/login'); return; }
      const [{ data: list }, { data: ent }] = await Promise.all([
        supabase.rpc('pixwiki_list_my_companies'),
        supabase.rpc('pixwiki_my_entitlements'),
      ]);
      const rows = (list || []) as Company[];
      setCompanies(rows);
      const requested = new URL(window.location.href).searchParams.get('company') || localStorage.getItem('pixWikiActiveCompanyId');
      const selected = rows.find(c => c.id === requested) || rows.find((c: any) => c.is_primary) || rows[0] || null;
      setCompany(selected);
      if (selected) localStorage.setItem('pixWikiActiveCompanyId', selected.id);
      const e = Array.isArray(ent) ? ent[0] : ent;
      const effective = String(e?.effective_plan || e?.plan || 'free');
      setPlan(effective === 'pro' ? 'pro' : effective === 'link' ? 'link' : 'free');
      setLoading(false);
    })();
  }, [router, supabase]);

  function changeCompany(id: string) {
    const next = companies.find(c => c.id === id) || null;
    setCompany(next);
    if (next) {
      localStorage.setItem('pixWikiActiveCompanyId', next.id);
      const url = new URL(window.location.href);
      url.searchParams.set('company', next.id);
      window.history.replaceState({}, '', url.toString());
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('pixWikiTheme', dark ? 'dark' : 'light');
  }, [dark]);

  const page = dark ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900';
  const card = dark ? 'border-white/10 bg-white/[0.035]' : 'border-black/10 bg-white';
  const muted = dark ? 'text-white/50' : 'text-slate-500';

  if (loading) return <div className={`min-h-screen ${page} flex items-center justify-center`}>Carregando…</div>;

  return (
    <main className={`min-h-screen pb-28 ${page}`}>
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <PixWikiHeader plan={plan} dark={dark} onThemeChange={setDark} />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Pagamentos Pix</h1>
            <p className={`mt-1 text-sm ${muted}`}>Escolha a confirmação padrão de cada recebedor sem alterar o histórico ou a conta Mercado Pago.</p>
          </div>
          {companies.length > 1 && (
            <select value={company?.id || ''} onChange={e => changeCompany(e.target.value)} className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${card}`}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {company ? (
          <div className="mt-5 space-y-4">
            {!company.plan_access && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-300">Esta empresa está pausada pelo plano atual. A configuração fica preservada e volta a valer quando a empresa for reativada.</div>}
            <PixPaymentModeSettings companyId={company.id} product="pixwiki" />
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h2 className="font-black">Como os dois modos funcionam</h2>
              <div className={`mt-3 space-y-2 text-sm leading-6 ${muted}`}>
                <p><strong className={dark ? 'text-white' : 'text-slate-900'}>Pix Grátis:</strong> o dinheiro vai direto para sua chave. O PixWiki identifica o recebimento pela conta Mercado Pago conectada. O valor só muda em centavos quando há outra cobrança simultânea de mesmo valor.</p>
                <p><strong className={dark ? 'text-white' : 'text-slate-900'}>Pix pelo Mercado Pago:</strong> a cobrança é criada pelo próprio Mercado Pago e mantém o valor exato. Podem existir tarifas do provedor.</p>
                <p>As empresas que já usam o PixWiki não são migradas automaticamente. A mudança só acontece quando você salvar uma nova opção aqui.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`mt-5 rounded-2xl border p-6 ${card}`}>Nenhuma empresa PixWiki encontrada.</div>
        )}
      </div>
      <PixWikiDashboardNav dark={dark} />
    </main>
  );
}
