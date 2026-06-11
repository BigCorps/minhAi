'use client'
// components/tour/scenes/SceneCobrancaTef.tsx
// Maquininha Mercado Pago Point — cobrança enviada → aguardando → confirmado

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

type Phase = 'input' | 'sending' | 'awaiting' | 'confirmed'

function MaquinhaPoint({ color = '#3b82f6', pulse = false }: { color?: string; pulse?: boolean }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0.4,
          animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      )}
      <svg viewBox="0 0 60 100" style={{ width: 'clamp(40px, 8vw, 60px)', height: 'auto' }}>
        {/* Corpo */}
        <rect x="5" y="5" width="50" height="90" rx="8" fill="rgba(255,255,255,0.06)" stroke={color} strokeWidth="1.5"/>
        {/* Tela */}
        <rect x="10" y="12" width="40" height="28" rx="4" fill={`${color}20`} stroke={`${color}40`} strokeWidth="1"/>
        {/* Texto tela */}
        <text x="30" y="24" textAnchor="middle" fill={color} fontSize="5" fontWeight="bold">Mercado Pago</text>
        <text x="30" y="33" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="4">Point</text>
        {/* Leitor de cartão */}
        <rect x="10" y="46" width="40" height="8" rx="2" fill={`${color}15`} stroke={`${color}30`} strokeWidth="1"/>
        <text x="30" y="52" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="4">Inserir/Aproximar</text>
        {/* Teclado */}
        {[[14,62],[22,62],[30,62],[38,62],[46,62],
          [14,70],[22,70],[30,70],[38,70],[46,70],
          [14,78],[22,78],[30,78],[38,78],[46,78]].map(([cx, cy], i) => (
          <rect key={i} x={cx - 3} y={cy - 3} width="6" height="6" rx="1.5"
            fill={i === 11 ? '#ef4444' : i === 14 ? '#10b981' : 'rgba(255,255,255,0.12)'}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        ))}
        {/* Botão Power */}
        <circle cx="30" cy="90" r="4" fill={`${color}20`} stroke={color} strokeWidth="1"/>
      </svg>
    </div>
  )
}

export default function SceneCobrancaTef() {
  const [phase, setPhase] = useState<Phase>('input')
  const [installments, setInstallments] = useState(1)

  useEffect(() => {
    const t1 = setTimeout(() => { setInstallments(3); }, 1000)
    const t2 = setTimeout(() => setPhase('sending'), 2200)
    const t3 = setTimeout(() => setPhase('awaiting'), 3400)
    const t4 = setTimeout(() => setPhase('confirmed'), 6500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const valor = 149.70
  const parcela = (valor / installments).toFixed(2).replace('.', ',')

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            TEF — Mercado Pago Point
          </span>
        </div>
        {phase === 'confirmed' && (
          <div className="rounded-full px-2 py-0.5" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <span className="font-bold" style={{ color: '#60a5fa', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>✓ Pago</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden items-center">

        {/* Maquininha */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2">
          <MaquinhaPoint
            color={phase === 'confirmed' ? '#10b981' : '#3b82f6'}
            pulse={phase === 'awaiting'}
          />
          <p className="text-white/30 text-center" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
            {phase === 'input' && 'Conectada'}
            {phase === 'sending' && 'Recebendo...'}
            {phase === 'awaiting' && 'Aguardando cartão'}
            {phase === 'confirmed' && 'Aprovado!'}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">

          {/* Valor + parcelas */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Valor total</p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', color: '#60a5fa' }}>
              R$ {valor.toFixed(2).replace('.', ',')}
            </p>
            <div
              className="flex items-center gap-1 mt-0.5"
              style={{ transition: 'all 300ms ease' }}
            >
              <span className="font-semibold" style={{ color: '#fbbf24', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>
                {installments === 1 ? 'À vista' : `${installments}× de R$ ${parcela}`}
              </span>
              {installments > 1 && (
                <span className="text-white/30" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>crédito</span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
            {[
              { label: 'Cobrança criada', done: ['sending','awaiting','confirmed'].includes(phase) },
              { label: 'Enviada para a maquininha', done: ['awaiting','confirmed'].includes(phase) },
              { label: 'Aguardando cartão', done: ['awaiting','confirmed'].includes(phase), active: phase === 'awaiting' },
              { label: 'Pagamento confirmado', done: phase === 'confirmed' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: s.done ? (i === 3 ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)') : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${s.done ? (i === 3 ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)') : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 300ms ease',
                  }}
                >
                  {s.done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke={i === 3 ? '#10b981' : '#3b82f6'} strokeWidth={3} strokeLinecap="round" style={{ width: 8, height: 8 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {s.active && !s.done && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'block', animation: 'pulse 1s infinite' }} />
                  )}
                </div>
                <span style={{
                  fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)',
                  color: s.done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 300ms ease',
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Parcelas info */}
          {phase === 'input' && (
            <p className="text-white/25 flex-shrink-0" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              Parcelamento em até 12×
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes ping { 75%,100%{transform:scale(1.5);opacity:0} }`}</style>
    </div>
  )
}
