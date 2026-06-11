'use client'
// components/tour/scenes/SceneCobrancaNfc.tsx
// Android com NFC — app abre → cliente aproxima cartão → confirmado

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'
type Phase = 'idle' | 'app-open' | 'awaiting' | 'confirmed'

// ─── Celular Android SVG — stroke-only, mesma linguagem da maquininha ────────
function CelularNfc({ phase }: { phase: Phase }) {
  const isConfirmed = phase === 'confirmed'
  const isAwaiting  = phase === 'awaiting'
  const bodyColor   = '#8b5cf6'

  return (
    <svg
      viewBox="0 0 120 220"
      style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.5))' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nfcScreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b"/>
          <stop offset="100%" stopColor="#0a1120"/>
        </linearGradient>
        <clipPath id="nfcSc">
          <rect x="14" y="38" width="92" height="140" rx="4"/>
        </clipPath>
      </defs>

      {/* Sombra base */}
      <ellipse cx="60" cy="216" rx="44" ry="6" fill="rgba(0,0,0,0.3)"/>

      {/* Corpo principal — stroke-only roxo */}
      <rect x="8" y="8" width="104" height="204" rx="16"
        fill="rgba(139,92,246,0.06)" stroke={bodyColor} strokeWidth="2"/>

      {/* Face lateral direita (profundidade) */}
      <path d="M112 22 L118 28 L118 190 L112 196"
        fill="none" stroke={bodyColor} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>

      {/* Câmera — pill centralizado no topo */}
      <rect x="42" y="14" width="36" height="8" rx="4"
        fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
      <circle cx="60" cy="18" r="2.5" fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="1"/>
      <circle cx="60" cy="18" r="1" fill="rgba(139,92,246,0.3)"/>

      {/* Tela */}
      <rect x="14" y="38" width="92" height="140" rx="4"
        fill="url(#nfcScreenGrad)" stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>

      {/* ── Conteúdo da tela ── */}
      <g clipPath="url(#nfcSc)">
        {/* Status bar */}
        <rect x="14" y="38" width="92" height="12" fill="rgba(0,0,0,0.4)"/>
        <text x="20" y="47" fill="rgba(255,255,255,0.5)" fontSize="5" fontFamily="monospace">12:30</text>
        <text x="100" y="47" fill="rgba(255,255,255,0.5)" fontSize="5" fontFamily="monospace" textAnchor="end">●●</text>

        {/* FASE: idle */}
        {phase === 'idle' && (
          <text x="60" y="112" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="sans-serif">
            ···
          </text>
        )}

        {/* FASE: app-open */}
        {phase === 'app-open' && (
          <>
            {/* Header app */}
            <rect x="14" y="50" width="92" height="18" fill="rgba(139,92,246,0.15)"/>
            <text x="60" y="62" textAnchor="middle" fill="#a78bfa" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              InfinitePay
            </text>
            {/* Subtítulo */}
            <text x="60" y="82" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="sans-serif">
              Cobrança NFC
            </text>
            {/* Valor */}
            <text x="60" y="106" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="sans-serif">
              R$ 57,50
            </text>
            {/* Modalidade */}
            <rect x="36" y="114" width="48" height="12" rx="6"
              fill="rgba(139,92,246,0.2)" stroke="rgba(139,92,246,0.4)" strokeWidth="0.8"/>
            <text x="60" y="123" textAnchor="middle" fill="#a78bfa" fontSize="6" fontFamily="sans-serif">
              Débito
            </text>
            {/* Botão cobrar */}
            <rect x="24" y="148" width="72" height="16" rx="5"
              fill="rgba(139,92,246,0.3)" stroke="rgba(139,92,246,0.6)" strokeWidth="1"/>
            <text x="60" y="159.5" textAnchor="middle" fill="#c4b5fd" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              Iniciar cobrança
            </text>
          </>
        )}

        {/* FASE: awaiting */}
        {phase === 'awaiting' && (
          <>
            <rect x="14" y="50" width="92" height="18" fill="rgba(139,92,246,0.15)"/>
            <text x="60" y="62" textAnchor="middle" fill="#a78bfa" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              InfinitePay
            </text>

            {/* Valor */}
            <text x="60" y="88" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
              R$ 57,50
            </text>
            <text x="60" y="100" textAnchor="middle" fill="#fbbf24" fontSize="6" fontFamily="sans-serif">
              Débito
            </text>

            {/* NFC pulsante */}
            <circle cx="60" cy="128" r="6" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
              <animate attributeName="r" values="6;18;6" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="60" cy="128" r="6" fill="none" stroke="#a78bfa" strokeWidth="1.5"/>
            {/* Ícone NFC — arcos */}
            <path d="M54 124 Q60 119 66 124" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M51 127 Q60 119 69 127" fill="none" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
            <circle cx="60" cy="128" r="2" fill="#a78bfa"/>

            <text x="60" y="152" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="sans-serif">
              Aproxime o cartão...
            </text>
            {/* Progress */}
            <rect x="28" y="160" width="64" height="2" rx="1" fill="rgba(255,255,255,0.08)"/>
            <rect x="28" y="160" width="64" height="2" rx="1" fill="#8b5cf6" opacity="0.7">
              <animate attributeName="width" values="0;64;0" dur="2s" repeatCount="indefinite"/>
            </rect>
          </>
        )}

        {/* FASE: confirmed */}
        {phase === 'confirmed' && (
          <>
            <text x="60" y="82" textAnchor="middle" fill="#10b981" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
              APROVADO
            </text>
            {/* Check */}
            <circle cx="60" cy="118" r="20" fill="none" stroke="#10b981" strokeWidth="1.8"/>
            <polyline points="50,118 57,125 72,108" fill="none"
              stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="60" y="152" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
              R$ 57,50
            </text>
            <text x="60" y="163" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="sans-serif">
              Débito · InfinitePay
            </text>
          </>
        )}
      </g>

      {/* Botões laterais — stroke-only */}
      <rect x="4" y="72" width="5" height="22" rx="2.5"
        fill="rgba(139,92,246,0.1)" stroke={bodyColor} strokeWidth="1"/>
      <rect x="4" y="100" width="5" height="16" rx="2.5"
        fill="rgba(139,92,246,0.1)" stroke={bodyColor} strokeWidth="1"/>
      {/* Power button direita */}
      <rect x="111" y="80" width="5" height="18" rx="2.5"
        fill="rgba(139,92,246,0.1)" stroke={bodyColor} strokeWidth="1"/>

      {/* Chip NFC — losango no verso (parte traseira visível) */}
      <text x="60" y="200" textAnchor="middle" fill="rgba(139,92,246,0.3)" fontSize="5" fontFamily="sans-serif">
        NFC
      </text>

      {/* Ondas NFC pulsantes externas ao celular — fase awaiting */}
      {phase === 'awaiting' && (
        <>
          <circle cx="60" cy="108" r="58" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1">
            <animate attributeName="r" values="54;70;54" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="60" cy="108" r="46" fill="none" stroke="rgba(139,92,246,0.18)" strokeWidth="1">
            <animate attributeName="r" values="46;62;46" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
          </circle>
        </>
      )}
    </svg>
  )
}

