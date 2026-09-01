'use client'
// components/tour/scenes/SceneMidia.tsx
// Criador de Posts — padrão visual unificado com CriarMidiaDisplay
// Cicla: conversa (chat + config) → gerando → preview (imagem + caption + hashtags)

import { useEffect, useState, useRef } from 'react'
import {
  Sparkles, Send, Mic, Loader2,
  Download, Copy, Check,
  Instagram, Facebook, ChevronDown,
  Image as ImageIcon,
} from 'lucide-react'

// ─── Paleta (espelho do CriarMidiaDisplay dark) ────────────────────────────────
const BG_SEC    = '#1e293b'
const BG_SEC2   = '#334155'
const BG_CHAT   = '#0f172a'
const TXT       = '#f1f5f9'
const TXT_MUTED = '#94a3b8'
const BORDER    = '#475569'
const ACCENT    = '#8B5CF6'  // Instagram purple
const ACCENT_B  = '#3b82f6'
const USER_BUB  = '#8B5CF6'
const BOT_BUB   = '#334155'
const IG_GRAD   = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'

type Stage = 'conversa' | 'gerando' | 'preview'

interface Msg { from: 'user' | 'bot'; text: string }
const MSGS: Msg[] = [
  { from: 'user', text: 'Quero um post de promoção do nosso cappuccino' },
  { from: 'bot',  text: 'Ótimo! Que tal destacar o preço especial e um visual aconchegante? Posso usar a paleta da sua marca. Confirma a geração?' },
  { from: 'user', text: 'Sim, pode gerar!' },
]

const HASHTAGS = ['#cappuccino', '#café', '#promoção', '#cafeteria', '#bomdia', '#coffee']

const R = (n: number, w: number) => Math.round((n * w) / 360)

// ─── Formatos ─────────────────────────────────────────────────────────────────
const FORMATOS = [
  { key: 'square',    label: 'Quadrado',   desc: 'Feed Instagram / Facebook', ratio: '1:1'  },
  { key: 'portrait',  label: 'Vertical',   desc: 'Stories / Reels cover',     ratio: '4:5'  },
  { key: 'landscape', label: 'Horizontal', desc: 'Banner / Facebook cover',   ratio: '16:9' },
]

// ─── Step: Conversa ────────────────────────────────────────────────────────────
function StepConversa({ msgCount, w }: { msgCount: number; w: number }) {
  const r = (n: number) => R(n, w)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Coluna Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden' }}>
          {/* Boas-vindas */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '88%', backgroundColor: BOT_BUB, color: TXT, borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.8), lineHeight: 1.45 }}>
              Olá! Sou o Criador de Posts. Me conte: qual é o objetivo do post? Uma promoção, lançamento, dica?
            </div>
          </div>

          {MSGS.slice(0, msgCount).map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB, color: '#fff', borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.8), lineHeight: 1.45 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}`, backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER}`, padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
            Descreva sua arte ou confirme...
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Coluna direita: configurações */}
      <div style={{ width: `${r(140)}px`, display: 'flex', flexDirection: 'column', backgroundColor: BG_SEC, flexShrink: 0, overflow: 'hidden' }}>

        {/* Logo da empresa */}
        <div style={{ padding: `${r(8)}px ${r(8)}px ${r(6)}px`, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(5) }}>
            Logo da empresa
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: r(7), padding: `${r(6)}px ${r(7)}px`, borderRadius: r(9), border: `1px solid ${BORDER}`, backgroundColor: BG_SEC2 }}>
            <div style={{ width: r(26), height: r(26), borderRadius: r(6), background: IG_GRAD, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: r(13), height: r(13), color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: r(7), fontWeight: 700, color: TXT }}>Café Exemplo</div>
              <div style={{ fontSize: r(5.5), color: TXT_MUTED, marginTop: r(1) }}>Logo carregado</div>
            </div>
          </div>
        </div>

        {/* Formato */}
        <div style={{ padding: `${r(7)}px ${r(8)}px`, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(5) }}>
            Formato
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: r(4) }}>
            {FORMATOS.map((f, i) => (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: `${r(6)}px ${r(8)}px`, borderRadius: r(9),
                border: `1px solid ${i === 0 ? ACCENT : BORDER}`,
                backgroundColor: i === 0 ? `${ACCENT}15` : BG_SEC2,
              }}>
                <div>
                  <div style={{ fontSize: r(7), fontWeight: i === 0 ? 700 : 400, color: TXT }}>{f.label}</div>
                  <div style={{ fontSize: r(5.5), color: TXT_MUTED }}>{f.desc}</div>
                </div>
                <div style={{ fontSize: r(6), fontFamily: 'monospace', padding: `${r(2)}px ${r(5)}px`, borderRadius: r(4), backgroundColor: BORDER, color: TXT_MUTED }}>
                  {f.ratio}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Posição logo */}
        <div style={{ padding: `${r(7)}px ${r(8)}px`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(5) }}>
            Posição do logo
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ backgroundColor: BG_SEC2, border: `1px solid ${BORDER}`, borderRadius: r(8), padding: `${r(6)}px ${r(8)}px`, fontSize: r(6.5), color: TXT, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Inferior direito</span>
              <ChevronDown style={{ width: r(11), height: r(11), color: TXT_MUTED }} />
            </div>
          </div>
        </div>

        {/* Dica */}
        <div style={{ margin: `${r(6)}px ${r(8)}px`, padding: `${r(8)}px`, borderRadius: r(9), backgroundColor: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: r(5) }}>
            <Sparkles style={{ width: r(11), height: r(11), color: ACCENT, flexShrink: 0, marginTop: r(1) }} />
            <div style={{ fontSize: r(6), color: TXT, lineHeight: 1.4 }}>
              15 créditos cobrados ao confirmar a geração.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Gerando ─────────────────────────────────────────────────────────────
