'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, LogOut, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import ArteFinalDisplay from '@/components/arte/ArteFinalDisplay';
import DuplicarImagemDisplay from '@/components/arte/DuplicarImagemDisplay';
import AdesivoContornoDisplay from '@/components/arte/AdesivoContornoDisplay';

// ── Paleta CMYK (baseada no logo ArteFinal) ──────────────────────────────
const CMYK = { cyan: '#00AEEF', magenta: '#EC008C', yellow: '#FFD500', key: '#1A1A1A' };
const BRAND_GRADIENT = `linear-gradient(135deg, ${CMYK.cyan} 0%, ${CMYK.magenta} 55%, ${CMYK.yellow} 100%)`;
const LOGIN_URL = '/arte/login';

// ── Registry local do ArteFinal ──────────────────────────────────────────
interface Skill { key: string; label: string; color: string; desc: string; credits: number; triggers: string[]; modal: string }

const SKILLS: Skill[] = [
  {
    key: 'arte_final',
    label: 'Margem e Sangria',
    color: CMYK.cyan,
    desc: 'PDF pronto pra gráfica (medida + sangria)',
    credits: 5,
    triggers: ['arte final', 'arquivo pra grafica', 'arquivo para grafica', 'sangria', 'corte', 'cartões', 'folhetos', 'fechar arquivo', 'gerar pdf', 'pdf de producao'],
    modal: 'ArteFinalDisplay',
  },
  {
    key: 'duplicar_imagem',
    label: 'Duplicar Imagem',
    color: CMYK.cyan,
    desc: 'Grid de cópias da imagem em PDF A4 para impressão',
    credits: 2,
    triggers: ['duplicar', 'duplicar imagem', 'copiar imagem', 'grid de imagem', 'multiplas copias', 'varias copias', 'repetir imagem', 'imagem em grade'],
    modal: 'DuplicarImagemDisplay',
  },
{
    key: 'adesivo_contorno',
    label: 'Adesivo com Recorte',
    color: CMYK.cyan,
    desc: 'PDF com arte + linha de corte (die-cut)',
    credits: 8,
    triggers: ['adesivo', 'sticker', 'recorte', 'corte de contorno', 'die cut', 'die-cut'],
    modal: 'AdesivoContornoDisplay',
  },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
function detectSkill(text: string): Skill | null {
  const t = norm(text);
  let best: Skill | null = null, bestLen = 0;
  for (const sk of SKILLS) for (const trig of sk.triggers) if (t.includes(trig) && trig.length > bestLen) { best = sk; bestLen = trig.length; }
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
  const playText = useCallback(async (_text: string) => {}, []);

  const refreshSaldo = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_credits').select('available_credits').eq('user_id', userId).maybeSingle();
    setSaldo(data?.available_credits ?? 0);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setHasUser(false); setReady(true); return; }
      setHasUser(true);
      const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      setCompanyId(company?.id ?? null);
      await refreshSaldo(user.id);
      setReady(true);
    })();
  }, [supabase, refreshSaldo]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Abre o modal mesmo sem login — o preview é livre; o gate de login fica no "Liberar".
  const openSkill = useCallback((sk: Skill) => {
    setActiveModal({ type: sk.modal, data: { companyId: companyId ?? '' } });
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
      setMessages((p) => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `Essa ferramenta ainda não está disponível. Por enquanto eu faço: ${disponiveis}. Toque na habilidade abaixo para começar.` }]);
    }
  }, [input, openSkill]);

  const closeModal = useCallback(async () => {
    setActiveModal(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await refreshSaldo(session.user.id);
  }, [supabase, refreshSaldo]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))' }}>
      {/* Header */}
      <header className="flex justify-center px-4 sm:px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between w-full max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center">
              <img src="/arte/arte.png" alt="ArteFinal" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>ArteFinal</p>
              <p className="text-[11px]" style={{ color: '#64748b' }}>Seu arte-finalista com IA.</p>
            </div>
          </div>
          {hasUser ? (
            <div className="flex items-center gap-2">
              <a
  href="/arte/perfil"
  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-75 active:scale-95"
  style={{ background: 'rgba(0,174,239,0.1)', color: CMYK.cyan }}
>
  <Sparkles className="w-3.5 h-3.5" />
  {saldo ?? '—'} créditos
</a>
              <button onClick={handleLogout} className="flex items-center justify-center p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95" title="Sair da conta">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a href={LOGIN_URL} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: `linear-gradient(135deg, ${CMYK.cyan} 0%, ${CMYK.magenta} 100%)` }}>
              <Sparkles className="w-3.5 h-3.5" />
              Entrar
            </a>
          )}
        </div>
      </header>

      {/* Conteúdo / mensagens */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
        {!ready ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Carregando…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 max-w-md mx-auto">
            <div className="w-24 h-24 overflow-hidden mb-1">
              <img src="/arte/arte.png" alt="ArteFinal.app" className="w-full h-full object-cover" />
            </div>
            <p className="af-empty-title text-base font-semibold">O que você precisa preparar?</p>
            <p className="af-empty-desc text-sm">
              Envie sua arte e veja o preview na hora: medida exata, CMYK, margem, sangria e corte prontos para sua gráfica.
              Clique em uma função abaixo ou digite o que precisa.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow"
                  style={m.role === 'user' ? { background: BRAND_GRADIENT, color: '#fff' } : { background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}>
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

      {/* Carrossel de habilidades (livre, inclusive anônimo) */}
      {ready && (
        <div className="flex-shrink-0 px-3 sm:px-6 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-2xl mx-auto justify-center" style={{ scrollbarWidth: 'none' }}>
            {SKILLS.map((sk) => (
              <button key={sk.key} onClick={() => openSkill(sk)}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 text-white shadow-sm"
                style={{ background: sk.color }}>
                {sk.label}
                {hasUser && (
                  <span className="block text-[10px] font-normal mt-0.5 text-white/70">{sk.credits} créditos</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input (livre, inclusive anônimo) */}
      {ready && (
        <div className="flex-shrink-0 px-3 sm:px-6 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2 max-w-2xl mx-auto" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ex: cartões e folhetos, converter, corte…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#1e293b' }}
            />
            <button onClick={handleSubmit} disabled={!input.trim()} className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:scale-110 active:scale-95" style={{ background: BRAND_GRADIENT }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: '#94a3b8' }}>
            Powered by{' '}
            <a href="https://minhai.app" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: CMYK.cyan, fontWeight: 600 }}>minhAi.app</a>
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
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
      {activeModal?.type === 'DuplicarImagemDisplay' && (
        <DuplicarImagemDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
      {activeModal?.type === 'AdesivoContornoDisplay' && (
        <AdesivoContornoDisplay
          data={activeModal.data}
          onClose={closeModal}
          theme="light"
          playText={playText}
          onRequireLogin={() => { window.location.href = LOGIN_URL; }}
        />
      )}
    </div>
  );
}
