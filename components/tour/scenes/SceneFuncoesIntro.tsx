'use client'
// components/tour/scenes/SceneFuncoesIntro.tsx

import { useEffect, useState, useRef, useCallback } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const FORM_BASE_W = 580
const FORM_BASE_H = 500

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

const CARROSSEL_COPIES = 6
const DUPLICATED_CARROSSEL = Array.from({ length: CARROSSEL_COPIES }, () => CARROSSEL_ITEMS).flat()
const CARROSSEL_RESET = `${parseFloat(((1 / CARROSSEL_COPIES) * 100).toFixed(4))}%`

export default function SceneFuncoesIntro() {
  const [catVisible, setCatVisible] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)
  const [scale, setScale] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)

  const recalcScale = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: cw, height: ch } = el.getBoundingClientRect()
    const pad = 24
    const aw = cw - pad
    const ah = ch - pad
    setScale(Math.min(1, aw / FORM_BASE_W, ah / FORM_BASE_H))
  }, [])

  useEffect(() => {
    recalcScale()
    const ro = new ResizeObserver(recalcScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalcScale])

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

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Wrapper escalável — largura fixa, scale dinâmico */}
      <div style={{
        width: FORM_BASE_W,
        height: FORM_BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          flexShrink: 0,
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>
            Funções e Habilidades
          </p>
          {totalVisible && (
            <div style={{
              borderRadius: 999,
              padding: '4px 10px',
              background: 'rgba(50,188,173,0.15)',
              border: '1px solid rgba(50,188,173,0.3)',
            }}>
              <span style={{ fontWeight: 700, color: '#32bcad', fontSize: 9 }}>
                + de 100 funções
              </span>
            </div>
          )}
        </div>

        {/* ── Carrossel superior ── */}
        <div style={{
          flexShrink: 0,
          paddingTop: 10,
          paddingBottom: 10,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}>
            Carrossel do assistente
          </p>

          <div style={{ width: '100%', overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              gap: 8,
              paddingLeft: 8,
              width: 'max-content',
              animation: `funcos-carousel-scroll 18s linear infinite`,
              willChange: 'transform',
            }}>
              {DUPLICATED_CARROSSEL.map((item, i) => (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 10,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.08)',
                    borderLeft: `3px solid ${item.color}`,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 10 }}>
                    {item.nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid de categorias ── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 7,
          alignContent: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: BG,
        }}>
          {CATEGORIAS.slice(0, catVisible).map((cat) => (
            <div
              key={cat.nome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: cat.color,
                flexShrink: 0,
              }} />
              <p style={{
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 11,
                margin: 0,
                whiteSpace: 'nowrap',
              }}>
                {cat.nome}
              </p>
            </div>
          ))}
        </div>

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
