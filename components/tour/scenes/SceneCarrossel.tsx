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

// Funções mockadas com descrições reais (sem cor rosa, apenas dados)
interface FnItem {
  name: string
  description: string
}

const MOCK_FUNCTIONS: Record<string, FnItem[]> = {
  'Comercial': [
    { name: 'Auxiliar de Produção',  description: 'Crie fichas de produção conversando e interagindo com o auxiliar.' },
    { name: 'Enviar Email',          description: 'Envia emails através da conta Google conectada usando Gmail API.' },
    { name: 'Fazer Pedido',          description: 'Permite ao cliente montar o pedido por texto e voz, adicionando itens ao carrinho e finalizando com pagamento.' },
    { name: 'Modo Venda',            description: 'Abre o modo de venda completo com catálogo de produtos e carrinho de compras.' },
    { name: 'Nossos Produtos',       description: 'Busca e exibe produtos disponíveis na loja. O cliente pode pedir por nome, categoria ou características.' },
    { name: 'Cadastrar Produto',     description: 'Fluxo guiado por voz ou texto para cadastrar um novo produto na loja.' },
    { name: 'Gerar Cupom',           description: 'Gere cupons exclusivos de indicação, desconto, entre outros.' },
    { name: 'Registrar Venda',       description: 'Registra uma venda manual no sistema.' },
    { name: 'Link na Bio',           description: 'Abre a página de links da empresa com redes sociais e contatos.' },
  ],
}

const ACTIVE_CATEGORY = 'Comercial'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

export default function SceneCarrossel() {
  const [panelVisible, setPanelVisible] = useState(false)
  const [highlightedFn, setHighlightedFn] = useState<number | null>(null)
  const [hoveredFn, setHoveredFn] = useState<number | null>(null)

  // Painel aparece após 800ms
  useEffect(() => {
    const t = setTimeout(() => setPanelVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Cicla highlight nas funções (apenas quando não há hover)
  useEffect(() => {
    if (!panelVisible) return
    if (hoveredFn !== null) return
    let i = 0
    const interval = setInterval(() => {
      setHighlightedFn(i % (MOCK_FUNCTIONS[ACTIVE_CATEGORY]?.length ?? 1))
      i++
    }, 900)
    return () => clearInterval(interval)
  }, [panelVisible, hoveredFn])

  const fns = MOCK_FUNCTIONS[ACTIVE_CATEGORY] ?? []

  // Item ativo: hover tem prioridade, depois highlight automático
  const activeFn = hoveredFn !== null ? hoveredFn : highlightedFn

  return (
    <div
  className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
  style={{
    background: BG,
    // Garante que % no clamp do painel seja calculado corretamente
    position: 'relative',
  }}
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
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 'clamp(18px, 4vw, 24px)', height: 'clamp(18px, 4vw, 24px)', background: '#de691b' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: '60%', height: '60%' }}>
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
              <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
              <path d="M3 21h18" />
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Café Exemplo</span>
        </div>
        <span className="text-white/20" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.52rem)' }}>minhAi</span>
      </div>

      {/* ── Área principal — pergunta + painel ── */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-3 gap-2 min-h-0 relative overflow-hidden">

        {/* Pergunta central */}
        <p
          className="text-white font-bold text-center flex-shrink-0"
          style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}
        >
          Como Posso te Ajudar Hoje?
        </p>

        {/* Painel de funções — aparece com animação, overflow-y auto para scroll se necessário */}
        <div
          className="rounded-2xl border overflow-hidden flex-shrink-0"
  style={{
    width: 'clamp(150px, 48%, 240px)',   // ← mesmo do SceneWidget
    height: 'clamp(200px, 72%, 320px)',  // ← mesmo do SceneWidget
    overflowY: 'auto',                   // scroll interno se funções não couberem
    alignSelf: 'center',                 // centraliza no flex column
            background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))',
            borderColor: 'rgba(59,130,246,0.3)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 -2px 8px rgba(59,130,246,0.25)',
            opacity: panelVisible ? 1 : 0,
            transform: panelVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          {/* Header do painel com seta */}
          <div
            className="px-3 py-1.5 font-semibold border-b flex items-center justify-between"
            style={{
              borderColor: 'rgba(59,130,246,0.25)',
              color: 'rgba(226,232,240,1)',
              fontSize: 'clamp(0.52rem, 1.2vw, 0.65rem)',
            }}
          >
            <span>{ACTIVE_CATEGORY}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round"
              style={{ width: 12, height: 12 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>

          {/* Lista de funções */}
          <div>
            {fns.map((fn, i) => {
              const isActive = activeFn === i
              return (
                <div
                  key={fn.name}
                  className="border-b transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={() => setHoveredFn(i)}
                  onMouseLeave={() => setHoveredFn(null)}
                >
                  <div
                    className="px-3 py-1.5"
                    style={{
                      fontSize: 'clamp(0.5rem, 1.15vw, 0.62rem)',
                      fontWeight: isActive ? 600 : 400,
                      color: 'rgba(226,232,240,1)',
                      background: isActive
                        ? 'rgba(59,130,246,0.2)'
                        : 'rgba(51,65,85,0.5)',
                    }}
                  >
                    {fn.name}
                  </div>
                  {/* Descrição — expande ao hover, sem corte */}
                  <div
                    style={{
                      maxHeight: isActive ? 80 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 250ms ease',
                      background: 'rgba(59,130,246,0.08)',
                    }}
                  >
                    <p
                      className="px-3 py-1"
                      style={{
                        fontSize: 'clamp(0.42rem, 0.95vw, 0.54rem)',
                        color: 'rgba(148,163,184,1)',
                        lineHeight: 1.5,
                        // sem line-clamp — texto completo sempre
                      }}
                    >
                      {fn.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Carrossel de categorias — PARADO quando painel visível ── */}
      <div className="w-full overflow-hidden flex-shrink-0" style={{ paddingTop: 5, paddingBottom: 5 }}>
        <div
          className="flex gap-2 pl-2 w-max"
          style={{
            // Carrossel para quando painel está visível
            animation: panelVisible ? 'none' : 'stage2-carousel-scroll 16s linear infinite',
            willChange: 'transform',
          }}
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