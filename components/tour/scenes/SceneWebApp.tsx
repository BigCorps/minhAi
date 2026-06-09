'use client'
// components/tour/scenes/SceneWebApp.tsx
// Criação do WebApp — subdomínio + domínio próprio + preview

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const SUBDOMAIN_TYPED = 'cafeexemplo'
const VANTAGENS = [
  'Link próprio para compartilhar',
  'App instalável no celular',
  'Página de links integrada',
  'Modo totem e quiosque',
  'Domínio próprio opcional',
]

export default function SceneWebApp() {
  const [subTyped, setSubTyped]       = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showVant, setShowVant]       = useState(false)
  const [vantCount, setVantCount]     = useState(0)

  // Digita subdomínio
  useEffect(() => {
    if (subTyped.length >= SUBDOMAIN_TYPED.length) return
    const t = setTimeout(() => setSubTyped(SUBDOMAIN_TYPED.slice(0, subTyped.length + 1)), 80)
    return () => clearTimeout(t)
  }, [subTyped])

  // Preview após subdomínio completo
  useEffect(() => {
    if (subTyped.length < SUBDOMAIN_TYPED.length) return
    const t = setTimeout(() => setShowPreview(true), 400)
    return () => clearTimeout(t)
  }, [subTyped])

  // Vantagens após preview
  useEffect(() => {
    if (!showPreview) return
    const t = setTimeout(() => setShowVant(true), 400)
    return () => clearTimeout(t)
  }, [showPreview])

  useEffect(() => {
    if (!showVant) return
    if (vantCount >= VANTAGENS.length) return
    const t = setTimeout(() => setVantCount(v => v + 1), 350)
    return () => clearTimeout(t)
  }, [showVant, vantCount])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
          Seu WebApp
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-2 px-3 py-3 overflow-hidden">

        {/* Esquerda — configuração */}
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">

          {/* Campo subdomínio */}
          <div>
            <p className="text-white/40 mb-1" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
              Escolha seu endereço
            </p>
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(255,255,255,0.04)' }}
            >
              <div
                className="px-2.5 py-1.5 font-mono font-semibold text-indigo-300 flex-1"
                style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}
              >
                {subTyped}<span className="animate-pulse opacity-60">|</span>
              </div>
              <div
                className="px-2 py-1.5 flex-shrink-0 text-white/30"
                style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '1px solid rgba(255,255,255,0.08)', fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}
              >
                .minhai.app
              </div>
            </div>
          </div>

          {/* Campo domínio próprio */}
          <div>
            <p className="text-white/40 mb-1" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
              Ou use seu domínio próprio
            </p>
            <div
              className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
            >
              <span className="text-white/25 font-mono" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
                www.cafeexemplo.com.br
              </span>
              <span
                className="ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}
              >
                Opcional
              </span>
            </div>
          </div>

          {/* Vantagens */}
          {showVant && (
            <div className="flex flex-col gap-1 flex-1 overflow-hidden">
              <p className="text-white/40 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
                Incluso no WebApp
              </p>
              {VANTAGENS.slice(0, vantCount).map((v, i) => (
                <div key={v} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-white/65" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview do WebApp */}
        <div
          className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
          style={{
            width: 'clamp(100px, 36%, 160px)',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#0f172a',
            opacity: showPreview ? 1 : 0,
            transform: showPreview ? 'scale(1)' : 'scale(0.95)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          {/* Browser bar */}
          <div className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 rounded-full px-2 py-0.5 text-center" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.32rem', color: 'rgba(255,255,255,0.35)' }}>
              cafeexemplo.minhai.app
            </div>
          </div>

          {/* Conteúdo mockado do WebApp */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/>
                <path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/><path d="M3 21h18"/>
              </svg>
            </div>
            <p className="text-white font-bold text-center" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Café Exemplo</p>
            <p className="text-white/40 text-center" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.4rem)' }}>Agente IA</p>
            <div className="w-full rounded-xl py-1.5 text-center font-bold text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>
              Falar com o Assistente
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}