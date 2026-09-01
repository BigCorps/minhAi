'use client'
// components/tour/scenes/SceneWidget.tsx

import { useEffect, useState, useRef } from 'react'
import { Maximize2, X, Moon } from 'lucide-react'

const MOCK_CATEGORIES = [
  { name: 'Conhecimento', color: '#3B82F6' },
  { name: 'Comercial',    color: '#10B981' },
  { name: 'Financeiro',   color: '#3B82F6' },
  { name: 'Informação',   color: '#10B981' },
  { name: 'Multimídia',   color: '#3B82F6' },
  { name: 'Agendamento',  color: '#10B981' },
  { name: 'Contato',      color: '#3B82F6' },
  { name: 'Serviços',     color: '#10B981' },
]

const DUPLICATED = Array.from({ length: 8 }, () => MOCK_CATEGORIES).flat()

const CHAT_SEQUENCE = [
  { from: 'bot',  text: 'Olá! Posso ajudar com cardápio, reservas ou pedidos?' },
  { from: 'user', text: 'Tem mesa disponível hoje às 19h?' },
  { from: 'bot',  text: 'Sim! Mesa para até 4 pessoas disponível. Posso reservar agora?' },
  { from: 'user', text: 'Sim, pra 2 pessoas!' },
  { from: 'bot',  text: 'Reservado! Mesa 7 às 19h. Até logo!' },
]

const BRAND = '#de691b'

export default function SceneWidget() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [cardOpen, setCardOpen]         = useState(false)
  const carouselRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setCardOpen(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!cardOpen) return
    const t = setTimeout(() => setVisibleCount(1), 300)
    return () => clearTimeout(t)
  }, [cardOpen])

  useEffect(() => {
    if (!cardOpen || visibleCount === 0) return
    if (visibleCount >= CHAT_SEQUENCE.length) {
      const t = setTimeout(() => setVisibleCount(1), 2500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisibleCount(v => v + 1), 1400)
    return () => clearTimeout(t)
  }, [visibleCount, cardOpen])

  const showEmptyState = visibleCount === 0

  return (
    <div
      className="w-full h-full relative bg-slate-100 flex flex-col select-none"
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        clipPath: 'inset(0 round 16px)',
        WebkitClipPath: 'inset(0 round 16px)',
        transform: 'translateZ(0)',
        isolation: 'isolate',
      }}
    >
      {/* ── Barra do browser ── */}
      <div className="flex items-center gap-2 bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-gray-100 rounded-full px-3 py-0.5 text-gray-400 text-xs truncate">
          www.cafeexemplo.com.br
        </div>
      </div>

      {/* ── Conteúdo do site (fundo) ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Hero */}
        <div className="bg-slate-50 px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                <path d="M3 21h18" />
              </svg>
            </div>
            <span className="text-slate-700 font-semibold text-sm">Café Exemplo</span>
          </div>
          <p className="text-slate-900 font-bold" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)' }}>
            O melhor café da cidade
          </p>
          <div className="flex gap-2">
            <div className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full">Ver cardápio</div>
            <div className="bg-slate-200 text-slate-700 text-xs px-3 py-1 rounded-full">Reservar mesa</div>
          </div>
        </div>

        <div className="bg-white px-4 py-2 flex flex-col gap-2 flex-shrink-0">
          <div className="h-2 bg-gray-200 rounded w-3/4" />
          <div className="h-2 bg-gray-200 rounded w-1/2" />
        </div>

        {/* ── Card do widget ──
            Usa % para largura relativa ao container da cena,
            não vw — assim não extrapola no modal.
            Altura máxima de 85% do container para não cortar. */}
        <div
          className="absolute flex flex-col"
          style={{
            bottom: 44,
            right: 8,
            width: 'clamp(150px, 48%, 240px)',
            // height fixo — não cresce com o conteúdo das mensagens
            height: 'clamp(200px, 72%, 320px)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.07)',
            background: 'white',
            opacity:   cardOpen ? 1 : 0,
            transform: cardOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-2.5 py-1.5 border-b flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                  <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                  <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                  <path d="M3 21h18" />
                </svg>
              </div>
              <span className="font-bold truncate text-gray-800" style={{ fontSize: '0.65rem' }}>Café Exemplo</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button className="p-1 rounded-full hover:bg-gray-100"><Moon size={10} className="text-slate-500" /></button>
              <button className="p-1 rounded-full hover:bg-gray-100"><Maximize2 size={10} className="text-gray-400" /></button>
              <button className="p-1 rounded-full hover:bg-gray-100"><X size={10} className="text-gray-400" /></button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 flex flex-col justify-end overflow-hidden bg-white min-h-0">
            {showEmptyState ? (
              <div className="flex-1 flex items-center justify-center px-3">
                <p className="text-gray-700 font-bold text-center leading-tight" style={{ fontSize: 'clamp(0.6rem, 1.6vw, 0.8rem)' }}>
                  Como Posso te<br />Ajudar Hoje?
                </p>
              </div>
            ) : (
              <div className="flex flex-col justify-end gap-1 px-2.5 py-2 overflow-hidden flex-1">
                {CHAT_SEQUENCE.slice(0, visibleCount).map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="rounded-xl px-2 py-1 max-w-[88%]"
                      style={{
                        fontSize: 'clamp(0.52rem, 1.2vw, 0.65rem)',
                        background: msg.from === 'user' ? BRAND : '#f3f4f6',
                        color: msg.from === 'user' ? 'white' : '#374151',
                        lineHeight: 1.35,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input + carrossel + branding */}
          <div className="flex-shrink-0 bg-white">
            <div className="flex items-center gap-1 px-2.5 py-1.5 border-t border-gray-100">
              <div className="flex-1 bg-gray-100 rounded-full px-2 py-0.5 text-gray-400" style={{ fontSize: '0.52rem' }}>
                Ou digite sua mensagem...
              </div>
              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 18, height: 18, background: BRAND }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-2 h-2"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              </div>
            </div>

            <div className="w-full overflow-hidden border-t border-gray-100" style={{ paddingTop: 4, paddingBottom: 4 }}>
              <div
                ref={carouselRef}
                className="flex gap-1.5 pl-2 w-max"
                style={{ animation: 'scene-carousel-scroll 18s linear infinite', willChange: 'transform' }}
              >
                {DUPLICATED.map((cat, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex items-center rounded-md bg-white"
                    style={{
                      fontSize: 'clamp(0.45rem, 1vw, 0.55rem)',
                      fontWeight: 600,
                      color: '#1e293b',
                      borderLeft: `2px solid ${cat.color}`,
                      padding: '3px 8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-0.5 text-center border-t border-gray-100" style={{ fontSize: '0.42rem', color: '#9ca3af' }}>
              loja.<strong>minhai.app</strong> — Uma IA pra chamar de sua!
            </div>
          </div>
        </div>

        {/* Botão pill */}
        <div
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full cursor-pointer px-2.5 py-1.5"
          style={{ background: BRAND, boxShadow: '0 4px 16px rgba(222,105,27,0.4)' }}
        >
          <span className="text-white font-semibold whitespace-nowrap" style={{ fontSize: '0.58rem' }}>Gerente Café</span>
          {cardOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-2 h-2 flex-shrink-0"><path d="M18 6 6 18M6 6l12 12" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-2 h-2 flex-shrink-0"><path d="m6 9 6 6 6-6" /></svg>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scene-carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-12.5%); }
        }
      `}</style>
    </div>
  )
}
