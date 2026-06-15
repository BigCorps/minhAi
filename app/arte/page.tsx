'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import ArteFinalDisplay from '@/components/arte/ArteFinalDisplay';

// ── Paleta CMYK (baseada no logo ArteFinal) ──────────────────────────────
const CMYK = {
  cyan: '#00AEEF',
  magenta: '#EC008C',
  yellow: '#FFD500',
  key: '#1A1A1A',
};

// Gradiente "AF" do logo: azul → magenta → amarelo
const BRAND_GRADIENT = `linear-gradient(135deg, ${CMYK.cyan} 0%, ${CMYK.magenta} 55%, ${CMYK.yellow} 100%)`;

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
    color: CMYK.cyan,
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

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))' }}>
      {/* Header */}
<header className="flex justify-center px-4 sm:px-6 py-3 border-b flex-shrink-0"
  style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
  <div className="flex items-center justify-between w-full max-w-2xl">
    {/* logo + nome */}
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center">
        <img src="/arte/arte.png" alt="ArteFinal" className="w-full h-full object-cover" />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: '#0f172a' }}>ArteFinal</p>
        <p className="text-[11px]" style={{ color: '#64748b' }}>Sua arte com sangria e corte com IA.</p>
      </div>
    </div>
    {/* créditos */}
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(0,174,239,0.1)', color: CMYK.cyan }}>
      <Sparkles className="w-3.5 h-3.5" />
      {hasUser ? `${saldo ?? '—'} créditos` : 'entrar'}
    </div>
  </div>
</header>

      {/* Conteúdo / mensagens */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Carregando…</p>
          </div>
        ) : !hasUser ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <Bot className="w-10 h-10 text-gray-300" />
            <p className="text-sm" style={{ color: '#6b7280' }}>Entre na sua conta para usar o app ArteFinal.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 max-w-md mx-auto">
<div className="w-24 h-24 overflow-hidden mb-1">
  <img src="/arte/arte.png" alt="ArteFinal.app" className="w-full h-full object-cover" />
</div>
            <p className="af-empty-title text-base font-semibold">
              O que você precisa preparar?
            </p>
            <p className="af-empty-desc text-sm">
              Envie sua arte e receba o PDF na medida exata, com sangria e corte — pronto para sua gráfica parceira.
              Clique em uma função abaixo ou digite o que precisa.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
                  style={m.role === 'user'
                    ? { background: BRAND_GRADIENT, color: '#fff' }
                    : { background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <style>{`
        .af-empty-title { color: #0f172a !important; }
        .af-empty-desc { color: #64748b !important; }
      `}</style>

      {/* Carrossel de habilidades */}
      {ready && hasUser && (
        <div className="flex-shrink-0 px-3 sm:px-6 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-2xl mx-auto" style={{ scrollbarWidth: 'none' }}>
            {SKILLS.map((sk) => (
              <button key={sk.key} onClick={() => openSkill(sk)}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 text-white shadow-sm"
                style={{ background: sk.color }}>
                {sk.label}
                <span className="block text-[10px] font-normal mt-0.5 text-white/70">{sk.credits} créditos</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {ready && hasUser && (
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2 max-w-2xl mx-auto"
            style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ex: arte final, sangria e corte…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#1e293b' }}
            />
            <button onClick={handleSubmit} disabled={!input.trim()}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
              style={{ background: BRAND_GRADIENT }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Powered by */}
          <p className="text-center text-[10px] mt-2" style={{ color: '#94a3b8' }}>
            Powered by{' '}
            <a
              href="https://minhai.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: CMYK.cyan, fontWeight: 600 }}
            >
              minhAi.app
            </a>
          </p>
        </div>
      )}

      {/* Modais */}
      {activeModal?.type === 'ArteFinalDisplay' && (
        <ArteFinalDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
        />
      )}
    </div>
  );
}
