'use client';

// app/lead/[token]/whatsapp/WhatsappStepClient.tsx
//
// Captura o telefone do lead, persiste via /api/demo/whatsapp, e
// mostra o botão/link wa.me com mensagem pré-preenchida. Número real
// confirmado pelo usuário: 551139519468 (conexão BigCorps via
// meta_connections). Mensagem varia conforme ramo (Vendas/Agenda) e
// nome do lead (decisão confirmada).

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LeadDemoHeader } from '@/components/LeadDemo/LeadDemoHeader';
import { Loader2, MessageCircle, ExternalLink } from 'lucide-react';

const NUMERO_WHATSAPP_DEMO = '551139519468';
const RAMOS_AGENDA = ['clinica', 'servicos', 'academia'];

interface WhatsappStepClientProps {
  token: string;
  nomeNegocio: string;
  produto: string;
  ramo: string;
  nomeLead: string | null;
  phoneJaInformado: string | null;
}

function buildMensagemPreenchida(nomeLead: string | null, produto: string, ramo: string): string {
  const isAgenda = RAMOS_AGENDA.includes(ramo);
  const saudacao = nomeLead ? `Oi, sou o ${nomeLead}!` : 'Oi!';
  return isAgenda
    ? `${saudacao} Vim do site e quero agendar ${produto}.`
    : `${saudacao} Vim do site e quero saber mais sobre ${produto}.`;
}

export default function WhatsappStepClient({
  token,
  nomeNegocio,
  produto,
  ramo,
  nomeLead,
  phoneJaInformado,
}: WhatsappStepClientProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? (resolvedTheme as 'dark' | 'light' ?? 'dark') !== 'light' : true;

  const [phone, setPhone] = useState(phoneJaInformado ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(!!phoneJaInformado);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/demo/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone: digits }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar telefone.');
      }

      setSaved(true);
    } catch (err: any) {
      console.error('[WhatsappStepClient] Erro:', err);
      setError(err.message || 'Algo deu errado. Pode tentar de novo?');
    } finally {
      setIsSaving(false);
    }
  };

  const mensagem = buildMensagemPreenchida(nomeLead, produto, ramo);
  const linkWhatsapp = `https://wa.me/${NUMERO_WHATSAPP_DEMO}?text=${encodeURIComponent(mensagem)}`;

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
          {!saved ? (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Testar também no WhatsApp?
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Informe seu telefone para o sistema reconhecer sua demonstração quando você mandar a mensagem.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s()+-]/g, ''))}
                  placeholder="(11) 99999-9999"
                  className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 border ${
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
                  disabled={isSaving || phone.replace(/\D/g, '').length < 10}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white font-semibold transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Tudo pronto!
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Clique no botão abaixo para abrir o WhatsApp com a mensagem já pronta. Só enviar!
              </p>

              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors mb-3"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir WhatsApp
              </a>

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
            </>
          )}
        </div>
      </main>
    </div>
  );
}