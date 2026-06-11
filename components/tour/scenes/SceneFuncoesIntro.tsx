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

// Carrossel superior: itens do assistente duplicados para scroll CSS infinito
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

const CARROSSEL_COPIES = 6
const DUPLICATED_CARROSSEL = Array.from({ length: CARROSSEL_COPIES }, () => CARROSSEL_ITEMS).flat()
const CARROSSEL_RESET = `${parseFloat(((1 / CARROSSEL_COPIES) * 100).toFixed(4))}%`

// Grid de categorias: duplicação para scroll contínuo (não usado, mantido por consistência)
const CAROUSEL_COPIES = 4
const RESET_PERCENT = `${((1 / CAROUSEL_COPIES) * 100).toFixed(4)}%`

const FORM_BASE_W = 340
const FORM_BASE_H = 580

export default function SceneFuncoesIntro() {
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

  // Aparecimento progressivo das categorias
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

  const s = w ? w / FORM_BASE_W : 1
  const sH = h ? h / FORM_BASE_H : 1
  const px = (n: number) => `${n * s}px`

  return (
    <div
      ref={ref}
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* ── Header ── */}
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

      {/* ── Carrossel superior — scroll CSS infinito (igual SceneCarrossel) ── */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: `${10 * s}px`,
          paddingBottom: `${10 * s}px`,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Label centralizado */}
        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: px(8),
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: `0 0 ${px(8)} 0`,
          textAlign: 'center',
        }}>
          Carrossel do assistente
        </p>

        {/* Faixa rolante — overflow hidden no wrapper, w-max + animation no inner */}
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              gap: px(8),
              paddingLeft: px(8),
              width: 'max-content',
              animation: `funcos-carousel-scroll 18s linear infinite`,
              willChange: 'transform',
            }}
          >
            {DUPLICATED_CARROSSEL.map((item, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: px(10),
                  padding: `${8 * s}px ${12 * s}px`,
                  background: 'rgba(255,255,255,0.08)',
                  borderLeft: `${3 * s}px solid ${item.color}`,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 600,
                  fontSize: px(10),
                }}>
                  {item.nome}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de categorias (pill escuro + bullet colorido, centralizado) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: `${12 * s}px ${20 * s}px`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: px(7),
          alignContent: 'center',
          justifyContent: 'center',
        }}
      >
        {CATEGORIAS.slice(0, catVisible).map((cat) => (
          <div
            key={cat.nome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: px(6),
              borderRadius: 999,
              padding: `${7 * s}px ${14 * s}px`,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: px(7),
              height: px(7),
              borderRadius: '50%',
              background: cat.color,
              flexShrink: 0,
            }} />
            <p style={{
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              fontSize: px(11),
              margin: 0,
              whiteSpace: 'nowrap',
            }}>
              {cat.nome}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes funcos-carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${CARROSSEL_RESET}); }
        }
      `}</style>
    </div>
  )
}
