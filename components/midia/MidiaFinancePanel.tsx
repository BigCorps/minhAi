'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Banknote, Clock3, Loader2, Send, WalletCards } from 'lucide-react';
import { formatBrlCents, MIDIA_BRAND } from '@/lib/midia/constants';

export type MidiaFinanceState = {
  wallet: {
    pendingCents: number;
    availableCents: number;
    withdrawalPendingCents: number;
    withdrawnCents: number;
    totalEarnedCents: number;
  };
  payoutProfile: null | {
    id: string;
    fullName: string;
    documentType: 'cpf' | 'cnpj';
    documentFinal: string;
    email: string;
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    verified: boolean;
  };
  withdrawals: Array<{
    id: string;
    amountCents: number;
    status: string;
    error: string | null;
    requestedAt: string;
    processedAt: string | null;
    completedAt: string | null;
  }>;
  ledger: Array<{
    id: string;
    campaignId: string | null;
    occurrenceId: string | null;
    withdrawalId: string | null;
    entryType: string;
    pendingDeltaCents: number;
    availableDeltaCents: number;
    withdrawalDeltaCents: number;
    withdrawnDeltaCents: number;
    description: string;
    createdAt: string;
  }>;
  withdrawalMinimumCents: number;
};

export default function MidiaFinancePanel({ finance, onChanged }: { finance: MidiaFinanceState; onChanged: () => Promise<void> }) {
  const profile = finance.payoutProfile;
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [pixKey, setPixKey] = useState(profile?.pixKey ?? '');
  const [pixKeyType, setPixKeyType] = useState(profile?.pixKeyType ?? 'random');
  const [amount, setAmount] = useState((finance.wallet.availableCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.fullName ?? '');
    setEmail(profile?.email ?? '');
    setPixKey(profile?.pixKey ?? '');
    setPixKeyType(profile?.pixKeyType ?? 'random');
    setAmount((finance.wallet.availableCents / 100).toFixed(2));
  }, [finance.wallet.availableCents, profile?.email, profile?.fullName, profile?.pixKey, profile?.pixKeyType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    try {
      const amountCents = Math.round(Number(String(amount).replace(',', '.')) * 100);
      const response = await fetch('/api/midia/withdrawals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, document, email, pixKey, pixKeyType, amountCents }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Não foi possível solicitar o saque.');
      setMessage(json?.message || 'Saque solicitado com sucesso.');
      setDocument('');
      await onChanged();
    } catch (err: any) { setError(err?.message || 'Não foi possível solicitar o saque.'); }
    finally { setBusy(false); }
  }

  const openWithdrawal = finance.withdrawals.find((item) => ['pending','processing'].includes(item.status));

  return (
    <section className="mt-8 rounded-[30px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50" style={{ color: MIDIA_BRAND.blue }}><WalletCards className="h-5 w-5" /></div><div><div className="text-xs font-black uppercase tracking-[.16em]" style={{ color: MIDIA_BRAND.blue }}>Financeiro</div><h2 className="mt-1 text-xl font-black">Receita das suas telas</h2><p className="mt-1 text-sm text-slate-500">A participação fica pendente quando a campanha é contratada e só vira saldo disponível depois do proof-of-play validado.</p></div></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Money value={finance.wallet.availableCents} label="Disponível" strong />
        <Money value={finance.wallet.pendingCents} label="Aguardando exibição" />
        <Money value={finance.wallet.withdrawalPendingCents} label="Em saque" />
        <Money value={finance.wallet.totalEarnedCents} label="Total liberado" />
        <Money value={finance.wallet.withdrawnCents} label="Já repassado" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <form onSubmit={submit} className="rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-2"><Banknote className="h-5 w-5" style={{ color: MIDIA_BRAND.red }} /><h3 className="font-black">Solicitar saque PIX</h3></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Mínimo de {formatBrlCents(finance.withdrawalMinimumCents)}. Enquanto houver um saque pendente ou em processamento, um novo pedido fica bloqueado.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-black text-slate-600">Titular<input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" placeholder="Nome completo / razão social" /></label>
            <label className="text-xs font-black text-slate-600">CPF ou CNPJ<input value={document} onChange={(e) => setDocument(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" placeholder={profile ? `Cadastrado · final ${profile.documentFinal}` : 'Documento do titular'} /></label>
            <label className="text-xs font-black text-slate-600">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" placeholder="financeiro@empresa.com" /></label>
            <label className="text-xs font-black text-slate-600">Tipo da chave PIX<select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Chave aleatória</option></select></label>
          </div>
          <label className="mt-3 block text-xs font-black text-slate-600">Chave PIX<input value={pixKey} onChange={(e) => setPixKey(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" /></label>
          <label className="mt-3 block text-xs font-black text-slate-600">Valor do saque (R$)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold" /></label>
          {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}
          {message && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</div>}
          <button disabled={busy || !!openWithdrawal || finance.wallet.availableCents < finance.withdrawalMinimumCents} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-40" style={{ backgroundColor: MIDIA_BRAND.blue }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{openWithdrawal ? 'Saque já em andamento' : 'Solicitar saque'}</button>
        </form>

        <div className="rounded-3xl border border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-slate-500" /><h3 className="font-black">Histórico recente</h3></div>
          <div className="mt-4 space-y-2">
            {finance.withdrawals.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">Nenhum saque solicitado ainda.</div> : finance.withdrawals.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div><div className="text-sm font-black">{formatBrlCents(item.amountCents)}</div><div className="mt-1 text-[11px] font-semibold text-slate-400">{new Date(item.requestedAt).toLocaleString('pt-BR')}</div>{item.error && <div className="mt-1 text-[11px] font-bold text-red-600">{item.error}</div>}</div><WithdrawalStatus status={item.status} /></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Money({ value, label, strong = false }: { value: number; label: string; strong?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${strong ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}><div className="text-xl font-black" style={{ color: strong ? MIDIA_BRAND.blue : MIDIA_BRAND.ink }}>{formatBrlCents(value)}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div></div>;
}

function WithdrawalStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800' },
    processing: { label: 'Processando', cls: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Pago', cls: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'Rejeitado', cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelado', cls: 'bg-slate-200 text-slate-700' },
  };
  const item = map[status] || { label: status, cls: 'bg-slate-200 text-slate-700' };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.cls}`}>{item.label}</span>;
}
