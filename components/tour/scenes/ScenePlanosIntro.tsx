'use client'
// components/tour/scenes/ScenePlanosIntro.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

export default function ScenePlanosIntro() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= 3) return
    const t = setTimeout(() => setStep(v => v + 1), 700)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="text-center px-4 pt-5 pb-3 flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.5rem, 1.1vw, 0.65rem)' }}>
          Planos e Preços
        </p>
        <p className="font-bold text-white mt-1" style={{ fontSize: 'clamp(1rem, 2.6vw, 1.5rem)' }}>
          Escolha o pacote <span style={{ color: '#b0cb1f' }}>ideal</span>
        </p>
      </div>

      {/* Tabs mockadas */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0 justify-center">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: step >= 1 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${step >= 1 ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 400ms ease' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)' }}>minhAi Smart</span>
          <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.38rem, 0.8vw, 0.48rem)' }}>créditos por uso</span>
        </div>
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: step >= 2 ? 'rgba(176,203,31,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${step >= 2 ? 'rgba(176,203,31,0.4)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 400ms ease' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b0cb1f' }} />
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)' }}>minhAi Vendas</span>
          <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: 'rgba(176,203,31,0.25)', color: '#b0cb1f', border: '1px solid rgba(176,203,31,0.3)', fontSize: 'clamp(0.38rem, 0.8vw, 0.48rem)' }}>GRÁTIS</span>
        </div>
      </div>

      {/* Dois cards lado a lado */}
      <div className="flex-1 min-h-0 flex gap-3 px-4 pb-4 overflow-hidden">
        {/* Smart */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col justify-between"
          style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 400ms ease',
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#3b82f6' }} />
              <p className="font-bold text-white" style={{ fontSize: 'clamp(0.72rem, 1.7vw, 1rem)' }}>minhAi Smart</p>
            </div>
            <p className="text-white/50" style={{ fontSize: 'clamp(0.5rem, 1.1vw, 0.65rem)', lineHeight: 1.4 }}>
              Funciona por créditos. Você compra, usa quando quiser.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              'Planos mensais com recursos avançados',
              'Pacotes de créditos avulsos',
              'Começa grátis com 20 créditos',
              'Mais de 100 funções disponíveis',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/70" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendas */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col justify-between"
          style={{
            background: 'rgba(176,203,31,0.08)',
            border: '1px solid rgba(176,203,31,0.25)',
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 400ms ease 200ms',
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#b0cb1f' }} />
              <p className="font-bold text-white" style={{ fontSize: 'clamp(0.72rem, 1.7vw, 1rem)' }}>minhAi Vendas</p>
            </div>
            <p className="text-white/50" style={{ fontSize: 'clamp(0.5rem, 1.1vw, 0.65rem)', lineHeight: 1.4 }}>
              Gratuito para o lojista. Paga só quando vender.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              'Sem mensalidade, sem créditos',
              '10% por venda confirmada',
              '18 funções incluídas',
              'PIX, NFC, Link e TEF',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/70" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
