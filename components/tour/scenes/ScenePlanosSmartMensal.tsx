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
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.72rem)' }}>
            minhAi Smart — Planos Mensais
          </span>
        </div>
        <span className="text-white/30" style={{ fontSize: 'clamp(0.42rem, 0.9vw, 0.55rem)' }}>
          Cancele quando quiser
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-4 py-4 overflow-hidden">

        {/* Plano Top */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col justify-between"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-white/40 uppercase font-semibold tracking-wider" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>Mensal</p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 1rem)' }}>Top</p>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white" style={{ fontSize: 'clamp(1rem, 2.6vw, 1.5rem)' }}>R$ 49,90</span>
              <span className="text-white/35" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>/mês</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {TOP_FEATURES.slice(0, topVisible).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-white/65" style={{ fontSize: 'clamp(0.45rem, 1vw, 0.6rem)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plano Consulting */}
        <div
          className="flex-1 rounded-2xl p-4 flex flex-col justify-between relative"
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
            style={{ top: -9, right: 10, background: '#f59e0b', color: '#000', fontSize: 'clamp(0.32rem, 0.75vw, 0.44rem)' }}
          >
            RECOMENDADO
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-white/40 uppercase font-semibold tracking-wider" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>Mensal</p>
            <p className="font-bold text-white" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 1rem)' }}>Consulting</p>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white" style={{ fontSize: 'clamp(1rem, 2.6vw, 1.5rem)' }}>R$ 299,90</span>
              <span className="text-white/35" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>/mês</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {CONSULTING_FEATURES.slice(0, consultingVisible).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
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
