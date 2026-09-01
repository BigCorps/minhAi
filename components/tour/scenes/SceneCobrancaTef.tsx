'use client'
// components/tour/scenes/SceneCobrancaTef.tsx
// Maquininha Mercado Pago Point 2 — cobrança enviada → aguardando → confirmado

import { useEffect, useState, useRef } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

type Phase = 'input' | 'sending' | 'awaiting' | 'confirmed'

// ─── Point 2 SVG — estilo linhas, sem fills sólidos amarelos ────────────────
function MaquinhaPoint2({ phase }: { phase: Phase }) {
  const isConfirmed = phase === 'confirmed'
  const bodyColor   = '#F5C800'   // amarelo só em stroke/linha
  const screenColor = isConfirmed ? '#10b981' : '#3b82f6'

  return (
    <svg
      viewBox="0 0 180 310"
      style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.5))' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="screenGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1e293b"/>
          <stop offset="100%" stopColor="#0a1120"/>
        </linearGradient>
        <clipPath id="sc2">
          <rect x="30" y="65" width="120" height="182" rx="5"/>
        </clipPath>
      </defs>

      {/* ── Sombra base ── */}
      <ellipse cx="90" cy="305" rx="65" ry="7" fill="rgba(0,0,0,0.3)"/>

      {/* ── Corpo externo — só stroke amarelo ── */}
      <rect x="12" y="28" width="156" height="266" rx="20"
        fill="rgba(245,200,0,0.06)" stroke={bodyColor} strokeWidth="2.5"/>

      {/* ── Face lateral direita (linha de profundidade) ── */}
      <path d="M168 46 L176 54 L176 282 L168 292"
        fill="none" stroke={bodyColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>

      {/* ── Seção impressora no topo ── */}
      <rect x="12" y="18" width="156" height="24" rx="10"
        fill="rgba(245,200,0,0.08)" stroke={bodyColor} strokeWidth="2" strokeDasharray="0"/>
      {/* Fenda da impressora */}
      <rect x="32" y="26" width="116" height="5" rx="2.5"
        fill="rgba(0,0,0,0.5)" stroke="rgba(245,200,0,0.3)" strokeWidth="0.8"/>
      {/* Sensor / câmera topo */}
      <circle cx="90" cy="11" r="5" fill="none" stroke="rgba(245,200,0,0.5)" strokeWidth="1.2"/>
      <circle cx="90" cy="11" r="2" fill="rgba(245,200,0,0.2)"/>

      {/* ── Leitor de aproximação — arcos NFC no topo ── */}
      <path d="M66 22 Q90 16 114 22" fill="none" stroke="rgba(245,200,0,0.35)" strokeWidth="1" strokeLinecap="round"/>

      {/* ── Tela ── */}
      <rect x="30" y="65" width="120" height="182" rx="5"
        fill="url(#screenGrad2)" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"/>

      {/* ── Conteúdo da tela ── */}
      <g clipPath="url(#sc2)">
        {/* Status bar */}
        <rect x="30" y="65" width="120" height="13" fill="rgba(0,0,0,0.45)"/>
        <text x="38" y="74.5" fill="rgba(255,255,255,0.55)" fontSize="6" fontFamily="monospace">12:30</text>
        <text x="143" y="74.5" fill="rgba(255,255,255,0.55)" fontSize="6" fontFamily="monospace" textAnchor="end">●● ▲</text>

        {/* FASE: input / sending */}
        {(phase === 'input' || phase === 'sending') && (
          <>
            <rect x="30" y="78" width="120" height="20" fill="rgba(59,130,246,0.12)"/>
            <text x="90" y="91" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              Seus produtos
            </text>
            {/* Underline campo valor */}
            <line x1="38" y1="116" x2="142" y2="116" stroke="#3b82f6" strokeWidth="1.2" opacity="0.6"/>
            <text x="38" y="112" fill="rgba(255,255,255,0.35)" fontSize="5.5" fontFamily="sans-serif">Valor</text>
            <text x="90" y="130" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold" fontFamily="sans-serif">
              R$ 149,70
            </text>
            <text x="90" y="140" textAnchor="middle" fill="rgba(96,165,250,0.6)" fontSize="5.5" fontFamily="sans-serif">
              Adicionar descrição
            </text>
            {/* Teclado 3×4 */}
            {[['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','+']].map((row, ri) =>
              row.map((k, ci) => {
                const kx = 37 + ci * 35, ky = 148 + ri * 23
                const isPlus = k === '+', isDel = k === '⌫'
                return (
                  <g key={`${ri}-${ci}`}>
                    <rect x={kx} y={ky} width="28" height="17" rx="3"
                      fill={isPlus ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}
                      stroke={isPlus ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'} strokeWidth="0.6"/>
                    <text x={kx+14} y={ky+12} textAnchor="middle"
                      fill={isPlus ? '#93c5fd' : isDel ? '#f87171' : 'rgba(255,255,255,0.8)'}
                      fontSize={9} fontFamily="sans-serif">
                      {k}
                    </text>
                  </g>
                )
              })
            )}
            {/* Botão Cobrar */}
            <rect x="37" y="244" width="106" height="15" rx="4"
              fill={phase === 'sending' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.35)'}
              stroke="rgba(59,130,246,0.6)" strokeWidth="1"/>
            <text x="90" y="254.5" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              {phase === 'sending' ? 'Enviando...' : 'Cobrar'}
            </text>
          </>
        )}

        {/* FASE: awaiting */}
        {phase === 'awaiting' && (
          <>
            <rect x="30" y="78" width="120" height="20" fill="rgba(59,130,246,0.12)"/>
            <text x="90" y="91" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              Aproxime ou insira
            </text>
            <text x="90" y="128" textAnchor="middle" fill="white" fontSize="19" fontWeight="bold" fontFamily="sans-serif">
              R$ 149,70
            </text>
            <text x="90" y="140" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontFamily="sans-serif">
              3× de R$ 49,90 crédito
            </text>
            {/* NFC pulsante */}
            <circle cx="90" cy="178" r="8" fill="none" stroke="#3b82f6" strokeWidth="1.5">
              <animate attributeName="r" values="8;18;8" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="90" cy="178" r="8" fill="none" stroke="#60a5fa" strokeWidth="1.5"/>
            <path d="M84 174 Q90 169 96 174" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M81 177 Q90 169 99 177" fill="none" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
            <circle cx="90" cy="178" r="2" fill="#60a5fa"/>
            <text x="90" y="204" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="sans-serif">
              Aguardando cartão...
            </text>
            {/* Progress bar */}
            <rect x="46" y="213" width="88" height="2.5" rx="1.25" fill="rgba(255,255,255,0.08)"/>
            <rect x="46" y="213" width="88" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7">
              <animate attributeName="width" values="0;88;0" dur="2s" repeatCount="indefinite"/>
            </rect>
          </>
        )}

        {/* FASE: confirmed */}
        {phase === 'confirmed' && (
          <>
            <text x="90" y="108" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              PAGAMENTO
            </text>
            <text x="90" y="119" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              APROVADO
            </text>
            <circle cx="90" cy="158" r="22" fill="none" stroke="#10b981" strokeWidth="1.8"/>
            <polyline points="79,158 87,166 103,148" fill="none"
              stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="90" y="198" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
              R$ 149,70
            </text>
            <text x="90" y="210" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="6" fontFamily="sans-serif">
              3× de R$ 49,90
            </text>
            <rect x="44" y="222" width="92" height="13" rx="3"
              fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="0.8"/>
            <text x="90" y="231.5" textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
              Imprimir comprovante
            </text>
          </>
        )}
      </g>

      {/* ── Botões azuis laterais esquerdos — stroke only ── */}
      <rect x="7" y="102" width="7" height="20" rx="3"
        fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth="1.2"/>
      <rect x="7" y="128" width="7" height="14" rx="3"
        fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth="1.2"/>

      {/* ── Leitor de chip na base — linhas ── */}
      <rect x="48" y="284" width="84" height="10" rx="3"
        fill="rgba(0,0,0,0.3)" stroke="rgba(245,200,0,0.3)" strokeWidth="1"/>
      <line x1="66" y1="284" x2="66" y2="294" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
      <line x1="82" y1="284" x2="82" y2="294" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
      <line x1="98" y1="284" x2="98" y2="294" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
      <line x1="114" y1="284" x2="114" y2="294" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>

      {/* ── Leitor de tarja magnética lateral — linha ── */}
      <line x1="168" y1="82" x2="168" y2="148"
        stroke="rgba(245,200,0,0.35)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Mão com cartão aproximando — dedos integrados ao corpo ─────────────────
function HandCard({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: '4%',
      right: '-22%',
      width: '60%',
      opacity: visible ? 1 : 0,
      transition: 'opacity 600ms ease',
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 130 180" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="cg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#1e3a5f"/>
            <stop offset="100%" stopColor="#0f1f35"/>
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
            fill="url(#cg2)" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5"/>
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
            •••• •••• •••• 4291
          </text>
          {/* Ondas NFC */}
          <path d="M82 26 Q88 36 82 46"  fill="none" stroke="rgba(96,165,250,0.6)" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M87 22 Q96 36 87 50"  fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M92 18 Q104 36 92 54" fill="none" stroke="rgba(96,165,250,0.22)" strokeWidth="0.9" strokeLinecap="round"/>

          {/* ── Mão — palma + dedos como shape único conectado ── */}
          {/*
            Estratégia: palma como retângulo arredondado,
            dedos como extensões que nascem da borda superior da palma.
            Tudo em stroke only, sem fill sólido.
          */}

          {/* Palma */}
          <rect x="14" y="96" width="96" height="72" rx="10"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>

          {/* Dedo indicador */}
          <path d="M26 96 L26 72 Q26 64 33 64 Q40 64 40 72 L40 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Dedo médio */}
          <path d="M43 96 L43 68 Q43 60 50 60 Q57 60 57 68 L57 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Dedo anelar */}
          <path d="M60 96 L60 72 Q60 64 67 64 Q74 64 74 72 L74 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
          {/* Dedo mínimo */}
          <path d="M77 96 L77 80 Q77 72 84 72 Q91 72 91 80 L91 96"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>

          {/* Polegar — lateral esquerda da palma */}
          <path d="M14 118 Q6 118 4 110 Q2 100 8 96 Q12 93 14 98"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4"/>
        </g>
      </svg>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function SceneCobrancaTef() {
  const [phase, setPhase]           = useState<Phase>('input')
  const [installments, setInstallments] = useState(1)
  const [loopKey, setLoopKey]       = useState(0)

  useEffect(() => {
    setPhase('input')
    setInstallments(1)

    const t1 = setTimeout(() => setInstallments(3), 1000)
    const t2 = setTimeout(() => setPhase('sending'),   2200)
    const t3 = setTimeout(() => setPhase('awaiting'),  3400)
    const t4 = setTimeout(() => setPhase('confirmed'), 6500)
    const t5 = setTimeout(() => setLoopKey(k => k + 1), 9800)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5) }
  }, [loopKey])

  const valor   = 149.70
  const parcela = (valor / installments).toFixed(2).replace('.', ',')

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
            background: 'rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2}
              strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold"
            style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            TEF — Mercado Pago Point
          </span>
        </div>
        {phase === 'confirmed' && (
          <div className="rounded-full px-2 py-0.5"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="font-bold"
              style={{ color: '#10b981', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
              ✓ Pago
            </span>
          </div>
        )}
      </div>

      {/* ── Corpo ── */}
      <div className="flex-1 min-h-0 flex gap-0 overflow-hidden items-stretch">

        {/* Coluna esquerda — maquinha (~50% da largura) */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: '48%', padding: '12px 4px 12px 12px', position: 'relative' }}
        >
          <div style={{ width: '100%', maxHeight: '100%', position: 'relative' }}>
            <MaquinhaPoint2 phase={phase} />
            {/* Mão com cartão — aparece na fase awaiting */}
            <HandCard visible={phase === 'awaiting'} />
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '12px 0' }}/>

        {/* Coluna direita — status */}
        <div className="flex-1 flex flex-col justify-center gap-2 overflow-hidden"
          style={{ padding: '8px 10px 8px 10px' }}>

          {/* Valor */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Valor total
            </p>
            <p className="font-bold" style={{ fontSize: '1.25rem', color: '#60a5fa', margin: '1px 0 0' }}>
              R$ {valor.toFixed(2).replace('.', ',')}
            </p>
            <div className="flex items-center gap-1" style={{ transition: 'all 300ms ease', marginTop: 2 }}>
              <span className="font-semibold" style={{ color: '#fbbf24', fontSize: '0.65rem' }}>
                {installments === 1 ? 'À vista' : `${installments}× de R$ ${parcela}`}
              </span>
              {installments > 1 && (
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)' }}>
                  crédito
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {[
              { label: 'Cobrança criada',           done: ['sending','awaiting','confirmed'].includes(phase) },
              { label: 'Enviada para a maquininha',  done: ['awaiting','confirmed'].includes(phase) },
              { label: 'Aguardando cartão',           done: ['awaiting','confirmed'].includes(phase), active: phase === 'awaiting' },
              { label: 'Pagamento confirmado',        done: phase === 'confirmed' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: s.done
                      ? (i === 3 ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)')
                      : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${s.done
                      ? (i === 3 ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)')
                      : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 300ms ease',
                  }}
                >
                  {s.done && (
                    <svg viewBox="0 0 24 24" fill="none"
                      stroke={i === 3 ? '#10b981' : '#3b82f6'}
                      strokeWidth={3} strokeLinecap="round"
                      style={{ width: 9, height: 9 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {s.active && !s.done && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#3b82f6', display: 'block',
                      animation: 'tef-pulse 1s infinite',
                    }}/>
                  )}
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  color: s.done ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 300ms ease',
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Label contextual */}
          <p style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0, margin: 0 }}>
            {phase === 'input'     && 'Parcelamento em até 12×'}
            {phase === 'sending'   && 'Enviando cobrança...'}
            {phase === 'awaiting'  && 'Aproxime, insira ou passe o cartão'}
            {phase === 'confirmed' && 'Comprovante impresso na maquininha'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes tef-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
      `}</style>
    </div>
  )
}
