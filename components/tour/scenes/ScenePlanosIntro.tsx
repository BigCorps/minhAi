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
      <div className="text-center px-4 pt-4 pb-2 flex-shrink-0">
        <p className="text-white/40 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
          Planos e Preços
        </p>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          Escolha o pacote <span style={{ color: '#b0cb1f' }}>ideal</span>
        </p>
      </div>

      {/* Tabs mockadas */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0 justify-center">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: step >= 1 ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${step >= 1 ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 400ms ease' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>minhAi Smart</span>
          <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>créditos por uso</span>
        </div>
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: step >= 2 ? 'rgba(176,203,31,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${step >= 2 ? 'rgba(176,203,31,0.4)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 400ms ease' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: '#b0cb1f' }} />
          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>minhAi Vendas</span>
          <span className="rounded-full px-1.5 py-0.5 font-bold" style={{ background: 'rgba(176,203,31,0.25)', color: '#b0cb1f', border: '1px solid rgba(176,203,31,0.3)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>GRÁTIS</span>
        </div>
      </div>

      {/* Dois cards lado a lado */}
      <div className="flex-1 min-h-0 flex gap-3 px-4 pb-4 overflow-hidden">
        {/* Smart */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col gap-2"
          style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 400ms ease',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6' }} />
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>minhAi Smart</p>
          </div>
          <p className="text-white/50" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
            Funciona por créditos. Você compra, usa quando quiser.
          </p>
          <div className="flex flex-col gap-1.5 mt-auto">
            {[
              'Planos mensais com recursos avançados',
              'Pacotes de créditos avulsos',
              'Começa grátis com 20 créditos',
              'Mais de 100 funções disponíveis',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendas */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col gap-2"
          style={{
            background: 'rgba(176,203,31,0.08)',
            border: '1px solid rgba(176,203,31,0.25)',
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 400ms ease 200ms',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#b0cb1f' }} />
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>minhAi Vendas</p>
          </div>
          <p className="text-white/50" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
            Gratuito para o lojista. Paga só quando vender.
          </p>
          <div className="flex flex-col gap-1.5 mt-auto">
            {[
              'Sem mensalidade, sem créditos',
              '10% por venda confirmada',
              '18 funções incluídas',
              'PIX, NFC, Link e TEF',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
