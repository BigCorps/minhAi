'use client'
// components/tour/scenes/SceneCarrossel.tsx
// Mock visual do CategoryCarousel com painel de funções

import { useEffect, useState } from 'react'

const CATEGORIES = [
  { name: 'Conhecimento', color: '#3B82F6' },
  { name: 'Comercial',    color: '#10B981' },
  { name: 'Financeiro',   color: '#3B82F6' },
  { name: 'Informação',   color: '#10B981' },
  { name: 'Multimídia',   color: '#3B82F6' },
  { name: 'Agendamento',  color: '#10B981' },
  { name: 'Contato',      color: '#3B82F6' },
  { name: 'Localização',  color: '#10B981' },
  { name: 'Consultas',    color: '#3B82F6' },
  { name: 'Identificação',color: '#10B981' },
  { name: 'Arquivos',     color: '#3B82F6' },
  { name: 'Utilitários',  color: '#10B981' },
  { name: 'Câmera',       color: '#3B82F6' },
  { name: 'Serviços',     color: '#10B981' },
]

const DUPLICATED = Array.from({ length: 6 }, () => CATEGORIES).flat()

// Funções mockadas por categoria
const MOCK_FUNCTIONS: Record<string, string[]> = {
  'Comercial':    ['Gerar orçamento', 'Registrar venda', 'Consultar estoque', 'Link de pagamento', 'Listar produtos'],
  'Financeiro':   ['Gerar PIX', 'Confirmar pagamento', 'Link de pagamento', 'Boleto', 'Extrato do dia'],
  'Agendamento':  ['Marcar consulta', 'Ver agenda', 'Cancelar agendamento', 'Reagendar', 'Lembrete'],
  'Contato':      ['WhatsApp da empresa', 'Ligar agora', 'Enviar e-mail', 'Falar com gerente', 'Redes sociais'],
  'Informação':   ['Horário de funcionamento', 'Endereço e mapa', 'Sobre a empresa', 'Notícias', 'Câmbio do dia'],
}

const ACTIVE_CATEGORY = 'Comercial'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

export default function SceneCarrossel() {
  const [panelVisible, setPanelVisible] = useState(false)
  const [highlightedFn, setHighlightedFn] = useState<number | null>(null)

  // Painel aparece após 800ms
  useEffect(() => {
    const t = setTimeout(() => setPanelVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Cicla highlight nas funções
  useEffect(() => {
    if (!panelVisible) return
    let i = 0
    const interval = setInterval(() => {
      setHighlightedFn(i % (MOCK_FUNCTIONS[ACTIVE_CATEGORY]?.length ?? 1))
      i++
    }, 900)
    return () => clearInterval(interval)
  }, [panelVisible])

  const fns = MOCK_FUNCTIONS[ACTIVE_CATEGORY] ?? []

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* ── Header mock ── */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(to right, rgba(15,23,42,0.8), rgba(30,41,59,0.7), rgba(15,23,42,0.8))',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" /><path d="M3 21h18" />
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Café Exemplo</span>
        </div>
        <span className="text-white/20" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.52rem)' }}>minhAi</span>
      </div>

      {/* ── Área principal — pergunta + painel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3 min-h-0 relative">

        {/* Pergunta central */}
        <p
          className="text-white font-bold text-center"
          style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1.25rem)' }}
        >
          Como Posso te Ajudar Hoje?
        </p>

        {/* Painel de funções — aparece com animação */}
        <div
          className="w-full max-w-xs rounded-2xl border overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))',
            borderColor: 'rgba(59,130,246,0.3)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 -2px 8px rgba(59,130,246,0.25)',
            opacity: panelVisible ? 1 : 0,
            transform: panelVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          {/* Header do painel */}
          <div
            className="px-3 py-1.5 font-semibold border-b"
            style={{
              borderColor: 'rgba(59,130,246,0.25)',
              color: 'rgba(226,232,240,1)',
              fontSize: 'clamp(0.52rem, 1.2vw, 0.65rem)',
            }}
          >
            {ACTIVE_CATEGORY}
          </div>

          {/* Lista de funções */}
          <div>
            {fns.map((fn, i) => (
              <div
                key={fn}
                className="px-3 py-1.5 border-b transition-all duration-300"
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  fontSize: 'clamp(0.5rem, 1.15vw, 0.62rem)',
                  fontWeight: highlightedFn === i ? 600 : 400,
                  color: 'rgba(226,232,240,1)',
                  background: highlightedFn === i
                    ? 'rgba(59,130,246,0.2)'
                    : 'rgba(51,65,85,0.5)',
                  cursor: 'pointer',
                }}
              >
                {fn}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Carrossel de categorias ── */}
      <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 5, paddingBottom: 5 }}>
        <div
          className="flex gap-2 pl-2 w-max"
          style={{ animation: 'stage2-carousel-scroll 16s linear infinite', willChange: 'transform' }}
        >
          {DUPLICATED.map((cat, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center rounded-xl transition-all"
              style={{
                fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)',
                fontWeight: cat.name === ACTIVE_CATEGORY ? 700 : 600,
                color: cat.name === ACTIVE_CATEGORY ? 'white' : 'rgba(255,255,255,0.75)',
                background: cat.name === ACTIVE_CATEGORY
                  ? 'rgba(59,130,246,0.35)'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${cat.name === ACTIVE_CATEGORY ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
                borderLeft: `3px solid ${cat.color}`,
                padding: '5px 10px',
                whiteSpace: 'nowrap',
                transform: cat.name === ACTIVE_CATEGORY ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="text-center px-3 py-1 flex-shrink-0"
        style={{
          fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)',
          color: 'rgba(255,255,255,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        suporte.<strong>minhai.app</strong> — Uma IA pra chamar de sua!
      </div>

      <style>{`
        @keyframes stage2-carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${parseFloat(((1/6)*100).toFixed(4))}%); }
        }
      `}</style>
    </div>
  )
}