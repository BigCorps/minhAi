'use client';

import { Loader2, Save, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDeliverySettings, saveDeliverySettings } from '@/lib/delivery-client';

type Settings = {
  delivery_enabled: boolean;
  delivery_auto_dispatch: boolean;
  delivery_who_pays: 'cliente' | 'empresa';
  delivery_pickup_address: string;
  delivery_pickup_phone: string;
  delivery_max_radius_km: number | null;
  delivery_min_order_cents: number;
  delivery_message: string;
  delivery_schedule: Record<string, { enabled: boolean; open: string; close: string }>;
};

const EMPTY: Settings = {
  delivery_enabled: false,
  delivery_auto_dispatch: true,
  delivery_who_pays: 'cliente',
  delivery_pickup_address: '',
  delivery_pickup_phone: '',
  delivery_max_radius_km: null,
  delivery_min_order_cents: 0,
  delivery_message: '',
  delivery_schedule: {},
};

export default function FuncionarIADeliverySettings({ companyId }: { companyId: string }) {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getDeliverySettings(companyId);
        if (active && data?.settings) setSettings({ ...EMPTY, ...data.settings });
      } catch (error: any) {
        if (active) setNotice(error?.message || 'Não foi possível carregar a entrega.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const data = await saveDeliverySettings(companyId, settings);
      if (data?.settings) setSettings((current) => ({ ...current, ...data.settings }));
      setNotice('Configuração de entrega salva.');
    } catch (error: any) {
      const map: Record<string, string> = {
        pickup_address_required: 'Informe o endereço de coleta antes de ativar a entrega.',
        pickup_phone_required: 'Informe um telefone de coleta válido com DDD.',
      };
      setNotice(map[error?.message] || error?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]"><Truck className="h-4 w-4" /> Entrega local</div>
          <h2 className="mt-2 text-xl font-black">Lalamove integrada à loja</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">O cliente recebe a cotação em tempo real. O entregador só é chamado depois que o pedido estiver pago e confirmado no servidor.</p>
        </div>
        <button type="button" onClick={() => setSettings((s) => ({ ...s, delivery_enabled: !s.delivery_enabled }))} className={`relative h-7 w-12 rounded-full transition ${settings.delivery_enabled ? 'bg-lime-500' : 'bg-slate-300'}`} aria-label="Ativar entrega">
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${settings.delivery_enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {settings.delivery_enabled && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black text-slate-700">Endereço de coleta
            <input value={settings.delivery_pickup_address} onChange={(e) => setSettings((s) => ({ ...s, delivery_pickup_address: e.target.value }))} placeholder="Rua, número, bairro, cidade" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
          </label>
          <label className="text-sm font-black text-slate-700">Telefone de coleta
            <input value={settings.delivery_pickup_phone} onChange={(e) => setSettings((s) => ({ ...s, delivery_pickup_phone: e.target.value }))} placeholder="(11) 99999-9999" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
          </label>
          <label className="text-sm font-black text-slate-700">Raio máximo (km)
            <input type="number" min="1" max="300" value={settings.delivery_max_radius_km ?? ''} onChange={(e) => setSettings((s) => ({ ...s, delivery_max_radius_km: e.target.value ? Number(e.target.value) : null }))} placeholder="Sem limite" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
          </label>
          <label className="text-sm font-black text-slate-700">Pedido mínimo (R$)
            <input type="number" min="0" step="0.01" value={(settings.delivery_min_order_cents || 0) / 100} onChange={(e) => setSettings((s) => ({ ...s, delivery_min_order_cents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-300" />
          </label>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-black">Quem paga o frete?</div>
            <div className="mt-3 flex gap-2">
              {(['cliente','empresa'] as const).map((value) => (
                <button key={value} type="button" onClick={() => setSettings((s) => ({ ...s, delivery_who_pays: value }))} className={`rounded-xl border px-3 py-2 text-xs font-black ${settings.delivery_who_pays === value ? 'border-[#6D28D9] bg-violet-50 text-[#6D28D9]' : 'border-slate-200 text-slate-500'}`}>
                  {value === 'cliente' ? 'Cliente paga' : 'Empresa paga'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-black">Despacho automático</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Quando ativo, a Lalamove é chamada automaticamente depois da confirmação real do pagamento.</p>
            <button type="button" onClick={() => setSettings((s) => ({ ...s, delivery_auto_dispatch: !s.delivery_auto_dispatch }))} className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${settings.delivery_auto_dispatch ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-600'}`}>
              {settings.delivery_auto_dispatch ? 'Automático' : 'Manual'}
            </button>
          </div>
        </div>
      )}

      {notice && <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{notice}</div>}
      <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar entrega
      </button>
    </section>
  );
}
