'use client'
// components/tour/scenes/SceneInstagram.tsx

import { useEffect, useState } from 'react'

const MESSAGES = [
  { from: 'user', text: 'Oi! Vi no stories que tem promoção hoje', time: '10:15' },
  { from: 'bot', text: 'Oi! 🎉 Sim! 20% off em pedidos acima de R$50. Quer ver o cardápio?', time: '10:15' },
  { from: 'user', text: 'Sim! E como faço pra pedir?', time: '10:16' },
  { from: 'bot', text: 'Você pode pedir por aqui mesmo! Posso gerar um link de pagamento se quiser 👇', time: '10:16' },
]

export default function SceneInstagram() {
  const [visibleCount, setVisibleCount] = useState(1)

  useEffect(() => {
    if (visibleCount >= MESSAGES.length) {
      const t = setTimeout(() => setVisibleCount(1), 2500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisibleCount(v => v + 1), 1400)
    return () => clearTimeout(t)
  }, [visibleCount])

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: '#000' }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        {/* Avatar com borda gradient stories */}
        <div className="relative flex-shrink-0">
          <div className="rounded-full p-0.5" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
            <div className="rounded-full border-2 border-black flex items-center justify-center" style={{ width: 36, height: 36, background: '#3b82f6' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                <path d="M3 21h16" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-none">cafeexemplo</p>
          <p className="text-xs mt-0.5 text-white/50">Café Exemplo · Ativo agora</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden">
        {MESSAGES.slice(0, visibleCount).map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.from === 'bot' && (
              <div className="rounded-full flex-shrink-0 flex items-center justify-center" style={{ width: 24, height: 24, background: '#3b82f6' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                  <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                  <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                  <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                  <path d="M3 21h16" />
                </svg>
              </div>
            )}
            <div
              className="rounded-2xl px-3 py-2 max-w-[72%]"
              style={{
                fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)',
                background: msg.from === 'user' ? 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' : 'rgba(255,255,255,0.1)',
                color: 'white',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ── */}
      <div className="flex items-center gap-3 px-3 py-3 flex-shrink-0">
        <div className="flex-1 rounded-full border px-4 py-2 text-xs text-white/40" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          Mensagem...
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-6 h-6 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-6 h-6 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        </svg>
      </div>
    </div>
  )
}
