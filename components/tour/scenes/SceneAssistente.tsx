'use client'
// components/tour/scenes/SceneAssistente.tsx

import Image from 'next/image'
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
const DUPLICATED_CAROUSEL = Array.from({ length: 6 }, () => CAROUSEL_ITEMS).flat()

const SUB_SEQUENCE: SubMode[] = ['padrao', 'texto', 'full']
const SUB_DURATION = 3500

// SVGs dos botões do SlugHeader (mesmos do código original)
const BtnShopSVG  = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
const BtnFullSVG  = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
const BtnLinkSVG  = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
const BtnUserSVG  = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
const BtnKioskSVG = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
const BtnLockSVG  = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
const BtnSunSVG   = () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>

const NAV_BTNS = [BtnShopSVG, BtnFullSVG, BtnLinkSVG, BtnUserSVG, BtnKioskSVG, BtnLockSVG, BtnSunSVG]

interface SceneAssistenteProps {
  isSpeaking: boolean
  theme?: 'dark' | 'light'
}

export default function SceneAssistente({ isSpeaking, theme = 'dark' }: SceneAssistenteProps) {
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

  const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden relative transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >

      {/* ══════════════════════════════════════
          MODO PADRÃO
          ══════════════════════════════════════ */}
      {subMode === 'padrao' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />

          {/* Split cards — cada card é position:relative com aspectRatio 1/1
              O halo do avatar fica em overflow:visible fora do card mas não
              afeta o layout porque o card tem position:relative e tamanho fixo */}
          <div className="flex-1 flex min-h-0 p-3 gap-3 items-start justify-center">

            {/* Card esquerdo: avatar */}
            <div className="relative flex-shrink-0"
              style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              {/* Fundo do card — overflow hidden para não vazar */}
              <div className="absolute inset-0 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
              {/* Avatar — overflow visible para o halo */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ overflow: 'visible' }}>
                <div style={{ width: '68%', aspectRatio: '1/1' }}>
                  <AvatarFace isSpeaking={isSpeaking} isListening={false} isProcessing={false}
                    theme="dark" avatarType={isSpeaking ? 'orb' : 'face'} hasActivePlan />
                </div>
              </div>
            </div>

            {/* Card direito: mic + wake word + input */}
            <div className="relative flex-shrink-0"
              style={{ width: 'min(46%, 46vh)', aspectRatio: '1/1' }}>
              <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 px-3 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Botão mic */}
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 'clamp(28px, 7%, 52px)', height: 'clamp(28px, 7%, 52px)',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    style={{ width: '55%', height: '55%' }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
                <p className="text-white/30 text-center leading-none" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.56rem)' }}>
                  clique para falar ou
                </p>
                <p className="text-white font-bold text-center leading-snug" style={{ fontSize: 'clamp(0.52rem, 1.3vw, 0.75rem)' }}>
                  diga: "minhAi" + sua solicitação
                </p>
                <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"
                      style={{ width: '55%', height: '55%' }}>
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-white/20" style={{ fontSize: 'clamp(0.36rem, 0.85vw, 0.46rem)' }}>
                  Pressione Enter para enviar
                </p>
              </div>
            </div>
          </div>

          <CarouselBar />
          <FooterBar />
        </div>
      )}

      {/* ══════════════════════════════════════
          MODO TEXTO
          ══════════════════════════════════════ */}
      {subMode === 'texto' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          <MockHeader />

          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            <p className="text-white font-bold text-center"
              style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.4rem)' }}>
              Como Posso te Ajudar Hoje?
            </p>
          </div>

          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.52rem, 1.2vw, 0.68rem)' }}>
                Ou digite sua mensagem...
              </div>
              <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: 'clamp(26px, 5.5vw, 36px)', height: 'clamp(26px, 5.5vw, 36px)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"
                  style={{ width: '55%', height: '55%' }}>
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

      {/* ══════════════════════════════════════
          MODO FULL
          ══════════════════════════════════════ */}
      {subMode === 'full' && (
        <div className="absolute inset-0 flex flex-col" style={{ background: BG }}>
          {/* Header full: logo minhAi esquerda + circle direita (igual print 3) */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <Image src="/logo.png" alt="minhAi" width={72} height={24} className="object-contain" style={{ height: 'clamp(14px, 3vw, 22px)', width: 'auto' }} />
            <Image src="/logo-circle.png" alt="minhAi" width={32} height={32} className="rounded-lg object-contain" style={{ width: 'clamp(20px, 4vw, 28px)', height: 'clamp(20px, 4vw, 28px)' }} />
          </div>

          {/* Avatar + textos agrupados no centro */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
            <div style={{ width: 'clamp(100px, 26vw, 220px)', aspectRatio: '1/1' }}>
              <AvatarFace
                isSpeaking={isSpeaking} isListening={false} isProcessing={false}
                theme="dark" avatarType={isSpeaking ? 'orb' : 'face'} hasActivePlan
              />
            </div>
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

      <style>{`
        @keyframes scene-assistente-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${parseFloat(((1/6)*100).toFixed(4))}%); }
        }
      `}</style>
    </div>
  )
}

/* ── Header mock padrão/texto — replica SlugHeader real ── */
function MockHeader() {
  const SZ = 'clamp(14px, 3vw, 20px)'
  return (
    <div
      className="flex items-center justify-between px-3 py-2 flex-shrink-0"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(to right, rgba(15,23,42,0.8), rgba(30,41,59,0.7), rgba(15,23,42,0.8))',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Esquerda: logo café + nome + badge + role */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Logo café — xícara laranja igual ao SceneWidget */}
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 'clamp(20px, 4.5vw, 28px)', height: 'clamp(20px, 4.5vw, 28px)', background: '#de691b' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ width: '60%', height: '60%' }}>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
            <path d="M3 21h18" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white leading-none truncate" style={{ fontSize: 'clamp(0.58rem, 1.4vw, 0.8rem)' }}>
              Café Exemplo
            </span>
            {/* Badge verificado */}
            <span className="inline-flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 'clamp(9px, 1.8vw, 13px)', height: 'clamp(9px, 1.8vw, 13px)', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: '65%', height: '65%' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <span className="uppercase tracking-wider" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', color: 'rgba(255,255,255,0.3)' }}>
            Agente IA
          </span>
        </div>
      </div>

      {/* Direita: botões com SVGs reais + separador + logo minhAi */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {NAV_BTNS.map((BtnIcon, i) => (
          <div key={i}
            className="rounded-lg flex items-center justify-center flex-shrink-0 text-white/40"
            style={{
              width: 'clamp(16px, 3.5vw, 22px)', height: 'clamp(16px, 3.5vw, 22px)',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '2px',
            }}
          >
            <BtnIcon />
          </div>
        ))}
        {/* Separador vertical */}
        <div className="w-px mx-1 self-stretch" style={{ background: 'rgba(255,255,255,0.1)' }} />
        {/* Logo minhAi */}
        <Image src="/logo-circle.png" alt="minhAi" width={28} height={28}
          className="rounded-lg flex-shrink-0"
          style={{ width: 'clamp(18px, 4vw, 26px)', height: 'clamp(18px, 4vw, 26px)' }}
        />
      </div>
    </div>
  )
}

function CarouselBar() {
  return (
    <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 5, paddingBottom: 5 }}>
      <div className="flex gap-2 pl-2 w-max"
        style={{ animation: 'scene-assistente-scroll 16s linear infinite', willChange: 'transform' }}>
        {DUPLICATED_CAROUSEL.map((cat, i) => (
          <div key={i} className="flex-shrink-0 flex items-center rounded-xl"
            style={{
              fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', fontWeight: 600,
              color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)', borderLeftColor: cat.color, borderLeftWidth: 3,
              padding: '5px 10px', whiteSpace: 'nowrap',
            }}>
            {cat.name}
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterBar() {
  return (
    <div className="text-center px-3 py-1 flex-shrink-0"
      style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      suporte.<strong>minhai.app</strong> — Uma IA pra chamar de sua!
    </div>
  )
}
