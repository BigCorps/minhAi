'use client'
// components/tour/scenes/ScenePlanosSmartMensal.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const TOP_FEATURES = [
  '50 créditos por mês',
  'Serviços Google',
  'Serviços Meta',
  'Linha de Produção',
  'QR Codes com seu logo',
  'Impressão Remota, Bluetooth ou Local',
]

const CONSULTING_FEATURES = [
  '300 créditos por mês',
  'Serviços Google',
  'Serviços Meta',
  'Linha de Produção',
  'QR Codes com seu logo',
  'Impressão Remota, Bluetooth ou Local',
  'Webapp com subdomínio',
  'Consultoria incluída',
]

export default function ScenePlanosSmartMensal() {
  const [topVisible, setTopVisible] = useState(0)
  const [consultingVisible, setConsultingVisible] = useState(0)
  const [phase, setPhase] = useState<'top' | 'both'>('top')

  useEffect(() => {
    if (topVisible >= TOP_FEATURES.length) return
    const t = setTimeout(() => setTopVisible(v => v + 1), 250)
    return () => clearTimeout(t)
  }, [topVisible])

  useEffect(() => {
    if (topVisible < TOP_FEATURES.length) return
    const t = setTimeout(() => setPhase('both'), 400)
    return () => clearTimeout(t)
  }, [topVisible])

  useEffect(() => {
    if (phase !== 'both') return
    if (consultingVisible >= CONSULTING_FEATURES.length) return
    const t = setTimeout(() => setConsultingVisible(v => v + 1), 200)
    return () => clearTimeout(t)
  }, [phase, consultingVisible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            minhAi Smart — Planos Mensais
          </span>
        </div>
        <span className="text-white/30" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
          Cancele quando quiser
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden">

        {/* Plano Top */}
        <div
          className="flex-1 rounded-2xl p-3 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Mensal</p>
          <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Top</p>
          <div className="flex items-baseline gap-1 mb-2 flex-shrink-0">
            <span className="font-bold text-white" style={{ fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)' }}>R$ 49,90</span>
            <span className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>/mês</span>
          </div>
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {TOP_FEATURES.slice(0, topVisible).map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 9, height: 9, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{f}</span>
              </div>
            ))}
          </div>
          <button
            className="w-full rounded-xl py-1.5 font-bold text-white flex-shrink-0 mt-2"
            style={{ background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.4)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}
          >
            Assinar Agora
          </button>
        </div>

        {/* Plano Consulting */}
        <div
          className="flex-1 rounded-2xl p-3 flex flex-col relative"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08))',
            border: '1px solid rgba(59,130,246,0.4)',
            opacity: phase === 'both' ? 1 : 0,
            transform: phase === 'both' ? 'scale(1)' : 'scale(0.97)',
            transition: 'all 400ms ease',
          }}
        >
          {/* Badge recomendado */}
          <div
            className="absolute rounded-full px-2 py-0.5 font-bold"
            style={{ top: -8, right: 8, background: '#f59e0b', color: '#000', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}
          >
            RECOMENDADO
          </div>
          <p className="text-white/40 uppercase font-semibold tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Mensal</p>
          <p className="font-bold text-white flex-shrink-0" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Consulting</p>
          <div className="flex items-baseline gap-1 mb-2 flex-shrink-0">
            <span className="font-bold text-white" style={{ fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)' }}>R$ 299,90</span>
            <span className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>/mês</span>
          </div>
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {CONSULTING_FEATURES.slice(0, consultingVisible).map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" style={{ width: 9, height: 9, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/70" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{f}</span>
              </div>
            ))}
          </div>
          <button
            className="w-full rounded-xl py-1.5 font-bold text-white flex-shrink-0 mt-2"
            style={{ background: '#3b82f6', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}
          >
            Assinar Agora
          </button>
        </div>
      </div>
    </div>
  )
}
