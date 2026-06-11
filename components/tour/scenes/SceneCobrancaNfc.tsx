'use client'
// components/tour/scenes/SceneCobrancaNfc.tsx
// Android com NFC — app abre → cliente aproxima cartão → confirmado

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'
type Phase = 'idle' | 'app-open' | 'awaiting' | 'confirmed'

export default function SceneCobrancaNfc() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [cardNear, setCardNear] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('app-open'), 600)
    const t2 = setTimeout(() => setPhase('awaiting'), 1800)
    const t3 = setTimeout(() => setCardNear(true), 4000)
    const t4 = setTimeout(() => setPhase('confirmed'), 5200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

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
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinecap="round" style={{ width: 10, height: 10 }}>
              <rect x="5" y="2" width="14" height="20" rx="2"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            NFC — InfinitePay
          </span>
        </div>
        {phase === 'confirmed' && (
          <div className="rounded-full px-2 py-0.5" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <span className="font-bold" style={{ color: '#a78bfa', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>✓ Aprovado</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden items-center">

        {/* Celular Android */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div style={{ position: 'relative' }}>
            {/* Ondas NFC */}
            {phase === 'awaiting' && (
              <>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${40 + i * 20}px`,
                    height: `${40 + i * 20}px`,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(139,92,246,0.3)',
                    animation: `ping ${0.8 + i * 0.2}s ease-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </>
            )}
            {/* Corpo do celular */}
            <svg viewBox="0 0 50 90" style={{ width: 'clamp(36px, 7vw, 52px)', height: 'auto', position: 'relative', zIndex: 1 }}>
              <rect x="3" y="3" width="44" height="84" rx="7" fill="rgba(255,255,255,0.05)" stroke="#8b5cf6" strokeWidth="1.5"/>
              {/* Câmera */}
              <circle cx="25" cy="9" r="2" fill="rgba(255,255,255,0.2)"/>
              {/* Tela */}
              <rect x="7" y="16" width="36" height="56" rx="3" fill={phase === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.1)'} stroke={phase === 'confirmed' ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.2)'} strokeWidth="0.5"/>
              {/* Conteúdo tela */}
              {phase === 'idle' && (
                <text x="25" y="46" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="5">...</text>
              )}
              {phase === 'app-open' && (
                <>
                  <text x="25" y="36" textAnchor="middle" fill="#a78bfa" fontSize="4" fontWeight="bold">InfinitePay</text>
                  <text x="25" y="44" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="3.5">Cobrança NFC</text>
                  <text x="25" y="54" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold">R$ 57,50</text>
                  <text x="25" y="62" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="3">Débito</text>
                </>
              )}
              {phase === 'awaiting' && (
                <>
                  <text x="25" y="32" textAnchor="middle" fill="#a78bfa" fontSize="4" fontWeight="bold">InfinitePay</text>
                  <text x="25" y="40" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="3.5">R$ 57,50</text>
                  <text x="25" y="52" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="3.5">Aproxime o cartão</text>
                  {/* Ícone NFC */}
                  <path d="M20 58 Q25 54 30 58" stroke="#a78bfa" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M18 61 Q25 55 32 61" stroke="rgba(139,92,246,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                </>
              )}
              {phase === 'confirmed' && (
                <>
                  <text x="25" y="38" textAnchor="middle" fill="#10b981" fontSize="4" fontWeight="bold">Aprovado!</text>
                  <text x="25" y="48" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3.5">R$ 57,50</text>
                  <path d="M19 55 l4 4 8-8" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
              {/* Home button */}
              <circle cx="25" cy="82" r="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>
            </svg>
          </div>

          {/* Cartão se aproximando */}
          {cardNear && phase !== 'confirmed' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)',
              color: '#a78bfa',
              animation: 'fadeIn 300ms ease',
            }}>
              Cartão detectado
            </div>
          )}
        </div>

        {/* Info direita */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">

          {/* Valor */}
          <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="text-white/40" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Valor</p>
            <p className="font-bold" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)', color: '#a78bfa' }}>R$ 57,50</p>
            <p className="text-white/30" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Débito · InfinitePay</p>
          </div>

          {/* Vantagens */}
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {[
              { text: 'Qualquer Android com NFC', done: true },
              { text: 'Sem maquininha extra', done: true },
              { text: 'App abre automaticamente', done: true },
              { text: 'Débito e Crédito', done: true },
            ].map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/55" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{v.text}</span>
              </div>
            ))}
          </div>

          {/* Status final */}
          {phase === 'confirmed' && (
            <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="font-bold" style={{ color: '#34d399', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>✓ Pagamento aprovado</p>
              <p className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Processado pela InfinitePay</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ping { 75%,100%{transform:translate(-50%,-50%) scale(2);opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
