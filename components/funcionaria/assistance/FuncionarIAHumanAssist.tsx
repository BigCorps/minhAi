'use client';

import { AlertCircle, Bell, Check, Loader2, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  companyId: string;
  reason?: string;
  onClose: () => void;
  playText?: (text: string) => Promise<void>;
};

export default function FuncionarIAHumanAssist({ companyId, reason = '', onClose, playText }: Props) {
  const [motivo, setMotivo] = useState(reason);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [managerName, setManagerName] = useState('Responsável');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setNotifyEmail(false);
      setNotifySms(false);
      try {
        const response = await fetch(`/api/public/manager-assistance?company_id=${encodeURIComponent(companyId)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error('configuration_unavailable');
        if (!active) return;
        setManagerName(data.manager_name || 'Responsável');
        setNotifyEmail(data.channels?.email === true);
        setNotifySms(data.channels?.sms === true);
      } catch {
        if (active) setNotice({ type: 'error', text: 'Não foi possível carregar os canais do responsável.' });
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [companyId]);

  async function send() {
    if (!motivo.trim()) {
      setNotice({ type: 'error', text: 'Descreva brevemente o motivo da chamada.' });
      return;
    }
    if (!notifyEmail && !notifySms) {
      setNotice({ type: 'error', text: 'Nenhum canal de aviso está configurado para o responsável.' });
      return;
    }

    setSending(true);
    setNotice(null);
    try {
      const response = await fetch('/api/public/manager-assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, reason: motivo.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.notified?.length) {
        const messages: Record<string, string> = {
          rate_limited: 'Limite temporário de notificações atingido. Tente novamente mais tarde.',
          no_channel: 'Nenhum canal de aviso está configurado para o responsável.',
          insufficient_credits: 'Créditos de uso insuficientes para SMS.',
          reason_too_long: 'O motivo deve ter no máximo 500 caracteres.',
        };
        throw new Error(messages[data.reason] || 'Não foi possível notificar o responsável.');
      }
      const channels = data.notified.map((channel: string) => channel === 'sms' ? 'SMS' : 'e-mail');
      const text = `Responsável notificado via ${channels.join(' e ')}.`;
      setNotice({ type: 'success', text });
      if (playText) await playText('Responsável notificado com sucesso.');
      setTimeout(onClose, 1400);
    } catch (error: any) {
      const text = error?.message || 'Não foi possível notificar o responsável.';
      setNotice({ type: 'error', text });
      if (playText) await playText('Não foi possível notificar o responsável agora.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-[#6D28D9]"><Bell className="h-5 w-5" /></div>
            <div><h2 className="font-black">Chamar responsável</h2><p className="text-xs font-semibold text-slate-400">FuncionarIA</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={sending} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="py-8 text-center text-sm font-bold text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando contato…</div>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">Responsável</div>
                <div className="mt-1 font-black">{managerName}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[notifyEmail ? 'E-mail' : null, notifySms ? 'SMS' : null].filter(Boolean).join(' + ') || 'Contato não configurado'}
                </div>
              </div>

              <div>
                <label className="text-sm font-black">Como podemos ajudar?</label>
                <textarea
                  value={motivo}
                  onChange={event => setMotivo(event.target.value)}
                  rows={4}
                  maxLength={500}
                  disabled={sending}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-300"
                  placeholder="Ex.: preciso de ajuda com meu pagamento"
                />
              </div>

              {notice && (
                <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-bold ${notice.type === 'success' ? 'bg-lime-50 text-lime-800' : 'bg-amber-50 text-amber-800'}`}>
                  {notice.type === 'success' ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{notice.text}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !motivo.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6D28D9] px-5 py-3.5 text-sm font-black text-white disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Notificando…' : 'Notificar responsável'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
