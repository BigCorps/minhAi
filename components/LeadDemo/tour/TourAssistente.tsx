'use client'
// components/LeadDemo/tour/TourAssistente.tsx
// Adaptação standalone de SceneAssistente para o LeadDemoTourOverlay.
// Usa avatar SVG inline (sem AvatarFace) para evitar dependências cruzadas.

import { useEffect, useState } from 'react'

// ── Tipos e constantes ───────────────────────────────────────────

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

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

// ── Avatar blob inline ───────────────────────────────────────────
// Substitui <AvatarFace> para evitar dependência do contexto do assistente real.

function SimpleOrb({ size = 120 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Anéis externos */}
      {[90, 75, 60].map((pct, i) => (
        <div
          key={pct}
          className="absolute rounded-full border"
          style={{
            width: `${pct}%`, height: `${pct}%`,
            borderColor: 'rgba(16,185,129,0.2)',
            animation: `tour-orb-ring 3s ease-in-out infinite ${i * 0.35}s`,
          }}
        />
      ))}
      {/* Blob central */}
      <div
        style={{
          width: '52%', height: '52%',
          background: 'radial-gradient(circle at 38% 32%, #93c5fd, #3b82f6 55%, #1d4ed8)',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
          boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.2)',
          animation: 'tour-orb-blob 4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes tour-orb-ring {
          0%,100% { transform: scale(1);    opacity: 0.6; }
          50%     { transform: scale(1.05); opacity: 1;   }
        }
        @keyframes tour-orb-blob {
          0%,100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: scale(1);    }
          33%     { border-radius: 70% 30% 40% 60% / 50% 40% 60% 50%;                          }
          66%     { border-radius: 30% 70% 60% 40% / 60% 50% 40% 50%; transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}

// ── Subcomponentes comuns ────────────────────────────────────────

function MockHeader() {
  const MODE_ICONS = [
    // Shop
    <svg key="shop" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    // Full
    <svg key="full" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>,
    // Link
    <svg key="link" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    // User
    <svg key="user" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    // Kiosk
    <svg key="kiosk" className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>,
  ]

  return (
    <div
      className="flex items-center justify-between px-3 py-2 flex-shrink-0"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(to right, rgba(15,23,42,0.8), rgba(30,41,59,0.7), rgba(15,23,42,0.8))',
      }}
    >
      {/* Esquerda: logo + nome */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 'clamp(20px, 4.5vw, 28px)', height: 'clamp(20px, 4.5vw, 28px)', background: '#de691b' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
            style={{ width: '60%', height: '60%' }}>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M6 2v2M10 2v2M14 2v2M3 21h18" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white truncate" style={{ fontSize: 'clamp(0.58rem, 1.4vw, 0.8rem)' }}>
              Café Exemplo
            </span>
            <span
              className="inline-flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 12, height: 12, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: '65%', height: '65%' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <span className="uppercase tracking-wider text-white/30" style={{ fontSize: 'clamp(0.36rem, 0.85vw, 0.46rem)' }}>
            Agente IA
          </span>
        </div>
      </div>

      {/* Direita: botões de modo + logo */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {MODE_ICONS.map((Icon, i) => (
          <div
            key={i}
            className="rounded-lg flex items-center justify-center flex-shrink-0 text-white/40"
            style={{
              width: 'clamp(16px, 3.5vw, 22px)', height: 'clamp(16px, 3.5vw, 22px)',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              padding: 2,
            }}
          >
            {Icon}
          </div>
        ))}
        <div className="w-px mx-1 self-stretch" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <img src="/logo-circle.png" alt="minhAi"
          style={{ width: 'clamp(18px, 4vw, 26px)', height: 'clamp(18px, 4vw, 26px)', borderRadius: 6 }}
        />
      </div>
    </div>
  )
}

function CarouselBar() {
  return (
    <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 5, paddingBottom: 5 }}>
      <div
        className="flex gap-2 pl-2 w-max"
        style={{ animation: `tour-assistente-scroll 16s linear infinite`, willChange: 'transform' }}
      >
        {DUPLICATED.map((cat, i) => (
          <div key={i} className="flex-shrink-0 flex items-center rounded-xl"
            style={{
              fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', fontWeight: 600,
              color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${cat.color}`,
              padding: '5px 10px', whiteSpace: 'nowrap',
            }}
          >
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
}

function FooterBar() {
  return (
    <div className="text-center px-3 py-1 flex-shrink-0"
      style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <strong>minhai.app</strong> — Uma IA pra chamar de sua!
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────

export default function TourAssistente() {
  const [subMode, setSubMode] = useState<SubMode>('padrao')
  const [visible, setVisible] = useState(true)

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

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >

      {/* ── MODO PADRÃO ── */}
      {subMode === 'padrao' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />
          <div className="flex-1 flex min-h-0 p-3 gap-3 items-start justify-center">

            {/* Card avatar */}
            <div className="relative flex-shrink-0" style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              <div className="absolute inset-0 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
              <div className="absolute inset-0 flex items-center justify-center" style={{ overflow: 'visible' }}>
                <SimpleOrb size={110} />
              </div>
            </div>

            {/* Card mic + texto */}
            <div className="relative flex-shrink-0" style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              <div
                className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 px-3 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 'clamp(28px, 7vw, 48px)', height: 'clamp(28px, 7vw, 48px)',
                    background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
                    style={{ width: '55%', height: '55%' }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                </div>
                <p className="text-white/30 text-center leading-none" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.56rem)' }}>
                  clique para falar ou
                </p>
                <p className="text-white font-bold text-center leading-snug" style={{ fontSize: 'clamp(0.52rem, 1.3vw, 0.75rem)' }}>
                  diga: "minhAi" + sua solicitação
                </p>
                <p className="text-white/20 text-center" style={{ fontSize: 'clamp(0.36rem, 0.85vw, 0.46rem)' }}>
                  Utilize a palavra de ativação apenas no modo voz.
                </p>
                <div className="w-full flex items-center gap-1.5">
                  <div className="flex-1 rounded-lg px-2 py-1"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.42rem, 1vw, 0.56rem)' }}>
                    Ou digite sua mensagem...
                  </div>
                  <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ width: 'clamp(18px, 4.5vw, 26px)', height: 'clamp(18px, 4.5vw, 26px)',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}
                      strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
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

      {/* ── MODO TEXTO ── */}
      {subMode === 'texto' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />
          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.4rem)' }}>
              Como Posso te Ajudar Hoje?
            </p>
          </div>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.52rem, 1.2vw, 0.68rem)' }}>
                Ou digite sua mensagem...
              </div>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 'clamp(26px, 5.5vw, 36px)', height: 'clamp(26px, 5.5vw, 36px)',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}
                  strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
            </div>
            <p className="text-white/20 text-center mt-1" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
              Pressione Enter para enviar
            </p>
          </div>
          <CarouselBar />
          <FooterBar />
        </div>
      )}

      {/* ── MODO FULL (imersivo) ── */}
      {subMode === 'full' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <img src="/logo.png" alt="minhAi"
              style={{ height: 'clamp(14px, 3vw, 22px)', width: 'auto', objectFit: 'contain' }} />
            <img src="/logo-circle.png" alt="minhAi"
              style={{ width: 'clamp(20px, 4vw, 28px)', height: 'clamp(20px, 4vw, 28px)', borderRadius: 6 }} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
            <SimpleOrb size={160} />
            <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.58rem)' }}>
              clique para falar
            </p>
            <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.62rem, 1.7vw, 0.95rem)' }}>
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