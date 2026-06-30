'use client'
// components/LeadDemo/tour/TourAssistente.tsx
// Usa o AvatarFace real (mesmo do assistente) e suporta dark/light.

import { useEffect, useState } from 'react'
import { AvatarFace } from '@/components/AvatarFace'

type SubMode = 'padrao' | 'texto' | 'full'
const SUB_SEQUENCE: SubMode[] = ['padrao', 'texto', 'full']
const SUB_DURATION = 3500

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
const DUPLICATED   = Array.from({ length: 6 }, () => CAROUSEL_ITEMS).flat()
const CAROUSEL_PCT = parseFloat(((1 / 6) * 100).toFixed(4))

interface Props {
  theme?: 'dark' | 'light'
}

export default function TourAssistente({ theme = 'dark' }: Props) {
  const [subMode, setSubMode] = useState<SubMode>('padrao')
  const [visible, setVisible] = useState(true)

  const isDark = theme !== 'light'

  // Cores adaptadas ao tema
  const BG = isDark
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)'

  const cardBg     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const cardShadow = isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.06)'

  const textPrimary   = isDark ? 'rgba(255,255,255,1)'    : 'rgba(0,0,0,0.85)'
  const textSecondary = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)'
  const textMuted     = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.25)'

  const inputBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'

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

  // ── Sub-componentes ───────────────────────────────────────────

  const MODE_ICONS = [
    <svg key="shop" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>,
    <svg key="full" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>,
    <svg key="link" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>,
    <svg key="user" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>,
    <svg key="kiosk" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>,
  ]

  const MockHeader = () => (
    <div
      className="flex items-center justify-between px-3 py-2 flex-shrink-0"
      style={{
        borderBottom: `1px solid ${cardBorder}`,
        background: isDark
          ? 'linear-gradient(to right, rgba(15,23,42,0.8), rgba(30,41,59,0.7), rgba(15,23,42,0.8))'
          : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Esquerda */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 'clamp(20px,4.5vw,28px)', height: 'clamp(20px,4.5vw,28px)', background: '#de691b' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
            style={{ width: '60%', height: '60%' }}>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M6 2v2M10 2v2M14 2v2M3 21h18" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold truncate" style={{ color: textPrimary, fontSize: 'clamp(0.58rem,1.4vw,0.8rem)' }}>
              Café Exemplo
            </span>
            <span className="inline-flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: '65%', height: '65%' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <span className="uppercase tracking-wider" style={{ color: textMuted, fontSize: 'clamp(0.36rem,0.85vw,0.46rem)' }}>
            Agente IA
          </span>
        </div>
      </div>

      {/* Direita: botões de modo + logo */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {MODE_ICONS.map((Icon, i) => (
          <div key={i} className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              width: 'clamp(16px,3.5vw,22px)', height: 'clamp(16px,3.5vw,22px)',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${cardBorder}`,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              padding: 2,
            }}>
            {Icon}
          </div>
        ))}
        <div className="w-px mx-1 self-stretch" style={{ background: cardBorder }} />
        <img src="/logo-circle.png" alt="minhAi"
          style={{ width: 'clamp(18px,4vw,26px)', height: 'clamp(18px,4vw,26px)', borderRadius: 6 }} />
      </div>
    </div>
  )

  const CarouselBar = () => (
    <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 5, paddingBottom: 5 }}>
      <div className="flex gap-2 pl-2 w-max"
        style={{ animation: 'tour-assistente-scroll 16s linear infinite', willChange: 'transform' }}>
        {DUPLICATED.map((cat, i) => (
          <div key={i} className="flex-shrink-0 flex items-center rounded-xl"
            style={{
              fontSize: 'clamp(0.48rem,1.1vw,0.62rem)', fontWeight: 600,
              color:       isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.70)',
              background:  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border:      `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderLeft:  `3px solid ${cat.color}`,
              padding: '5px 10px', whiteSpace: 'nowrap',
            }}>
            {cat.name}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes tour-assistente-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${CAROUSEL_PCT}%); }
        }
      `}</style>
    </div>
  )

  const FooterBar = () => (
    <div className="text-center px-3 py-1 flex-shrink-0"
      style={{
        fontSize: '0.42rem',
        color: textMuted,
        borderTop: `1px solid ${cardBorder}`,
      }}>
      <strong>minhai.app</strong> — Uma IA pra chamar de sua!
    </div>
  )

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}>

      {/* MODO PADRÃO */}
      {subMode === 'padrao' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />
          <div className="flex-1 flex min-h-0 p-3 gap-3 items-start justify-center">

            {/* Card avatar — AvatarFace real */}
            <div className="relative flex-shrink-0"
              style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              <div className="absolute inset-0 rounded-xl"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }} />
              <div className="absolute inset-0 flex items-center justify-center" style={{ overflow: 'visible' }}>
                <div style={{ width: '68%', aspectRatio: '1/1' }}>
                  <AvatarFace
                    isSpeaking={false}
                    isListening={false}
                    isProcessing={false}
                    theme={theme}
                    avatarType="orb"
                    hasActivePlan
                  />
                </div>
              </div>
            </div>

            {/* Card mic + input */}
            <div className="relative flex-shrink-0"
              style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 px-3 overflow-hidden"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                {/* Botão mic */}
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 'clamp(28px,7vw,48px)', height: 'clamp(28px,7vw,48px)',
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
                    style={{ width: '55%', height: '55%' }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                </div>
                <p className="text-center leading-none" style={{ color: textSecondary, fontSize: 'clamp(0.42rem,1vw,0.56rem)' }}>
                  clique para falar ou
                </p>
                <p className="font-bold text-center leading-snug" style={{ color: textPrimary, fontSize: 'clamp(0.52rem,1.3vw,0.75rem)' }}>
                  diga: "minhAi" + sua solicitação
                </p>
                <p className="text-center" style={{ color: textMuted, fontSize: 'clamp(0.36rem,0.85vw,0.46rem)' }}>
                  Utilize a palavra de ativação apenas no modo voz.
                </p>
                <div className="w-full flex items-center gap-1.5">
                  <div className="flex-1 rounded-lg px-2 py-1"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`,
                      color: textSecondary, fontSize: 'clamp(0.42rem,1vw,0.56rem)' }}>
                    Ou digite sua mensagem...
                  </div>
                  <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ width: 'clamp(18px,4.5vw,26px)', height: 'clamp(18px,4.5vw,26px)',
                      background: inputBg, border: `1px solid ${inputBorder}` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" style={{ width: '55%', height: '55%', color: textSecondary }}>
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <CarouselBar />
          <FooterBar />
        </div>
      )}

      {/* MODO TEXTO */}
      {subMode === 'texto' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />
          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            <p className="font-bold text-center" style={{ color: textPrimary, fontSize: 'clamp(0.85rem,2.5vw,1.4rem)' }}>
              Como Posso te Ajudar Hoje?
            </p>
          </div>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl px-4 py-2.5"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`,
                  color: textSecondary, fontSize: 'clamp(0.52rem,1.2vw,0.68rem)' }}>
                Ou digite sua mensagem...
              </div>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 'clamp(26px,5.5vw,36px)', height: 'clamp(26px,5.5vw,36px)',
                  background: inputBg, border: `1px solid ${inputBorder}` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" style={{ width: '55%', height: '55%', color: textSecondary }}>
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
            </div>
            <p className="text-center mt-1" style={{ color: textMuted, fontSize: 'clamp(0.38rem,0.85vw,0.48rem)' }}>
              Pressione Enter para enviar
            </p>
          </div>
          <CarouselBar />
          <FooterBar />
        </div>
      )}

      {/* MODO FULL */}
      {subMode === 'full' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <img src="/logo.png" alt="minhAi"
              style={{ height: 'clamp(14px,3vw,22px)', width: 'auto', objectFit: 'contain',
                filter: isDark ? 'none' : 'brightness(0)' }} />
            <img src="/logo-circle.png" alt="minhAi"
              style={{ width: 'clamp(20px,4vw,28px)', height: 'clamp(20px,4vw,28px)', borderRadius: 6 }} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
            <div style={{ width: 'clamp(100px,26vw,220px)', aspectRatio: '1/1' }}>
              <AvatarFace
                isSpeaking={false}
                isListening={false}
                isProcessing={false}
                theme={theme}
                avatarType="orb"
                hasActivePlan
              />
            </div>
            <p className="text-center" style={{ color: textSecondary, fontSize: 'clamp(0.42rem,1vw,0.58rem)' }}>
              clique para falar
            </p>
            <p className="font-bold text-center" style={{ color: textPrimary, fontSize: 'clamp(0.62rem,1.7vw,0.95rem)' }}>
              diga: "minhAi" + sua solicitação
            </p>
          </div>
          <CarouselBar />
          <FooterBar />
        </div>
      )}
    </div>
  )
}