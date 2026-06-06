'use client'
// components/tour/scenes/SceneAgenda.tsx
// Gestor de Agenda: serviço → horários → pagamento → confirmação email

import { useEffect, useState } from 'react'

const CHAT = [
  { from: 'user', text: 'Quero agendar um corte de cabelo' },
  { from: 'bot',  text: 'Ótimo! Temos horários disponíveis amanhã. Qual prefere?' },
  { from: 'user', text: '14h' },
  { from: 'bot',  text: 'Reservado! Deseja pagar agora? R$ 45,00' },
  { from: 'user', text: 'Sim' },
  { from: 'bot',  text: 'Link enviado! Agendamento confirmado no Google Agenda. E-mail de confirmação enviado.' },
]

const HORARIOS = [
  { hora: '09h', livre: false },
  { hora: '10h', livre: false },
  { hora: '11h', livre: true  },
  { hora: '14h', livre: true, selected: true },
  { hora: '15h', livre: true  },
  { hora: '16h', livre: false },
]

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
const ACCENT = '#84cc16'

export default function SceneAgenda() {
  const [chatCount, setChatCount] = useState(0)
  const [showSlots, setShowSlots] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (chatCount >= CHAT.length) return
    const delay = chatCount === 0 ? 500 : 1300
    const t = setTimeout(() => setChatCount(v => v + 1), delay)
    return () => clearTimeout(t)
  }, [chatCount])

  // Mostra horários após 2ª mensagem
  useEffect(() => {
    if (chatCount >= 2) setShowSlots(true)
  }, [chatCount])

  // Após 5ª mensagem, link
  useEffect(() => {
    if (chatCount >= 5) {
      const t = setTimeout(() => setShowLink(true), 400)
      return () => clearTimeout(t)
    }
  }, [chatCount])

  // Confirmação após link
  useEffect(() => {
    if (!showLink) return
    const t = setTimeout(() => setShowConfirm(true), 700)
    return () => clearTimeout(t)
  }, [showLink])

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
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: ACCENT }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
            Gestor de Agenda
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30`, fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}
        >
          Google Agenda
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-2 px-3 py-2 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col justify-end gap-1.5 overflow-hidden" style={{ flex: 1 }}>
          {CHAT.slice(0, chatCount).map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-xl px-2.5 py-1.5 max-w-[90%]"
                style={{
                  fontSize: 'clamp(0.46rem, 1vw, 0.58rem)',
                  background: msg.from === 'user' ? ACCENT : 'rgba(255,255,255,0.08)',
                  color: msg.from === 'user' ? '#0f172a' : 'white',
                  fontWeight: msg.from === 'user' ? 600 : 400,
                  lineHeight: 1.4,
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Link de pagamento */}
          {showLink && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5"
                style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, fontSize: 'clamp(0.44rem, 1vw, 0.56rem)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
                <span style={{ color: ACCENT, fontWeight: 600 }}>Link enviado · R$ 45,00</span>
              </div>
            </div>
          )}

          {/* Confirmação */}
          {showConfirm && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-2.5 py-1.5 flex items-center gap-1.5"
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', fontSize: 'clamp(0.44rem, 1vw, 0.56rem)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>E-mail de confirmação enviado</span>
              </div>
            </div>
          )}
        </div>

        {/* Grade de horários */}
        {showSlots && (
          <div
            className="flex-shrink-0 flex flex-col gap-1 rounded-xl p-2"
            style={{ width: '36%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/40 font-semibold uppercase tracking-wider" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
              Amanhã
            </p>
            <div className="flex flex-col gap-1 flex-1">
              {HORARIOS.map(h => (
                <div
                  key={h.hora}
                  className="flex items-center justify-between rounded-lg px-2 py-1"
                  style={{
                    background: (h as any).selected ? `${ACCENT}20` : h.livre ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${(h as any).selected ? ACCENT + '50' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span
                    className="font-semibold"
                    style={{
                      color: (h as any).selected ? ACCENT : h.livre ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                      fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
                    }}
                  >
                    {h.hora}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)',
                      color: (h as any).selected ? ACCENT : h.livre ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    {(h as any).selected ? 'Reservado' : h.livre ? 'Livre' : 'Ocupado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.42rem, 1vw, 0.54rem)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Diga o serviço e data desejada...
          </div>
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: ACCENT }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}