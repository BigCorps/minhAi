'use client'
// components/LeadDemo/tour/TourCarrossel.tsx
// Adaptação standalone de SceneCarrossel para o LeadDemoTourOverlay.
// Sem imports de components/tour — autossuficiente.

import { useEffect, useState } from 'react'

// ── Dados ────────────────────────────────────────────────────────

const STATIC_VISIBLE = [
  { name: 'Conhecimento', color: '#3B82F6' },
  { name: 'Financeiro',   color: '#3B82F6' },
  { name: 'Comercial',    color: '#10B981' }, // ativo — centro
  { name: 'Informação',   color: '#10B981' },
  { name: 'Multimídia',   color: '#3B82F6' },
]

const ACTIVE_CATEGORY = 'Comercial'

const MOCK_FUNCTIONS = [
  { name: 'Auxiliar de Produção', description: 'Crie fichas de produção conversando e interagindo com o auxiliar.' },
  { name: 'Enviar Email',         description: 'Envia emails pela conta Google conectada usando Gmail API.' },
  { name: 'Fazer Pedido',         description: 'O cliente monta o pedido por texto ou voz, adiciona ao carrinho e finaliza com pagamento.' },
  { name: 'Modo Venda',           description: 'Abre o modo de venda completo com catálogo de produtos e carrinho de compras.' },
  { name: 'Nossos Produtos',      description: 'Busca e exibe produtos disponíveis na loja por nome, categoria ou características.' },
  { name: 'Cadastrar Produto',    description: 'Fluxo guiado por voz ou texto para cadastrar um novo produto na loja.' },
  { name: 'Gerar Cupom',          description: 'Gere cupons exclusivos de indicação, desconto, entre outros.' },
  { name: 'Registrar Venda',      description: 'Registra uma venda manual no sistema.' },
  { name: 'Link na Bio',          description: 'Abre a página de links da empresa com redes sociais e contatos.' },
]

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

// ── Componente ───────────────────────────────────────────────────

export default function TourCarrossel() {
  const [highlighted, setHighlighted] = useState<number | null>(0)
  const [hovered, setHovered]         = useState<number | null>(null)

  useEffect(() => {
    if (hovered !== null) return
    let i = 0
    const id = setInterval(() => {
      setHighlighted(i % MOCK_FUNCTIONS.length)
      i++
    }, 820)
    return () => clearInterval(id)
  }, [hovered])

  const active = hovered !== null ? hovered : highlighted

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,23,42,0.8)' }}
      >
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 24, height: 24, background: '#de691b' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
            style={{ width: '60%', height: '60%' }}>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
            <path d="M6 2v2M10 2v2M14 2v2M3 21h18" />
          </svg>
        </div>
        <span className="text-white/70 font-semibold text-sm">Café Exemplo</span>
        <span className="ml-auto text-white/25 text-xs">+100 funções em categorias</span>
      </div>

      {/* Spacer */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
        <p className="text-white/40 text-sm text-center">
          Toque numa categoria para ver as funções disponíveis
        </p>
      </div>

      {/* Carousel + panel */}
      <div className="w-full flex-shrink-0 relative" style={{ paddingTop: 6, paddingBottom: 6 }}>

        {/* Function panel — sobe acima do carrossel */}
        <div
          className="absolute rounded-2xl border overflow-hidden"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '100%',
            marginBottom: 8,
            width: 'clamp(220px, 60%, 360px)',
            maxHeight: '55vh',
            overflowY: 'auto',
            zIndex: 10,
            background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(51,65,85,0.98))',
            borderColor: 'rgba(59,130,246,0.3)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5), 0 -2px 8px rgba(59,130,246,0.25)',
          }}
        >
          {/* Panel header */}
          <div
            className="px-3 py-2 font-semibold border-b flex items-center justify-between sticky top-0"
            style={{
              borderColor: 'rgba(59,130,246,0.25)',
              color: 'rgba(226,232,240,1)',
              fontSize: '0.68rem',
              background: 'rgba(30,41,59,0.98)',
              zIndex: 1,
            }}
          >
            <span>{ACTIVE_CATEGORY}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}
              strokeLinecap="round" style={{ width: 12, height: 12 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>

          {/* Function list */}
          {MOCK_FUNCTIONS.map((fn, i) => {
            const isActive = active === i
            return (
              <div
                key={fn.name}
                className="border-b transition-all duration-200 cursor-pointer"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className="px-3 py-1.5"
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: isActive ? 600 : 400,
                    color: 'rgba(226,232,240,1)',
                    background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(51,65,85,0.5)',
                  }}
                >
                  {fn.name}
                </div>
                <div
                  style={{
                    maxHeight: isActive ? 80 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 250ms ease',
                    background: 'rgba(59,130,246,0.08)',
                  }}
                >
                  <p className="px-3 py-1" style={{ fontSize: '0.54rem', color: 'rgba(148,163,184,1)', lineHeight: 1.5 }}>
                    {fn.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Static carousel — Comercial centralizado */}
        <div className="w-full overflow-hidden">
          <div className="flex gap-2 items-center justify-center px-2">
            {STATIC_VISIBLE.map((cat, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center rounded-xl"
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
                  transition: 'transform 200ms ease',
                }}
              >
                {cat.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center px-3 py-1.5 flex-shrink-0"
        style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <strong>minhai.app</strong> — Uma IA pra chamar de sua!
      </div>
    </div>
  )
}