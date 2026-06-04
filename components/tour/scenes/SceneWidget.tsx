'use client'
// components/tour/scenes/SceneWidget.tsx

import { useEffect, useState } from 'react'

const CHAT_SEQUENCE = [
  { from: 'bot', text: 'Olá! 👋 Posso ajudar com cardápio, reservas ou pedidos?' },
  { from: 'user', text: 'Tem mesa disponível hoje às 19h?' },
  { from: 'bot', text: '✅ Sim! Mesa para até 4 pessoas disponível. Posso reservar agora?' },
  { from: 'user', text: 'Sim, pra 2 pessoas!' },
  { from: 'bot', text: '🎉 Reservado! Mesa 7 às 19h. Até logo!' },
]

export default function SceneWidget() {
  const [visibleCount, setVisibleCount] = useState(1)
  const [widgetOpen, setWidgetOpen] = useState(false)

  useEffect(() => {
    // Abre o widget após 600ms
    const t0 = setTimeout(() => setWidgetOpen(true), 600)
    return () => clearTimeout(t0)
  }, [])

  useEffect(() => {
    if (!widgetOpen) return
    if (visibleCount >= CHAT_SEQUENCE.length) {
      // Reinicia o ciclo após pausa
      const t = setTimeout(() => setVisibleCount(1), 2500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisibleCount(v => v + 1), 1400)
    return () => clearTimeout(t)
  }, [visibleCount, widgetOpen])

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

      {/* ── Conteúdo do site ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 px-6 py-8 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {/* Ícone xícara no logo do Café */}
            <div className="w-8 h-8 rounded-full bg-amber-400/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                <path d="M3 21h16" />
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

        {/* Linhas de conteúdo simulado */}
        <div className="bg-white p-4 flex flex-col gap-3">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>

        {/* ── Widget flutuante ── */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">

          {/* Balão de chat expandido */}
          {widgetOpen && (
            <div
              className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden"
              style={{ width: 'clamp(180px, 42vw, 240px)', maxHeight: 220 }}
            >
              {/* Header do widget */}
              <div
                className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                style={{ background: '#de691b' }}
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                    <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                    <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                    <path d="M3 21h16" />
                  </svg>
                </div>
                <span className="text-white text-xs font-semibold">Gerente Café</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300" />
              </div>

              {/* Mensagens em sequência */}
              <div className="flex-1 flex flex-col justify-end gap-1.5 px-3 py-2 overflow-hidden">
                {CHAT_SEQUENCE.slice(0, visibleCount).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="rounded-xl px-2.5 py-1.5 max-w-[85%]"
                      style={{
                        fontSize: 'clamp(0.6rem, 1.5vw, 0.72rem)',
                        background: msg.from === 'user' ? '#de691b' : '#f3f4f6',
                        color: msg.from === 'user' ? 'white' : '#374151',
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input mock */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100 flex-shrink-0">
                <div className="flex-1 bg-gray-100 rounded-full px-2.5 py-1 text-gray-400" style={{ fontSize: '0.6rem' }}>
                  Digite...
                </div>
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 22, height: 22, background: '#de691b' }}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Botão pill minhAi */}
          <div
            className="flex items-center gap-2 rounded-full shadow-xl cursor-pointer px-4 py-2.5"
            style={{ background: '#de691b', boxShadow: '0 4px 20px rgba(222,105,27,0.45)' }}
          >
            <span className="text-white text-xs font-semibold whitespace-nowrap">Gerente Café</span>
            <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
