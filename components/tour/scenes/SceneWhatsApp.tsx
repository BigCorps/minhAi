'use client'
// components/tour/scenes/SceneWhatsApp.tsx

import { useEffect, useState } from 'react'

const MESSAGES = [
  { from: 'user', text: 'Oi, vocês abrem amanhã?', time: '14:02' },
  { from: 'bot', text: 'Olá! 😊 Sim, amanhã abrimos às 8h. Posso te ajudar com reserva ou pedido antecipado?', time: '14:02' },
  { from: 'user', text: 'Quero reservar uma mesa para 2 pessoas às 19h', time: '14:03' },
  { from: 'bot', text: '✅ Reserva confirmada! Mesa para 2 pessoas, amanhã às 19h. Código: *RES-4821*. Até lá! 🎉', time: '14:03' },
]

export default function SceneWhatsApp() {
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
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: '#111b21' }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#202c33' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        <div className="rounded-full flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, background: '#3b82f6' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
            <path d="M3 21h16" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-none truncate">Café Exemplo</p>
          <p className="text-xs mt-0.5" style={{ color: '#8696a0' }}>online</p>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" className="w-5 h-5">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div className="flex-1 flex flex-col justify-end gap-1.5 px-3 py-3 overflow-hidden" style={{ background: '#0b141a' }}>
        {MESSAGES.slice(0, visibleCount).map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-lg px-3 py-1.5 max-w-[78%]"
              style={{ background: msg.from === 'user' ? '#005c4b' : '#202c33', fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)', color: '#e9edef' }}
            >
              <p className="leading-snug">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span style={{ fontSize: '0.6rem', color: '#8696a0' }}>{msg.time}</span>
                {msg.from === 'bot' && (
                  <svg viewBox="0 0 16 11" fill="#53bdeb" className="w-3 h-2">
                    <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L4.955 7.43 1.6 4.255a.503.503 0 0 0-.36-.14.493.493 0 0 0-.373.166L.172 5.007a.47.47 0 0 0-.115.34c.01.127.063.242.153.328l4.34 4.05a.504.504 0 0 0 .359.14c.14 0 .275-.055.381-.156l6.89-7.523a.46.46 0 0 0 .115-.345.47.47 0 0 0-.153-.328l-.071.14z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ── */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ background: '#202c33' }}>
        <div className="flex-1 rounded-full px-4 py-2 text-xs" style={{ background: '#2a3942', color: '#8696a0' }}>Mensagem</div>
        <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, background: '#00a884' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
        </div>
      </div>
    </div>
  )
}
