'use client'
// components/tour/scenes/SceneVendasAux.tsx
// Assistente de Vendas: conversa → sugestão → carrinho → entrega → link pagamento

import { useEffect, useState } from 'react'

type Stage = 'chat' | 'carrinho' | 'entrega' | 'link'

const CHAT = [
  { from: 'user', text: 'Quero fazer um pedido' },
  { from: 'bot',  text: 'Claro! Temos Expresso (R$ 8), Cappuccino (R$ 12) e Croissant (R$ 9,50). O que deseja?' },
  { from: 'user', text: 'Um cappuccino e um croissant' },
  { from: 'bot',  text: 'Adicionado! Total: R$ 21,50. Retirada no local, mesa ou entrega?' },
  { from: 'user', text: 'Entrega' },
  { from: 'bot',  text: 'Frete calculado: R$ 8,90. Total final: R$ 30,40. Enviando link de pagamento!' },
]

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
const BRAND = '#de691b'

export default function SceneVendasAux() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [stage, setStage] = useState<Stage>('chat')
  const [linkVisible, setLinkVisible] = useState(false)

  useEffect(() => {
    if (visibleCount >= CHAT.length) return
    const delay = visibleCount === 0 ? 600 : 1400
    const t = setTimeout(() => setVisibleCount(v => v + 1), delay)
    return () => clearTimeout(t)
  }, [visibleCount])

  // Após última mensagem, mostra link
  useEffect(() => {
    if (visibleCount < CHAT.length) return
    const t = setTimeout(() => setLinkVisible(true), 600)
    return () => clearTimeout(t)
  }, [visibleCount])

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
            style={{ width: 22, height: 22, background: BRAND }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
            Assistente de Vendas
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{ background: 'rgba(132,204,22,0.15)', color: '#84cc16', border: '1px solid rgba(132,204,22,0.3)', fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}
        >
          Qualquer canal
        </span>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col justify-end gap-1.5 px-3 py-2 overflow-hidden min-h-0">
        {CHAT.slice(0, visibleCount).map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-xl px-2.5 py-1.5 max-w-[85%]"
              style={{
                fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)',
                background: msg.from === 'user' ? BRAND : 'rgba(255,255,255,0.08)',
                color: 'white',
                lineHeight: 1.4,
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Link de pagamento */}
        {linkVisible && (
          <div
            className="flex justify-start"
            style={{ opacity: linkVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
          >
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background: 'rgba(132,204,22,0.12)',
                border: '1px solid rgba(132,204,22,0.35)',
                fontSize: 'clamp(0.46rem, 1vw, 0.58rem)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <span style={{ color: '#84cc16', fontWeight: 600 }}>Link enviado · R$ 30,40</span>
            </div>
          </div>
        )}
      </div>

      {/* Input mock */}
      <div className="flex-shrink-0 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.42rem, 1vw, 0.54rem)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Diga ou digite seu pedido...
          </div>
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: BRAND }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}