// ─── Mão com cartão aproximando — dedos integrados, stroke-only ──────────────
function HandCard({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: '5%',
      right: '-20%',
      width: '58%',
      opacity: visible ? 1 : 0,
      transition: 'opacity 600ms ease',
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 130 180" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="nfcCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#2d1b69"/>
            <stop offset="100%" stopColor="#1a0f3d"/>
          </linearGradient>
        </defs>

        <g>
          <animateTransform
            attributeName="transform" type="translate"
            values="0,-20; 0,0; 0,0; 0,-20"
            keyTimes="0; 0.3; 0.75; 1"
            dur="2.8s" repeatCount="indefinite"
          />

          {/* ── Cartão ── */}
          <rect x="5" y="4" width="110" height="68" rx="8"
            fill="url(#nfcCardGrad)" stroke="rgba(167,139,250,0.5)" strokeWidth="1.5"/>
          {/* Chip */}
          <rect x="16" y="20" width="20" height="15" rx="2"
            fill="none" stroke="rgba(255,200,50,0.5)" strokeWidth="1"/>
          <line x1="16" y1="25" x2="36" y2="25" stroke="rgba(255,200,50,0.3)" strokeWidth="0.6"/>
          <line x1="16" y1="30" x2="36" y2="30" stroke="rgba(255,200,50,0.3)" strokeWidth="0.6"/>
          <line x1="22" y1="20" x2="22" y2="35" stroke="rgba(255,200,50,0.3)" strokeWidth="0.6"/>
          <line x1="28" y1="20" x2="28" y2="35" stroke="rgba(255,200,50,0.3)" strokeWidth="0.6"/>
          {/* Número */}
          <text x="60" y="62" textAnchor="middle"
            fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace" letterSpacing="2">
            •••• •••• •••• 7382
          </text>
          {/* Ondas NFC */}
          <path d="M82 26 Q88 36 82 46"  fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M87 22 Q96 36 87 50"  fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M92 18 Q104 36 92 54" fill="none" stroke="rgba(167,139,250,0.22)" strokeWidth="0.9" strokeLinecap="round"/>

          {/* ── Mão — palma + dedos integrados, stroke-only ── */}
          {/* Palma */}
          <rect x="14" y="96" width="96" height="72" rx="10"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Indicador */}
          <path d="M26 96 L26 72 Q26 64 33 64 Q40 64 40 72 L40 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Médio */}
          <path d="M43 96 L43 68 Q43 60 50 60 Q57 60 57 68 L57 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Anelar */}
          <path d="M60 96 L60 72 Q60 64 67 64 Q74 64 74 72 L74 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Mínimo */}
          <path d="M77 96 L77 80 Q77 72 84 72 Q91 72 91 80 L91 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Polegar */}
          <path d="M14 118 Q6 118 4 110 Q2 100 8 96 Q12 93 14 98"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
        </g>
      </svg>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function SceneCobrancaNfc() {
  const [phase, setPhase]   = useState<Phase>('idle')
  const [loopKey, setLoopKey] = useState(0)

  useEffect(() => {
    setPhase('idle')

    const t1 = setTimeout(() => setPhase('app-open'),  600)
    const t2 = setTimeout(() => setPhase('awaiting'),  1800)
    const t3 = setTimeout(() => setPhase('confirmed'), 5200)
    const t4 = setTimeout(() => setLoopKey(k => k + 1), 8500)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [loopKey])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: 'rgba(139,92,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2}
              strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <rect x="5" y="2" width="14" height="20" rx="2"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold"
            style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            NFC — InfinitePay
          </span>
        </div>
        {phase === 'confirmed' && (
          <div className="rounded-full px-2 py-0.5"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <span className="font-bold"
              style={{ color: '#a78bfa', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
              ✓ Aprovado
            </span>
          </div>
        )}
      </div>

      {/* ── Corpo ── */}
      <div className="flex-1 min-h-0 flex gap-0 overflow-hidden items-stretch">

        {/* Coluna esquerda — celular (~48% da largura) */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: '48%', padding: '12px 4px 12px 12px', position: 'relative' }}
        >
          <div style={{ width: '100%', maxHeight: '100%', position: 'relative' }}>
            <CelularNfc phase={phase} />
            <HandCard visible={phase === 'awaiting'} />
          </div>
        </div>

        {/* Divisor */}
        <div style={{
          width: '0.5px', background: 'rgba(255,255,255,0.06)',
          flexShrink: 0, margin: '12px 0',
        }}/>

        {/* Coluna direita — info */}
        <div className="flex-1 flex flex-col justify-center gap-2 overflow-hidden"
          style={{ padding: '8px 10px' }}>

          {/* Valor */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Valor
            </p>
            <p className="font-bold" style={{ fontSize: '1.25rem', color: '#a78bfa', margin: '1px 0 0' }}>
              R$ 57,50
            </p>
            <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
              Débito · InfinitePay
            </p>
          </div>

          {/* Vantagens */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {[
              'Qualquer Android com NFC',
              'Sem maquininha extra',
              'App abre automaticamente',
              'Débito e Crédito',
            ].map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6"
                    strokeWidth={2.5} strokeLinecap="round"
                    style={{ width: 8, height: 8 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)' }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Status final */}
          {phase === 'confirmed' && (
            <div className="rounded-xl px-3 py-2 flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="font-bold" style={{ color: '#34d399', fontSize: '0.65rem', margin: 0 }}>
                ✓ Pagamento aprovado
              </p>
              <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                Processado pela InfinitePay
              </p>
            </div>
          )}

          {/* Label contextual */}
          <p style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            {phase === 'idle'      && ''}
            {phase === 'app-open'  && 'Selecione o valor e a modalidade'}
            {phase === 'awaiting'  && 'Aproxime, insira ou passe o cartão'}
            {phase === 'confirmed' && 'Transação registrada com sucesso'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes nfc-ping {
          75%, 100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
