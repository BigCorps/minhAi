'use client'
// components/LeadDemo/tour/TourCarrossel.tsx
// Suporta dark/light theme.

import { useEffect, useState } from 'react'

const STATIC_VISIBLE = [
  { name: 'Conhecimento', color: '#3B82F6' },
  { name: 'Financeiro',   color: '#3B82F6' },
  { name: 'Comercial',    color: '#10B981' },
  { name: 'Informação',   color: '#10B981' },
  { name: 'Multimídia',   color: '#3B82F6' },
]
const ACTIVE_CATEGORY = 'Comercial'

const MOCK_FUNCTIONS = [
  { name: 'Auxiliar de Produção', description: 'Crie fichas de produção conversando e interagindo com o auxiliar.' },
  { name: 'Enviar Email',         description: 'Envia emails pela conta Google conectada usando Gmail API.' },
  { name: 'Fazer Pedido',         description: 'O cliente monta o pedido por texto ou voz e finaliza com pagamento.' },
  { name: 'Modo Venda',           description: 'Abre o modo de venda completo com catálogo de produtos e carrinho.' },
  { name: 'Nossos Produtos',      description: 'Busca e exibe produtos por nome, categoria ou características.' },
  { name: 'Cadastrar Produto',    description: 'Fluxo guiado por voz ou texto para cadastrar um novo produto.' },
  { name: 'Gerar Cupom',          description: 'Gere cupons exclusivos de indicação, desconto, entre outros.' },
  { name: 'Registrar Venda',      description: 'Registra uma venda manual no sistema.' },
  { name: 'Link na Bio',          description: 'Abre a página de links da empresa com redes sociais e contatos.' },
]

interface Props {
  theme?: 'dark' | 'light'
}

export default function TourCarrossel({ theme = 'dark' }: Props) {
  const [highlighted, setHighlighted] = useState<number | null>(0)
  const [hovered, setHovered]         = useState<number | null>(null)

  const isDark = theme !== 'light'

  useEffect(() => {
    if (hovered !== null) return
    let i = 0
    const id = setInterval(() => { setHighlighted(i % MOCK_FUNCTIONS.length); i++ }, 820)
    return () => clearInterval(id)
  }, [hovered])

  const active = hovered !== null ? hovered : highlighted

  const BG = isDark
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)'

  const textPrimary = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)'
  const textMuted   = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.30)'
  const border      = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'

  const panelBg   = isDark ? 'rgba(30,41,59,0.98)' : 'rgba(255,255,255,0.98)'
  const panelBdr  = isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.4)'
  const panelHead = isDark ? 'rgba(30,41,59,0.98)'  : 'rgba(255,255,255,0.98)'
  const fnBg      = isDark ? 'rgba(51,65,85,0.5)'   : 'rgba(241,245,249,0.6)'
  const fnActBg   = isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.12)'
  const fnText    = isDark ? 'rgba(226,232,240,1)'  : 'rgba(30,41,59,1)'
  const descText  = isDark ? 'rgba(148,163,184,1)'  : 'rgba(71,85,105,1)'

  const catBg     = (isActive: boolean) => isActive
    ? (isDark ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.15)')
    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
  const catBorder = (isActive: boolean) => isActive
    ? (isDark ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.5)')
    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')
  const catColor  = (isActive: boolean) => isActive ? '#fff' : (isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)')

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)' }}>
        <div className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 24, height: 24, background: '#de691b' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
            style={{ width: '60%', height: '60%' }}>
            <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
            <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16M6 2v2M10 2v2M14 2v2M3 21h18" />
          </svg>
        </div>
        <span className="font-semibold text-sm" style={{ color: textPrimary }}>Café Exemplo</span>
        <span className="ml-auto text-xs" style={{ color: textMuted }}>+100 funções em categorias</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
        <p className="text-sm text-center" style={{ color: textMuted }}>
          Toque numa categoria para ver as funções disponíveis
        </p>
      </div>

      {/* Carousel + panel */}
      <div className="w-full flex-shrink-0 relative" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {/* Panel */}
        <div className="absolute rounded-2xl border overflow-hidden"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            bottom: '100%', marginBottom: 8,
            width: 'clamp(220px, 60%, 360px)',
            maxHeight: '55vh', overflowY: 'auto',
            zIndex: 10,
            background: panelBg,
            borderColor: panelBdr,
            boxShadow: isDark
              ? '0 -8px 32px rgba(0,0,0,0.5), 0 -2px 8px rgba(59,130,246,0.25)'
              : '0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(59,130,246,0.15)',
          }}>
          <div className="px-3 py-2 font-semibold border-b flex items-center justify-between sticky top-0"
            style={{ borderColor: panelBdr, color: fnText, fontSize: '0.68rem', background: panelHead, zIndex: 1 }}>
            <span>{ACTIVE_CATEGORY}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" style={{ width: 12, height: 12, color: textMuted }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
          {MOCK_FUNCTIONS.map((fn, i) => {
            const isActive = active === i
            return (
              <div key={fn.name} className="border-b transition-all duration-200 cursor-pointer"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                <div className="px-3 py-1.5"
                  style={{ fontSize: '0.62rem', fontWeight: isActive ? 600 : 400, color: fnText,
                    background: isActive ? fnActBg : fnBg }}>
                  {fn.name}
                </div>
                <div style={{ maxHeight: isActive ? 80 : 0, overflow: 'hidden', transition: 'max-height 250ms ease',
                  background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)' }}>
                  <p className="px-3 py-1" style={{ fontSize: '0.54rem', color: descText, lineHeight: 1.5 }}>
                    {fn.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Carousel bar */}
        <div className="w-full overflow-hidden">
          <div className="flex gap-2 items-center justify-center px-2">
            {STATIC_VISIBLE.map((cat, i) => (
              <div key={i} className="flex-shrink-0 flex items-center rounded-xl"
                style={{
                  fontSize: 'clamp(0.48rem,1.1vw,0.62rem)',
                  fontWeight: cat.name === ACTIVE_CATEGORY ? 700 : 600,
                  color:      catColor(cat.name === ACTIVE_CATEGORY),
                  background: catBg(cat.name === ACTIVE_CATEGORY),
                  border:    `1px solid ${catBorder(cat.name === ACTIVE_CATEGORY)}`,
                  borderLeft: `3px solid ${cat.color}`,
                  padding: '5px 10px', whiteSpace: 'nowrap',
                  transform: cat.name === ACTIVE_CATEGORY ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 200ms ease',
                }}>
                {cat.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center px-3 py-1.5 flex-shrink-0"
        style={{ fontSize: '0.42rem', color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)',
          borderTop: `1px solid ${border}` }}>
        <strong>minhai.app</strong> — Uma IA pra chamar de sua!
      </div>
    </div>
  )
}