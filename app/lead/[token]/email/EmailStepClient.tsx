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
//
// ATUALIZAÇÃO: tema dinâmico via next-themes (mesmo padrão de
// LeadDemoHeader/app/lead/page.tsx). A escolha já persiste entre
// páginas automaticamente via localStorage (comportamento padrão do
// next-themes) — não precisa de nenhuma lógica extra de propagação,
// só consultar useTheme() aqui também, que antes não era feito.
// Botão de troca de tema adicionado no canto superior do card,
// mesma posição relativa usada em app/lead/page.tsx.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LeadDemoHeader } from '@/components/LeadDemo/LeadDemoHeader';
import { Loader2, Mail, CheckCircle2, Sun, Moon } from 'lucide-react';

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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') !== 'light' : true;

  const handleToggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

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
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
    }`}>
      <LeadDemoHeader nomeNegocio={nomeNegocio} />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className={`w-full max-w-md rounded-3xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center transition-colors duration-300 ${
          isDark ? 'border-white/10 bg-slate-900/50' : 'border-black/10 bg-white/70'
        }`}>
          {/* Botão de tema — mesma posição relativa usada em app/lead/page.tsx */}
          <div className="flex justify-start mb-2">
            <button
              onClick={handleToggleTheme}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-black/5 hover:bg-black/10 text-gray-600'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {!sent ? (
            <>
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Quer ver como fica a confirmação no seu e-mail?
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
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
                  className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 shadow-sm'
                  }`}
                />
                {error && (
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
                )}
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
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                E-mail enviado!
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
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
                  className={`w-full px-6 py-3 rounded-xl border font-semibold transition-colors ${
                    isDark
                      ? 'border-white/20 hover:bg-white/10 text-white'
                      : 'border-black/20 hover:bg-black/5 text-gray-900'
                  }`}
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