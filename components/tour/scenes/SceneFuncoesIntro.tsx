'use client'
// components/tour/scenes/SceneFuncoesIntro.tsx

import { useEffect, useState, useRef } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const CATEGORIAS = [
  { nome: 'Financeiro',    color: '#32bcad' },
  { nome: 'Comercial',     color: '#3b82f6' },
  { nome: 'Conhecimento',  color: '#8b5cf6' },
  { nome: 'Agendamento',   color: '#10b981' },
  { nome: 'Contato',       color: '#f59e0b' },
  { nome: 'Serviços',      color: '#ef4444' },
  { nome: 'Arquivos',      color: '#06b6d4' },
  { nome: 'Câmera',        color: '#84cc16' },
  { nome: 'Multimídia',    color: '#ec4899' },
  { nome: 'Utilitários',   color: '#f97316' },
  { nome: 'Localização',   color: '#6366f1' },
  { nome: 'Informação',    color: '#14b8a6' },
  { nome: 'Identificação', color: '#a855f7' },
  { nome: 'Consultas',     color: '#fbbf24' },
]

const CARROSSEL_ITEMS = [
  { nome: 'Gerar PIX',       color: '#32bcad' },
  { nome: 'Modo Venda',      color: '#3b82f6' },
  { nome: 'Cardápio',        color: '#f59e0b' },
  { nome: 'Marcar Evento',   color: '#10b981' },
  { nome: 'Nosso WhatsApp',  color: '#25D366' },
  { nome: 'Criar Orçamento', color: '#8b5cf6' },
  { nome: 'Remover Fundo',   color: '#06b6d4' },
  { nome: 'Tocar Música',    color: '#ec4899' },
]

export default function SceneFuncoesIntro() {
  const [carouselOffset, setCarouselOffset] = useState(0)
  const [catVisible, setCatVisible] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)
  const [w, setW] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    setW(ref.current.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setCarouselOffset(v => v + 1), 1200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (catVisible >= CATEGORIAS.length) return
    const t = setTimeout(() => setCatVisible(v => v + 1), 120)
    return () => clearTimeout(t)
  }, [catVisible])

  useEffect(() => {
    if (catVisible < CATEGORIAS.length) return
    const t = setTimeout(() => setTotalVisible(true), 400)
    return () => clearTimeout(t)
  }, [catVisible])

  const s = w ? w / 540 : 1
  const px = (n: number) => `${n * s}px`

  return (
    <div
      ref={ref}
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${12 * s}px ${20 * s}px`,
          flexShrink: 0,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <p style={{ color: '#fff', fontWeight: 700, fontSize: px(13), margin: 0 }}>
          Funções e Habilidades
        </p>
        {totalVisible && (
          <div style={{
            borderRadius: 999,
            padding: `${4 * s}px ${10 * s}px`,
            background: 'rgba(50,188,173,0.15)',
            border: '1px solid rgba(50,188,173,0.3)',
          }}>
            <span style={{ fontWeight: 700, color: '#32bcad', fontSize: px(9) }}>
              105+ funções · 14 categorias
            </span>
          </div>
        )}
      </div>

      {/* Carrossel */}
      <div
        style={{
          flexShrink: 0,
          padding: `${10 * s}px ${20 * s}px`,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: px(8),
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: px(8),
          margin: `0 0 ${px(8)} 0`,
        }}>
          Carrossel do assistente
        </p>
        <div style={{ display: 'flex', gap: px(8), overflow: 'hidden' }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const item = CARROSSEL_ITEMS[(carouselOffset + i) % CARROSSEL_ITEMS.length]
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: px(10),
                  padding: `${10 * s}px ${8 * s}px`,
                  background: `${item.color}12`,
                  border: `1px solid ${item.color}25`,
                  transition: 'all 400ms ease',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: px(10), textAlign: 'center' }}>
                  {item.nome}
                </span>
              </div>
            )
          })}
          <div style={{
            flexShrink: 0,
            width: px(28),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: px(10),
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: px(14) }}>›</span>
          </div>
        </div>
      </div>

      {/* Grid de categorias */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: `${12 * s}px ${20 * s}px`,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: px(7),
          alignContent: 'center',
        }}
      >
        {CATEGORIAS.slice(0, catVisible).map((cat) => (
          <div
            key={cat.nome}
            style={{
              borderRadius: px(10),
              padding: `${10 * s}px ${8 * s}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${cat.color}12`,
              border: `1px solid ${cat.color}28`,
            }}
          >
            <p style={{
              fontWeight: 700,
              color: cat.color,
              fontSize: px(11),
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {cat.nome}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
