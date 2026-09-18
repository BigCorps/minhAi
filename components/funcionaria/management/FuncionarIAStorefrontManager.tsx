'use client';

import { ExternalLink, Loader2, Package, ReceiptText, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { FuncionarIASettings, FuncionarIAPublicHomeMode } from '@/lib/funcionaria-skills';
import FuncionarIAProductsPanel from '@/components/funcionaria/management/FuncionarIAProductsPanel';
import FuncionarIAOrdersPanel from '@/components/funcionaria/management/FuncionarIAOrdersPanel';

type Tab = 'products' | 'orders';

export default function FuncionarIAStorefrontManager({
  companyId,
  slug,
  settings,
  onSaved,
}: {
  companyId: string;
  slug: string;
  settings: FuncionarIASettings;
  onSaved: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const workplace = settings.workplace_mode || 'ambos';
  const forcedStore = workplace === 'online' || workplace === 'ambos';
  const [enabled, setEnabled] = useState(forcedStore || settings.storefront_enabled === true);
  const [home, setHome] = useState<FuncionarIAPublicHomeMode>(
    workplace === 'online' ? 'store' : (settings.public_home_mode || 'assistant'),
  );
  const [tab, setTab] = useState<Tab>('products');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(nextEnabled = enabled, nextHome = home) {
    setSaving(true);
    setNotice(null);
    try {
      const { error } = await supabase.rpc('funcionaria_save_storefront_settings', {
        p_company_id: companyId,
        p_storefront_enabled: nextEnabled,
        p_public_home_mode: nextHome,
      });
      if (error) throw error;
      setEnabled(nextEnabled);
      setHome(nextHome);
      await onSaved();
      setNotice('Configuração da loja salva.');
      return true;
    } catch (error: any) {
      setNotice(error?.message || 'Não foi possível salvar a configuração.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleStorefront() {
    if (forcedStore || saving) return;
    const next = !enabled;
    const nextHome: FuncionarIAPublicHomeMode = next ? home : 'assistant';
    await save(next, nextHome);
  }

  async function chooseHome(next: FuncionarIAPublicHomeMode) {
    if (saving || workplace === 'online' || !enabled) return;
    await save(enabled, next);
  }

  const publicUrl = `https://${slug}.funcionaria.net`;
  const storeUrl = `${publicUrl}/vendas`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">
              <Store className="h-4 w-4" /> Loja incluída
            </div>
            <h2 className="mt-2 text-2xl font-black">Sua loja em {slug}.funcionaria.net</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Catálogo, carrinho e pedidos básicos fazem parte da base da FuncionarIA.
              Pagamentos online e entrega entram nas próximas etapas da Fase 7.
            </p>
          </div>
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white"
          >
            Abrir loja <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-black">Loja pública</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {forcedStore
                ? 'Ativa automaticamente para empresas online ou presenciais + online.'
                : 'No modo presencial você decide se também quer publicar a loja.'}
            </p>
            <button
              type="button"
              onClick={() => void toggleStorefront()}
              disabled={forcedStore || saving}
              className={`mt-3 rounded-xl px-4 py-2 text-xs font-black ${
                enabled ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-600'
              } disabled:cursor-default`}
            >
              {enabled ? 'Loja ativada' : 'Ativar loja'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-black">Página inicial pública</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {workplace === 'online'
                ? 'No modo online a loja é sempre a página principal.'
                : enabled
                  ? 'Escolha o que aparece primeiro; o visitante pode alternar sem perder o carrinho ou a conversa.'
                  : 'Ative a loja para liberar a escolha.'}
            </p>
            <div className="mt-3 flex gap-2">
              {(['assistant', 'store'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={saving || workplace === 'online' || !enabled}
                  onClick={() => void chooseHome(value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black ${
                    home === value ? 'border-[#6D28D9] bg-violet-50 text-[#6D28D9]' : 'border-slate-200 text-slate-500'
                  } disabled:opacity-50`}
                >
                  {value === 'assistant' ? 'FuncionarIA primeiro' : 'Loja primeiro'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            {saving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            {notice}
          </div>
        )}
      </section>

      {enabled ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
                tab === 'products' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Package className="h-4 w-4" /> Produtos
            </button>
            <button
              type="button"
              onClick={() => setTab('orders')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
                tab === 'orders' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              <ReceiptText className="h-4 w-4" /> Pedidos
            </button>
          </div>

          <div className={tab === 'products' ? 'block' : 'hidden'}>
            <FuncionarIAProductsPanel companyId={companyId} />
          </div>
          <div className={tab === 'orders' ? 'block' : 'hidden'}>
            <FuncionarIAOrdersPanel companyId={companyId} />
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-400">
          A loja está desligada para esta FuncionarIA presencial.
        </div>
      )}
    </div>
  );
}
