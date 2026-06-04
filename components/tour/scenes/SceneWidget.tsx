'use client'
// components/tour/scenes/SceneWidget.tsx

import { useEffect, useState, useRef } from 'react'
import { Maximize2, X, Moon } from 'lucide-react'

// ── Dados simulados do carrossel (replica CATEGORIES do CategoryCarousel) ──
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

// 8 cópias para scroll infinito suave (replica MIN_COPIES = 8)
const DUPLICATED = Array.from({ length: 8 }, () => MOCK_CATEGORIES).flat()

const CHAT_SEQUENCE = [
  { from: 'bot',  text: 'Olá! 👋 Posso ajudar com cardápio, reservas ou pedidos?' },
  { from: 'user', text: 'Tem mesa disponível hoje às 19h?' },
  { from: 'bot',  text: '✅ Sim! Mesa para até 4 pessoas disponível. Posso reservar agora?' },
  { from: 'user', text: 'Sim, pra 2 pessoas!' },
  { from: 'bot',  text: '🎉 Reservado! Mesa 7 às 19h. Até logo!' },
]

const BRAND = '#de691b'

export default function SceneWidget() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [cardOpen, setCardOpen]         = useState(false)
  const carouselRef                     = useRef<HTMLDivElement>(null)

  // Abre o card após 600 ms
  useEffect(() => {
    const t = setTimeout(() => setCardOpen(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Primeira mensagem aparece logo após abrir
  useEffect(() => {
    if (!cardOpen) return
    const t = setTimeout(() => setVisibleCount(1), 300)
    return () => clearTimeout(t)
  }, [cardOpen])

  // Avança mensagens, reinicia após pausa
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
    <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-100 flex flex-col select-none">

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

        {/* Hero do café */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 px-4 py-5 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                <path d="M3 21h18" />
              </svg>
            </div>
            <span className="text-amber-100 font-semibold text-sm">Café Exemplo</span>
          </div>
          <p className="text-white font-bold" style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}>
            O melhor café da cidade
          </p>
          <div className="flex gap-2">
            <div className="bg-amber-500 text-white text-xs px-4 py-1.5 rounded-full">Ver cardápio</div>
            <div className="bg-white/10 text-white text-xs px-4 py-1.5 rounded-full">Reservar mesa</div>
          </div>
        </div>

        {/* Linhas simuladas */}
        <div className="bg-white px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          <div className="h-2.5 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-200 rounded w-1/2" />
        </div>

        {/* ── Card do widget ── */}
        <div
          className="absolute flex flex-col"
          style={{
            top: 8,        // alinha logo abaixo das linhas de conteúdo simulado
            bottom: 52,    // para logo acima do botão pill
            right: 8,
            width:  'clamp(190px, 46vw, 250px)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
            background: 'white',
            opacity:   cardOpen ? 1 : 0,
            transform: cardOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {/* ── Header — replica WidgetPage ── */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: BRAND }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                  <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                  <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                  <path d="M3 21h18" />
                </svg>
              </div>
              <span className="font-bold text-xs truncate text-gray-800">Café Exemplo</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <Moon size={12} className="text-slate-500" />
              </button>
              <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <Maximize2 size={12} className="text-gray-400" />
              </button>
              <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X size={12} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* ── Área de mensagens — flex-1, não cresce ── */}
          <div className="flex-1 flex flex-col justify-end overflow-hidden bg-white">

            {/* Estado vazio: "Como Posso te Ajudar Hoje?" */}
            {showEmptyState ? (
              <div className="flex-1 flex items-center justify-center px-3">
                <p
                  className="text-gray-700 font-bold text-center leading-tight"
                  style={{ fontSize: 'clamp(0.65rem, 1.8vw, 0.85rem)' }}
                >
                  Como Posso te<br />Ajudar Hoje?
                </p>
              </div>
            ) : (
              <div className="flex flex-col justify-end gap-1.5 px-3 py-2 overflow-hidden flex-1">
                {CHAT_SEQUENCE.slice(0, visibleCount).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="rounded-xl px-2.5 py-1.5 max-w-[85%]"
                      style={{
                        fontSize: 'clamp(0.56rem, 1.35vw, 0.68rem)',
                        background: msg.from === 'user' ? BRAND : '#f3f4f6',
                        color: msg.from === 'user' ? 'white' : '#374151',
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Input mock ── */}
          <div className="flex-shrink-0 bg-white">
            <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
              <div
                className="flex-1 bg-gray-100 rounded-full px-2.5 py-1 text-gray-400"
                style={{ fontSize: '0.58rem' }}
              >
                Ou digite sua mensagem...
              </div>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 20, height: 20, background: BRAND }}
              >
                <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              </div>
            </div>

            {/* ── Carrossel de categorias — replica CategoryCarousel ── */}
            <div
              className="w-full overflow-hidden border-t border-gray-100"
              style={{ paddingTop: 6, paddingBottom: 6 }}
            >
              <div
                ref={carouselRef}
                className="flex gap-2 pl-2 w-max"
                style={{
                  animation: 'scene-carousel-scroll 18s linear infinite',
                  willChange: 'transform',
                }}
              >
                {DUPLICATED.map((cat, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex items-center rounded-lg bg-white"
                    style={{
                      fontSize: 'clamp(0.5rem, 1.2vw, 0.6rem)',
                      fontWeight: 600,
                      color: '#1e293b',
                      borderLeft: `3px solid ${cat.color}`,
                      padding: '4px 10px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Branding footer ── */}
            <div
              className="px-3 py-1 text-center border-t border-gray-100"
              style={{ fontSize: '0.48rem', color: '#9ca3af' }}
            >
              loja.<strong>minhai.app</strong> — Uma IA pra chamar de sua!
            </div>
          </div>
        </div>

        {/* ── Botão pill flutuante ── */}
        <div
          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full cursor-pointer px-3 py-2"
          style={{
            background: BRAND,
            boxShadow: '0 4px 20px rgba(222,105,27,0.45)',
          }}
        >
          <span className="text-white font-semibold whitespace-nowrap" style={{ fontSize: '0.63rem' }}>
            Gerente Café
          </span>
          {cardOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </div>
      </div>

      {/* ── Keyframe do carrossel ── */}
      <style>{`
        @keyframes scene-carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-12.5%); }
        }
      `}</style>
    </div>
  )
}
