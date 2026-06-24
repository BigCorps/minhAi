'use client';

// app/lead/[token]/email/EmailStepClient.tsx
//
// Interatividade do Passo 2. Fluxo:
// 1. Lead informa e-mail
// 2. POST /api/demo/email (rota Next.js — não chama a Edge Function
//    direto do client, para manter o padrão de isolamento server-side
//    já usado em todo o funil, e para poder validar/persistir o
//    e-mail em demo_sessions antes de disparar o envio)
// 3. Após sucesso: 2 botões lado a lado (continuar para WhatsApp |
//    banner de cadastro), mesmo padrão do Passo 1.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadDemoHeader } from '@/components/LeadDemo/LeadDemoHeader';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

interface EmailStepClientProps {
  token: string;
  nomeNegocio: string;
  produto: string;
  preco: number;
  ramo: string;
  nomeLead: string | null;
  horarioMarcado: string | null;
  emailJaInformado: string | null;
}

export default function EmailStepClient({
  token,
  nomeNegocio,
  produto,
  preco,
  ramo,
  nomeLead,
  horarioMarcado,
  emailJaInformado,
}: EmailStepClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState(emailJaInformado ?? '');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(!!emailJaInformado);
  const [error, setError] = useState<string | null>(null);

  const tipoObjetivo: 'pedido' | 'horario' = ['clinica', 'servicos', 'academia'].includes(ramo)
    ? 'horario'
    : 'pedido';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao enviar e-mail.');
      }

      setSent(true);
    } catch (err: any) {
      console.error('[EmailStepClient] Erro:', err);
      setError(err.message || 'Algo deu errado. Pode tentar de novo?');
    } finally {
      setIsSending(false);
    }
  };

  const handleContinuarWhatsapp = () => {
    router.push(`/lead/${token}/whatsapp`);
  };

  const handleCriarAssistente = () => {
    router.push(`/cadastro?demo=${token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <LeadDemoHeader nomeNegocio={nomeNegocio} />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center">
          {!sent ? (
            <>
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Quer ver como fica a confirmação no seu e-mail?
              </h2>
              <p className="text-sm text-white/50 mb-6">
                {tipoObjetivo === 'pedido'
                  ? `Vamos simular o e-mail de confirmação do pedido de "${produto}" que seus clientes receberiam.`
                  : `Vamos simular o e-mail de confirmação do agendamento de "${produto}" que seus clientes receberiam.`}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button
                  type="submit"
                  disabled={isSending || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-semibold transition-colors"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar confirmação'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">E-mail enviado!</h2>
              <p className="text-sm text-white/50 mb-6">
                Confira sua caixa de entrada ({email}). Pode levar alguns instantes para chegar.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleContinuarWhatsapp}
                  className="w-full px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
                >
                  Testar também no WhatsApp
                </button>
                <button
                  onClick={handleCriarAssistente}
                  className="w-full px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold transition-colors"
                >
                  Gostei! Criar meu assistente agora
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}