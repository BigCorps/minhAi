'use client'
// components/tour/scenes/SceneCobrancaLink.tsx
// Dois links — PIX (minhai.app/pix/slug) e InfinitePay (minhai.app/pay/slug)

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'
type ActiveLink = 'none' | 'pix' | 'pay'

export default function SceneCobrancaLink() {
  const [active, setActive] = useState<ActiveLink>('none')
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => { setActive('pix'); setStep(1) }, 600)
    const t2 = setTimeout(() => setStep(2), 2200)
    const t3 = setTimeout(() => { setActive('pay'); setStep(3) }, 4500)
    const t4 = setTimeout(() => setStep(4), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: 10, height: 10 }}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
          Links de Cobrança
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-3 overflow-hidden">

        {/* Card Link PIX */}
        <div
          className="rounded-xl p-3 flex gap-3 transition-all duration-300"
          style={{
            background: active === 'pix' ? 'rgba(50,188,173,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active === 'pix' ? 'rgba(50,188,173,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {/* QR mini */}
          <div
            className="flex-shrink-0 rounded-lg overflow-hidden"
            style={{
              width: 'clamp(36px, 8vw, 52px)',
              height: 'clamp(36px, 8vw, 52px)',
              background: 'white',
              padding: 4,
              opacity: step >= 2 ? 1 : 0.3,
              transition: 'opacity 400ms ease',
            }}
          >
            <img src="/qrcode.png" alt="QR Code" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(50,188,173,0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" style={{ width: '100%', height: '100%', padding: 2 }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <span className="font-bold text-white" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Link PIX</span>
              {step >= 1 && (
                <span className="rounded-full px-1.5 py-0.5 font-semibold ml-auto" style={{ background: 'rgba(50,188,173,0.15)', color: '#32bcad', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', border: '1px solid rgba(50,188,173,0.25)' }}>
                  Ativo
                </span>
              )}
            </div>
            <div
              className="rounded-lg px-2 py-1 font-mono truncate"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: step >= 1 ? '#32bcad' : 'rgba(255,255,255,0.2)',
                fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)',
                transition: 'color 300ms ease',
              }}
            >
              minhai.app/pix/cafeexemplo
            </div>
            <p className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              Cliente escolhe o valor · QR gerado na hora
            </p>
            {step >= 2 && (
              <div className="flex items-center gap-1 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#32bcad" strokeWidth={2.5} strokeLinecap="round" style={{ width: 8, height: 8 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ color: '#32bcad', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Sem valor fixo — ideal para cobranças variáveis</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Link InfinitePay */}
        <div
          className="rounded-xl p-3 flex gap-3 transition-all duration-300"
          style={{
            background: active === 'pay' ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${active === 'pay' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {/* Celular mini */}
          <div
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: 'clamp(36px, 8vw, 52px)',
              height: 'clamp(36px, 8vw, 52px)',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              opacity: step >= 4 ? 1 : 0.3,
              transition: 'opacity 400ms ease',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
              <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%', padding: 2 }}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </div>
              <span className="font-bold text-white" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Link InfinitePay</span>
              {step >= 3 && (
                <span className="rounded-full px-1.5 py-0.5 font-semibold ml-auto" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  Ativo
                </span>
              )}
            </div>
            <div
              className="rounded-lg px-2 py-1 font-mono truncate"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: step >= 3 ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)',
                transition: 'color 300ms ease',
              }}
            >
              minhai.app/pay/cafeexemplo
            </div>
            <p className="text-white/35" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              Cliente informa telefone · paga pelo celular
            </p>
            {step >= 4 && (
              <div className="flex items-center gap-1 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinecap="round" style={{ width: 8, height: 8 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ color: '#a78bfa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Ideal para WhatsApp, Instagram, bio, cardápio</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        {step >= 4 && (
          <div
            className="rounded-xl px-3 py-2 flex-shrink-0 flex items-center gap-2"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', opacity: step >= 4 ? 1 : 0, transition: 'opacity 400ms ease' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: 12, height: 12, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-white/50" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              Dois links diferentes · cada um com endereço próprio minhAi
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
