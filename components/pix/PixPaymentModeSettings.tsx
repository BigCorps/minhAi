'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

type Product = 'pixwiki' | 'minhai' | 'funcionaria';
type Mode = 'free' | 'mercadopago';

type Settings = {
  has_access: boolean;
  can_write: boolean;
  has_pix_key: boolean;
  has_mp_connection: boolean;
  current_mode: Mode;
  merchant_city: string | null;
  allow_payer_choice: boolean;
};

interface Props {
  companyId: string;
  product: Product;
  compact?: boolean;
  onSaved?: (mode: Mode) => void;
}

const productNames: Record<Product, string> = {
  pixwiki: 'PixWiki',
  minhai: 'minhAi',
  funcionaria: 'FuncionarIA',
};

export default function PixPaymentModeSettings({ companyId, product, compact = false, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<Mode>('mercadopago');
  const [allowChoice, setAllowChoice] = useState(false);
  const [merchantCity, setMerchantCity] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('pix_payment_mode_settings', {
      p_company_id: companyId,
      p_product: product,
    });
    if (rpcError) {
      setError('Não foi possível carregar a configuração do Pix.');
      setLoading(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.has_access) {
      setError('Você não tem acesso às configurações de pagamento desta empresa.');
      setLoading(false);
      return;
    }
    const normalized: Settings = {
      has_access: !!row.has_access,
      can_write: !!row.can_write,
      has_pix_key: !!row.has_pix_key,
      has_mp_connection: !!row.has_mp_connection,
      current_mode: row.current_mode === 'free' ? 'free' : 'mercadopago',
      merchant_city: row.merchant_city || null,
      allow_payer_choice: !!row.allow_payer_choice,
    };
    setSettings(normalized);
    setMode(normalized.current_mode);
    setAllowChoice(normalized.allow_payer_choice);
    setMerchantCity(normalized.merchant_city || '');
    setLoading(false);
  }

  useEffect(() => { void load(); }, [companyId, product]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!settings?.can_write) return;
    setSaving(true);
    setError('');
    setNotice('');
    const { error: rpcError } = await supabase.rpc('pix_payment_mode_set', {
      p_company_id: companyId,
      p_product: product,
      p_mode: mode,
      p_merchant_city: merchantCity.trim() || null,
      p_allow_payer_choice: product === 'pixwiki' ? allowChoice : false,
    });
    if (rpcError) {
      const message = String(rpcError.message || '');
      if (message.includes('pix_key_required')) setError('Cadastre uma chave Pix antes de ativar o Pix Grátis.');
      else if (message.includes('mp_connection_required')) setError('Conecte o Mercado Pago antes de ativar esta forma de confirmação.');
      else if (message.includes('forbidden')) setError('Somente o proprietário ou um gerente pode alterar esta configuração.');
      else setError('Não foi possível salvar a forma de confirmação do Pix.');
      setSaving(false);
      return;
    }
    setNotice('Forma de confirmação atualizada.');
    onSaved?.(mode);
    await load();
    setNotice('Forma de confirmação atualizada.');
    setSaving(false);
  }

  if (loading) return <div className="rounded-2xl border border-black/10 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-white/50">Carregando formas de Pix…</div>;
  if (!settings) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error || 'Configuração indisponível.'}</div>;

  const readiness = settings.has_pix_key && settings.has_mp_connection;

  return (
    <div className={`rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-slate-900 ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">Forma de confirmação do Pix</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50">Escolha como o {productNames[product]} identifica o pagamento.</p>
        </div>
        <div className="flex gap-2 text-[10px] font-black">
          <span className={`rounded-full px-2 py-1 ${settings.has_pix_key ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{settings.has_pix_key ? 'CHAVE PIX OK' : 'FALTA CHAVE PIX'}</span>
          <span className={`rounded-full px-2 py-1 ${settings.has_mp_connection ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{settings.has_mp_connection ? 'MERCADO PAGO OK' : 'CONECTE O MP'}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => settings.can_write && setMode('free')} className={`rounded-2xl border p-4 text-left transition ${mode === 'free' ? 'border-emerald-500 bg-emerald-500/10' : 'border-black/10 dark:border-white/10'} ${!settings.can_write ? 'cursor-not-allowed opacity-60' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-black text-slate-900 dark:text-white">Pix Grátis</div>
            <span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-black text-slate-950">RECOMENDADO</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/55">Confirmação automática sem tarifa de cobrança do motor Pix. Se houver pagamentos simultâneos com o mesmo valor, pode aplicar um desconto de R$ 0,01 a R$ 0,10 para identificar com segurança.</p>
        </button>

        <button type="button" onClick={() => settings.can_write && setMode('mercadopago')} className={`rounded-2xl border p-4 text-left transition ${mode === 'mercadopago' ? 'border-sky-500 bg-sky-500/10' : 'border-black/10 dark:border-white/10'} ${!settings.can_write ? 'cursor-not-allowed opacity-60' : ''}`}>
          <div className="font-black text-slate-900 dark:text-white">Pix pelo Mercado Pago</div>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/55">Cobrança identificada diretamente pelo Mercado Pago, sem ajuste no valor. Sujeita às tarifas e condições do Mercado Pago.</p>
        </button>
      </div>

      {mode === 'free' && !readiness && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          <p>O Pix Grátis só pode ser ativado depois que a chave Pix e a conexão Mercado Pago estiverem prontas.</p>
          <button type="button" onClick={() => void load()} className="mt-2 font-black underline underline-offset-2">Verificar novamente</button>
        </div>
      )}

      {product === 'pixwiki' && (
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
          <input type="checkbox" checked={allowChoice} onChange={e => settings.can_write && setAllowChoice(e.target.checked)} disabled={!settings.can_write} className="mt-0.5 h-4 w-4 accent-emerald-500" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Permitir que o pagador escolha</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-white/50">Quando ativado, a página pública oferece Pix Grátis e Pix pelo Mercado Pago. A opção acima continua sendo a padrão.</span>
          </span>
        </label>
      )}

      {mode === 'free' && (
        <label className="mt-4 block">
          <span className="text-xs font-bold text-slate-600 dark:text-white/60">Cidade do recebedor no QR Pix</span>
          <input value={merchantCity} onChange={e => setMerchantCity(e.target.value)} disabled={!settings.can_write} maxLength={15} placeholder="SAO PAULO" className="mt-1 w-full rounded-xl border border-black/10 bg-transparent px-3 py-2.5 text-sm uppercase outline-none focus:border-emerald-500 dark:border-white/10" />
        </label>
      )}

      {(notice || error) && <div className={`mt-4 rounded-xl px-3 py-2 text-xs ${error ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{error || notice}</div>}

      {settings.can_write && (
        <button type="button" onClick={save} disabled={saving || (mode === 'free' && !readiness)} className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar forma de Pix'}</button>
      )}
    </div>
  );
}