function StepGerando({ w }: { w: number }) {
  const r = (n: number) => R(n, w)
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Chat coluna — congelado no último estado */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden' }}>
          {MSGS.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB, color: '#fff', borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.8), lineHeight: 1.45 }}>
                {m.text}
              </div>
            </div>
          ))}
          {/* Loader do assistente */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ backgroundColor: BOT_BUB, borderRadius: r(10), padding: `${r(5)}px ${r(10)}px`, display: 'flex', alignItems: 'center', gap: r(6) }}>
              <div style={{ width: r(12), height: r(12), border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: r(6.8), color: TXT_MUTED }}>Gerando sua arte...</span>
            </div>
          </div>
        </div>
        <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}`, backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER}`, padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
            Descreva sua arte ou confirme...
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Coluna direita: spinner de geração */}
      <div style={{ width: `${r(140)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: r(12), backgroundColor: BG_SEC, flexShrink: 0 }}>
        <div style={{ width: r(52), height: r(52), borderRadius: r(14), display: 'flex', alignItems: 'center', justifyContent: 'center', background: IG_GRAD }}>
          <Sparkles style={{ width: r(26), height: r(26), color: '#fff' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: r(8), fontWeight: 700, color: TXT }}>Criando sua arte...</div>
          <div style={{ fontSize: r(6.5), color: TXT_MUTED, marginTop: r(3) }}>Isso pode levar até 30s</div>
        </div>
        <div style={{ width: r(18), height: r(18), border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Step: Preview ─────────────────────────────────────────────────────────────
function StepPreview({ w }: { w: number }) {
  const r = (n: number) => R(n, w)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Coluna Chat — com mensagem de arte pronta */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden' }}>
          {MSGS.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB, color: '#fff', borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.8), lineHeight: 1.45 }}>
                {m.text}
              </div>
            </div>
          ))}
          {/* Resposta final do bot */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '88%', backgroundColor: BOT_BUB, color: TXT, borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.8), lineHeight: 1.45 }}>
              Arte gerada! Confira o preview ao lado. Você pode baixar, copiar a descrição ou publicar diretamente.
            </div>
          </div>
        </div>
        <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}`, backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER}`, padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
            Descreva sua arte ou confirme...
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Coluna direita: preview real */}
      <div style={{ width: `${r(140)}px`, display: 'flex', flexDirection: 'column', backgroundColor: BG_SEC, flexShrink: 0, overflowY: 'hidden' }}>

        {/* Imagem gerada */}
        <div style={{ padding: `${r(8)}px`, flexShrink: 0 }}>
          <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: r(10), overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <img src="/arte.png" alt="Arte gerada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Caption */}
        <div style={{ padding: `0 ${r(8)}px ${r(5)}px`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(4) }}>
            Descrição
          </div>
          <div style={{ backgroundColor: BG_SEC2, border: `1px solid ${BORDER}`, borderRadius: r(8), padding: `${r(5)}px ${r(7)}px`, fontSize: r(6.2), color: TXT, lineHeight: 1.4 }}>
            ☕ Cappuccino especial por apenas R$ 12! Venha nos visitar e aproveite.
          </div>
        </div>

        {/* Hashtags */}
        <div style={{ padding: `0 ${r(8)}px ${r(6)}px`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(4) }}>
            Hashtags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: r(3) }}>
            {HASHTAGS.map(tag => (
              <span key={tag} style={{ fontSize: r(6), padding: `${r(2)}px ${r(5)}px`, borderRadius: r(20), backgroundColor: `${ACCENT}20`, color: ACCENT, fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Botões de ação */}
        <div style={{ padding: `0 ${r(8)}px ${r(8)}px`, display: 'flex', flexDirection: 'column', gap: r(5), marginTop: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(5), padding: `${r(7)}px`, borderRadius: r(9), border: `1px solid ${BORDER}`, backgroundColor: BG_SEC2, fontSize: r(7), fontWeight: 600, color: TXT }}>
            <Copy style={{ width: r(11), height: r(11) }} />
            Copiar descrição
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(5), padding: `${r(7)}px`, borderRadius: r(9), border: `1px solid ${BORDER}`, backgroundColor: BG_SEC2, fontSize: r(7), fontWeight: 600, color: TXT }}>
            <Download style={{ width: r(11), height: r(11) }} />
            Baixar arte
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(5), padding: `${r(7)}px`, borderRadius: r(9), backgroundColor: '#1877F2', fontSize: r(7), fontWeight: 700, color: '#fff' }}>
            <Facebook style={{ width: r(11), height: r(11) }} />
            Publicar no Facebook
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(5), padding: `${r(7)}px`, borderRadius: r(9), background: IG_GRAD, fontSize: r(7), fontWeight: 700, color: '#fff', opacity: 0.5 }}>
            <Instagram style={{ width: r(11), height: r(11) }} />
            Instagram (em breve)
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneMidia() {
  const [stage, setStage]       = useState<Stage>('conversa')
  const [msgCount, setMsgCount] = useState(0)
  const containerRef            = useRef<HTMLDivElement>(null)
  const [w, setW]               = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const r = (n: number) => R(n, w)

  // ─── Sequência ────────────────────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    if (stage === 'conversa') {
      if (msgCount < MSGS.length) {
        t = setTimeout(() => setMsgCount(c => c + 1), msgCount === 0 ? 700 : 1200)
      } else {
        t = setTimeout(() => setStage('gerando'), 1000)
      }
    }

    if (stage === 'gerando') {
      t = setTimeout(() => setStage('preview'), 2200)
    }

    if (stage === 'preview') {
      // Fica no preview por 4s antes de reiniciar
      t = setTimeout(() => {
        setStage('conversa')
        setMsgCount(0)
      }, 4000)
    }

    return () => clearTimeout(t)
  }, [stage, msgCount])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ backgroundColor: BG_SEC, fontFamily: 'system-ui,-apple-system,sans-serif' }}
    >
      {/* ── Header — espelho fiel do CriarMidiaDisplay ── */}
      <div style={{
        padding: `${r(8)}px ${r(12)}px`,
        borderBottom: `1px solid ${BORDER}`,
        backgroundColor: `${ACCENT}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: r(8) }}>
          <div style={{ width: r(28), height: r(28), borderRadius: '50%', background: IG_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles style={{ width: r(14), height: r(14), color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: r(9), fontWeight: 800, color: TXT, lineHeight: 1.2 }}>
              Criador de Posts
            </div>
            <div style={{ fontSize: r(6), color: TXT_MUTED, marginTop: r(1) }}>
              {stage === 'conversa' && 'Descreva sua arte no chat'}
              {stage === 'gerando'  && 'Gerando sua arte com IA...'}
              {stage === 'preview'  && 'Arte pronta — baixe ou publique'}
            </div>
          </div>
        </div>

        {/* Badge redes sociais */}
        <div style={{ display: 'flex', alignItems: 'center', gap: r(5) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: r(4), padding: `${r(3)}px ${r(7)}px`, borderRadius: r(20), backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
            <Instagram style={{ width: r(10), height: r(10), color: ACCENT }} />
            <Facebook style={{ width: r(10), height: r(10), color: '#1877F2' }} />
            <span style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED }}>Multi-plataforma</span>
          </div>
        </div>
      </div>

      {/* ── Conteúdo por etapa ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {stage === 'conversa' && <StepConversa msgCount={msgCount} w={w} />}
        {stage === 'gerando'  && <StepGerando  w={w} />}
        {stage === 'preview'  && <StepPreview  w={w} />}
      </div>
    </div>
  )
}
