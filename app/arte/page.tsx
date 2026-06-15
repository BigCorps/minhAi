'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Bot, Send, Sparkles, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import ArteFinalDisplay from '@/components/arte/ArteFinalDisplay';

// ── Registry local do ArteFinal ──────────────────────────────────────────
// Adicionar habilidade nova = uma entrada aqui (e o componente correspondente).
interface Skill {
  key: string;
  label: string;
  color: string;
  desc: string;
  credits: number;
  triggers: string[];
  modal: string;
}

const SKILLS: Skill[] = [
  {
    key: 'arte_final',
    label: 'Arte Final',
    color: '#ea580c',
    desc: 'PDF pronto pra gráfica (medida + sangria + corte)',
    credits: 5,
    triggers: ['arte final', 'arquivo pra grafica', 'arquivo para grafica', 'sangria', 'corte', 'fechar arquivo', 'gerar pdf', 'pdf de producao'],
    modal: 'ArteFinalDisplay',
  },
];

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function detectSkill(text: string): Skill | null {
  const t = norm(text);
  let best: Skill | null = null;
  let bestLen = 0;
  for (const sk of SKILLS) {
    for (const trig of sk.triggers) {
      if (t.includes(trig) && trig.length > bestLen) { best = sk; bestLen = trig.length; }
    }
  }
  return best;
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string }
type ActiveModal = { type: string; data: { companyId: string } } | null;

export default function ArtePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const endRef = useRef<HTMLDivElement>(null);

  // playText desligado nesta superfície (sem infra de TTS). Plugar rota TTS aqui se quiser áudio.
  const playText = useCallback(async (_text: string) => {}, []);

  const refreshSaldo = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_credits')
      .select('available_credits')
      .eq('user_id', userId)
      .maybeSingle();
    setSaldo(data?.available_credits ?? 0);
  }, [supabase]);

  // Init: sessão → empresa → saldo
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setHasUser(false); setReady(true); return; }
      setHasUser(true);

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      setCompanyId(company?.id ?? null);
      await refreshSaldo(user.id);
      setReady(true);
    })();
  }, [supabase, refreshSaldo]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openSkill = useCallback((sk: Skill) => {
    if (!companyId) {
      setMessages((p) => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: 'Não encontrei sua empresa. Entre na sua conta para usar as ferramentas.' }]);
      return;
    }
    setActiveModal({ type: sk.modal, data: { companyId } });
  }, [companyId]);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: 'user', content: text }]);

    const sk = detectSkill(text);
    if (sk) {
      openSkill(sk);
    } else {
      const disponiveis = SKILLS.map((s) => s.label).join(', ');
      setMessages((p) => [...p, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: `Essa ferramenta ainda não está disponível. Por enquanto eu faço: ${disponiveis}. Toque na habilidade abaixo para começar.`,
      }]);
    }
  }, [input, openSkill]);

  const closeModal = useCallback(async () => {
    setActiveModal(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshSaldo(session.user.id); // atualiza saldo após consumo
  }, [supabase, refreshSaldo]);

  const bgPage = isDark
    ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))'
    : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))';

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: bgPage }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ea580c, #f59e0b)' }}>
            <Wand2 className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>ArteFinal</p>
            <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Arquivo pronto pra gráfica, sem Corel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: isDark ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.1)', color: '#ea580c' }}>
          <Sparkles className="w-3.5 h-3.5" />
          {hasUser ? `${saldo ?? '—'} créditos` : 'entrar'}
        </div>
      </header>

      {/* Conteúdo / mensagens */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Carregando…</p>
          </div>
        ) : !hasUser ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <Bot className={`w-10 h-10 ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Entre na sua conta para usar o ArteFinal.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'linear-gradient(135deg, #ea580c, #f59e0b)' }}>
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>O que você precisa preparar?</p>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Envie sua arte e receba o PDF na medida exata, com sangria e corte — pronto para enviar à gráfica.
              Toque numa habilidade abaixo ou digite o que precisa.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg, #ea580c, #f59e0b)', color: '#fff' }
                    : { background: isDark ? 'rgba(51,65,85,0.8)' : 'rgba(255,255,255,0.95)', color: isDark ? '#e2e8f0' : '#1e293b' }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </main>

      {/* Carrossel de habilidades */}
      {ready && hasUser && (
        <div className="flex-shrink-0 px-3 sm:px-6 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-2xl mx-auto" style={{ scrollbarWidth: 'none' }}>
            {SKILLS.map((sk) => (
              <button key={sk.key} onClick={() => openSkill(sk)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm'}`}
                style={{ borderLeft: `3px solid ${sk.color}` }}>
                {sk.label}
                <span className={`block text-[10px] font-normal mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{sk.credits} créditos</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {ready && hasUser && (
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2 max-w-2xl mx-auto"
            style={{ background: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', border: `1px solid ${isDark ? 'rgba(234,88,12,0.3)' : 'rgba(234,88,12,0.2)'}` }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ex: arte final, sangria e corte…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
            />
            <button onClick={handleSubmit} disabled={!input.trim()}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f59e0b)' }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Modais */}
      {activeModal?.type === 'ArteFinalDisplay' && (
        <ArteFinalDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme={isDark ? 'dark' : 'light'}
          playText={playText}
        />
      )}
    </div>
  );
}
