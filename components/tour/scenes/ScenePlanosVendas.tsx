'use client'
// components/tour/scenes/ScenePlanosVendas.tsx

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const FORMAS = [
  { label: 'PIX',        sub: 'Banco Inter · 10% no saque',      color: '#32bcad' },
  { label: 'NFC + Link', sub: 'InfinitePay · Taxa da operadora',  color: '#8b5cf6' },
  { label: 'TEF',        sub: 'Mercado Pago · Taxa da operadora', color: '#3b82f6' },
]

const FUNCOES = [
  'Modo Venda', 'Ver Produtos', 'Fazer Pedido', 'Registrar Venda',
  'Cardápio', 'PIX', 'NFC Débito', 'NFC Crédito',
  'Link de Pagamento', 'TEF Débito', 'TEF Crédito', 'Agendar',
  'Ver Agenda', 'Perguntas Gerais', 'Nossa Marca', 'Minha Conta',
  'Cadastrar Produto', 'Sobre o Sistema',
]

export default function ScenePlanosVendas() {
  const [formasVisible, setFormasVisible] = useState(0)
  const [funcoesVisible, setFuncoesVisible] = useState(0)
  const [ref, setRef] = useState<HTMLDivElement | null>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    if (!ref) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref)
    setW(ref.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [ref])

  useEffect(() => {
    if (formasVisible >= FORMAS.length) return
    const t = setTimeout(() => setFormasVisible(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [formasVisible])

  useEffect(() => {
    if (formasVisible < FORMAS.length) return
    if (funcoesVisible >= FUNCOES.length) return
    const t = setTimeout(() => setFuncoesVisible(v => v + 1), 120)
    return () => clearTimeout(t)
  }, [formasVisible, funcoesVisible])

  // Escala proporcional à largura real do container
  const s = w ? w / 540 : 1

  const px = (n: number) => `${n * s}px`

  return (
    <div
      ref={setRef}
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0"
        style={{
          padding: `${12 * s}px ${20 * s}px`,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: px(8), marginBottom: px(10) }}>
          <div style={{ width: px(8), height: px(8), borderRadius: '50%', background: '#b0cb1f', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: '#fff', fontSize: px(13) }}>minhAi Vendas</span>
        </div>

        {/* Card gratuito */}
        <div
          style={{
            borderRadius: px(14),
            padding: `${12 * s}px ${18 * s}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(176,203,31,0.07)',
            border: '1px solid rgba(176,203,31,0.22)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(5) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
              <span style={{ fontWeight: 800, color: '#b0cb1f', fontSize: px(22) }}>Gratuito</span>
              <span
                style={{
                  borderRadius: 999,
                  padding: `${3 * s}px ${8 * s}px`,
                  fontWeight: 600,
                  fontSize: px(9),
                  background: 'rgba(176,203,31,0.18)',
                  color: '#b0cb1f',
                  border: '1px solid rgba(176,203,31,0.3)',
                }}
              >
                para o lojista
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: px(10), margin: 0 }}>
              Sem mensalidade, sem créditos, sem surpresa.
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: px(12) }}>
            <p style={{ fontWeight: 800, color: '#b0cb1f', fontSize: px(42), lineHeight: 1, margin: 0 }}>10%</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: px(10), marginTop: px(3) }}>por venda confirmada</p>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: px(9), marginTop: px(1) }}>descontado no saque</p>
          </div>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ padding: `${12 * s}px ${20 * s}px`, gap: px(14) }}
      >

        {/* Formas de recebimento */}
        <div style={{ flexShrink: 0 }}>
          <p
            style={{
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.08em',
              fontSize: px(8),
              marginBottom: px(8),
            }}
          >
            Formas de recebimento
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: px(8) }}>
            {FORMAS.slice(0, formasVisible).map((f) => (
              <div
                key={f.label}
                style={{
                  borderRadius: px(12),
                  padding: `${10 * s}px ${8 * s}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: px(4),
                  background: `${f.color}12`,
                  border: `1px solid ${f.color}30`,
                }}
              >
                <p style={{ fontWeight: 700, color: '#fff', fontSize: px(12), margin: 0 }}>{f.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: px(9), margin: 0, textAlign: 'center', lineHeight: 1.3 }}>{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Funções incluídas */}
        {funcoesVisible > 0 && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <p
              style={{
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.08em',
                fontSize: px(8),
                marginBottom: px(8),
                flexShrink: 0,
              }}
            >
              18 funções incluídas — ative ou desative no painel
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: px(5), alignContent: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {FUNCOES.slice(0, funcoesVisible).map((fn) => (
                <div
                  key={fn}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: px(5),
                    borderRadius: 999,
                    padding: `${4 * s}px ${10 * s}px`,
                    background: 'rgba(176,203,31,0.08)',
                    border: '1px solid rgba(176,203,31,0.22)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b0cb1f" strokeWidth={2.5} strokeLinecap="round" style={{ width: px(9), height: px(9), flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500, fontSize: px(9) }}>{fn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
