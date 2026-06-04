'use client'
// components/tour/scenes/SceneAssistente.tsx

import { useEffect, useState } from 'react'
import { AvatarFace } from '@/components/AvatarFace'

type SubMode = 'padrao' | 'full' | 'texto'

const CAROUSEL_ITEMS = [
  { name: 'Conhecimento', color: '#3B82F6' },
  { name: 'Comercial',    color: '#10B981' },
  { name: 'Financeiro',   color: '#3B82F6' },
  { name: 'Informação',   color: '#10B981' },
  { name: 'Multimídia',   color: '#3B82F6' },
  { name: 'Agendamento',  color: '#10B981' },
  { name: 'Serviços',     color: '#3B82F6' },
  { name: 'Contato',      color: '#10B981' },
]

// 6 cópias para scroll infinito suave
const DUPLICATED_CAROUSEL = Array.from({ length: 6 }, () => CAROUSEL_ITEMS).flat()

const SUB_SEQUENCE: SubMode[] = ['padrao', 'texto', 'full']
const SUB_DURATION = 3500

interface SceneAssistenteProps {
  isSpeaking: boolean
  theme?: 'dark' | 'light'
}

export default function SceneAssistente({ isSpeaking, theme = 'dark' }: SceneAssistenteProps) {
  const [subMode, setSubMode] = useState<SubMode>('padrao')
  const [visible, setVisible]   = useState(true)
  // sempre dark — a UI real é sempre escura nesta cena
  const isDark = true

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const advance = (current: SubMode) => {
      t = setTimeout(() => {
        setVisible(false)
        setTimeout(() => {
          const next = SUB_SEQUENCE[(SUB_SEQUENCE.indexOf(current) + 1) % SUB_SEQUENCE.length]
          setSubMode(next)
          setVisible(true)
          advance(next)
        }, 300)
      }, SUB_DURATION)
    }
    advance(subMode)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── shared bg ──
  const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >

      {/* ════════════════════════════════════════
          MODO PADRÃO — split: avatar | mic+input
          ════════════════════════════════════════ */}
      {subMode === 'padrao' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>

          {/* Conteúdo principal — split */}
          <div className="flex-1 flex min-h-0 p-3 gap-3">

            {/* Esquerda: avatar */}
            <div
              className="flex-1 rounded-xl flex items-center justify-center min-w-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div style={{ width: 'clamp(80px, 18vw, 180px)', aspectRatio: '1/1' }}>
                <AvatarFace
                  isSpeaking={isSpeaking}
                  isListening={false}
                  isProcessing={false}
                  theme="dark"
                  avatarType={isSpeaking ? 'orb' : 'face'}
                  hasActivePlan={true}
                />
              </div>
            </div>

            {/* Direita: microfone + wake word + input */}
            <div
              className="flex-1 rounded-xl flex flex-col items-center justify-center gap-3 px-3 min-w-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Botão mic */}
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: 'clamp(36px, 8vw, 64px)',
                  height: 'clamp(36px, 8vw, 64px)',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 'clamp(16px, 4vw, 28px)', height: 'clamp(16px, 4vw, 28px)' }}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>

              <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
                clique para falar ou
              </p>
              <p className="text-white font-bold text-center leading-snug" style={{ fontSize: 'clamp(0.6rem, 1.5vw, 0.85rem)' }}>
                diga: "minhAi" + sua solicitação
              </p>
              <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.58rem)' }}>
                Utilize a palavra de ativação apenas no modo voz.
              </p>

              {/* Input mock */}
              <div className="w-full flex items-center gap-1.5 mt-1">
                <div
                  className="flex-1 rounded-lg px-3 py-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 'clamp(0.5rem, 1.1vw, 0.62rem)',
                  }}
                >
                  Ou digite sua mensagem...
                </div>
                <div
                  className="rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 'clamp(22px, 5vw, 32px)',
                    height: 'clamp(22px, 5vw, 32px)',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"
                    style={{ width: 'clamp(10px, 2.5vw, 14px)', height: 'clamp(10px, 2.5vw, 14px)' }}>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
              <p className="text-white/20" style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.5rem)' }}>
                Pressione Enter para enviar
              </p>
            </div>
          </div>

          {/* Carrossel */}
          <CarouselBar />

          {/* Footer branding */}
          <FooterBar />
        </div>
      )}

      {/* ════════════════════════════════════════
          MODO TEXTO — "Como Posso te Ajudar"
          ════════════════════════════════════════ */}
      {subMode === 'texto' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>

          {/* Área central com frase */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            <p
              className="text-white font-bold text-center"
              style={{ fontSize: 'clamp(0.9rem, 2.8vw, 1.5rem)' }}
            >
              Como Posso te Ajudar Hoje?
            </p>
          </div>

          {/* Input largo */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-xl px-4 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)',
                }}
              >
                Ou digite sua mensagem...
              </div>
              <div
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  width: 'clamp(28px, 6vw, 38px)',
                  height: 'clamp(28px, 6vw, 38px)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"
                  style={{ width: 'clamp(12px, 2.8vw, 16px)', height: 'clamp(12px, 2.8vw, 16px)' }}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
            </div>
            <p className="text-white/20 text-center mt-1" style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.5rem)' }}>
              Pressione Enter para enviar
            </p>
          </div>

          {/* Carrossel */}
          <CarouselBar />

          {/* Footer */}
          <FooterBar />
        </div>
      )}

      {/* ════════════════════════════════════════
          MODO FULL — avatar centralizado grande
          ════════════════════════════════════════ */}
      {subMode === 'full' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>

          {/* Avatar centralizado */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div style={{ width: 'clamp(120px, 30vw, 280px)', aspectRatio: '1/1' }}>
              <AvatarFace
                isSpeaking={isSpeaking}
                isListening={false}
                isProcessing={false}
                theme="dark"
                avatarType={isSpeaking ? 'orb' : 'face'}
                hasActivePlan={true}
              />
            </div>
          </div>

          {/* Wake word abaixo do avatar */}
          <div className="flex flex-col items-center pb-2">
            <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>
              clique para falar
            </p>
            <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.65rem, 1.8vw, 1rem)' }}>
              diga: "minhAi" + sua solicitação
            </p>
          </div>

          {/* Carrossel */}
          <CarouselBar />

          {/* Footer */}
          <FooterBar />
        </div>
      )}

      {/* Keyframe do carrossel */}
      <style>{`
        @keyframes scene-assistente-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${parseFloat(((1/6)*100).toFixed(4))}%); }
        }
      `}</style>
    </div>
  )
}

/* ── Sub-componentes internos ── */

function CarouselBar() {
  return (
    <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 6, paddingBottom: 6 }}>
      <div
        className="flex gap-2 pl-2 w-max"
        style={{
          animation: 'scene-assistente-scroll 16s linear infinite',
          willChange: 'transform',
        }}
      >
        {DUPLICATED_CAROUSEL.map((cat, i) => (
          <div
            key={i}
            className="flex-shrink-0 flex items-center rounded-xl"
            style={{
              fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${cat.color}`,
              padding: '5px 12px',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderLeftColor: cat.color,
              borderLeftWidth: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterBar() {
  return (
    <div
      className="text-center px-3 py-1 flex-shrink-0"
      style={{
        fontSize: 'clamp(0.4rem, 0.9vw, 0.5rem)',
        color: 'rgba(255,255,255,0.2)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      suporte.<strong>minhai.app</strong> — Uma IA pra chamar de sua!
    </div>
  )
}
