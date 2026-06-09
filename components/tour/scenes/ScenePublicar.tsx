'use client'
// components/tour/scenes/ScenePublicar.tsx
// Assistente criado — link, QR Code e canais de conexão

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
const LINK = 'cafeexemplo.minhai.app'

const CANAIS = [
  { nome: 'WhatsApp',  color: '#25D366', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )},
  { nome: 'Instagram', color: '#E1306C', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )},
  { nome: 'Facebook',  color: '#1877F2', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { nome: 'Site/Totem', color: '#6366f1', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )},
]

function MockQR() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <rect x="4" y="4" width="24" height="24" rx="2" fill="none" stroke="#3b82f6" strokeWidth="3"/>
      <rect x="10" y="10" width="12" height="12" rx="1" fill="#3b82f6"/>
      <rect x="52" y="4" width="24" height="24" rx="2" fill="none" stroke="#3b82f6" strokeWidth="3"/>
      <rect x="58" y="10" width="12" height="12" rx="1" fill="#3b82f6"/>
      <rect x="4" y="52" width="24" height="24" rx="2" fill="none" stroke="#3b82f6" strokeWidth="3"/>
      <rect x="10" y="58" width="12" height="12" rx="1" fill="#3b82f6"/>
      {[34,40,46,34,40,34,46,40,46,52,58,64,70,52,64,70,52,64,58,70,52,58,70].map((x, i) => {
        const positions = [[34,4],[40,4],[46,4],[34,12],[46,12],[34,20],[40,20],[46,20],[52,28],[58,28],[64,28],[70,28],[52,36],[70,36],[52,44],[58,44],[70,44],[34,52],[34,60],[40,60],[46,52],[46,60],[34,68],[40,68],[46,68]]
        if (i >= positions.length) return null
        return <rect key={i} x={positions[i][0]} y={positions[i][1]} width="4" height="4" fill="#3b82f6"/>
      })}
    </svg>
  )
}

export default function ScenePublicar() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= 3) return
    const t = setTimeout(() => setStep(v => v + 1), 800)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Assistente publicado
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{ background: 'rgba(132,204,22,0.15)', color: '#84cc16', border: '1px solid rgba(132,204,22,0.3)', fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}
        >
          Ao vivo agora
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 px-3 py-3 overflow-hidden">

        {/* QR Code */}
        <div
          className="flex-shrink-0 flex flex-col items-center gap-2"
          style={{
            width: 'clamp(80px, 28%, 120px)',
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          <div
            className="w-full rounded-xl p-2 bg-white"
            style={{ aspectRatio: '1/1' }}
          >
            <MockQR />
          </div>
          <p className="text-white/40 text-center" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
            QR Code pronto
          </p>
        </div>

        {/* Link e canais */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">

          {/* Link */}
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)',
              opacity: step >= 1 ? 1 : 0,
              transition: 'opacity 400ms ease 200ms',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <span className="text-blue-300 font-mono font-semibold truncate" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
              {LINK}
            </span>
            <div className="ml-auto flex-shrink-0 rounded-lg px-1.5 py-0.5" style={{ background: 'rgba(59,130,246,0.2)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', color: '#93c5fd' }}>
              Copiar
            </div>
          </div>

          {/* Canais */}
          <p
            className="text-white/40 font-semibold uppercase tracking-wider"
            style={{
              fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)',
              opacity: step >= 2 ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
          >
            Conectar canais
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {CANAIS.map((c, i) => (
              <div
                key={c.nome}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                style={{
                  background: `${c.color}10`,
                  border: `1px solid ${c.color}25`,
                  opacity: step >= 2 ? 1 : 0,
                  transform: step >= 2 ? 'translateY(0)' : 'translateY(6px)',
                  transition: `opacity 300ms ease ${i * 80}ms, transform 300ms ease ${i * 80}ms`,
                }}
              >
                <span style={{ color: c.color }}>{c.icon}</span>
                <span className="text-white/70 font-medium" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{c.nome}</span>
                <div className="ml-auto w-3 h-3 rounded-full flex-shrink-0" style={{ background: `${c.color}30`, border: `1px solid ${c.color}50` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth={2.5} strokeLinecap="round" className="w-full h-full p-0.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}