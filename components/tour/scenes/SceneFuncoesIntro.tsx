'use client'
// components/tour/scenes/SceneFuncoesIntro.tsx
// Carrossel de funções — preview do que o cliente vê

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

const CATEGORIAS = [
  { nome: 'Financeiro',    color: '#32bcad', count: 6  },
  { nome: 'Comercial',     color: '#3b82f6', count: 9  },
  { nome: 'Conhecimento',  color: '#8b5cf6', count: 9  },
  { nome: 'Agendamento',   color: '#10b981', count: 6  },
  { nome: 'Contato',       color: '#f59e0b', count: 9  },
  { nome: 'Serviços',      color: '#ef4444', count: 9  },
  { nome: 'Arquivos',      color: '#06b6d4', count: 6  },
  { nome: 'Câmera',        color: '#84cc16', count: 8  },
  { nome: 'Multimídia',    color: '#ec4899', count: 9  },
  { nome: 'Utilitários',   color: '#f97316', count: 9  },
  { nome: 'Localização',   color: '#6366f1', count: 6  },
  { nome: 'Informação',    color: '#14b8a6', count: 8  },
  { nome: 'Identificação', color: '#a855f7', count: 5  },
  { nome: 'Consultas',     color: '#fbbf24', count: 6  },
]

const CARROSSEL_ITEMS = [
  { nome: 'Gerar PIX',       color: '#32bcad', icon: '⚡' },
  { nome: 'Modo Venda',      color: '#3b82f6', icon: '🛒' },
  { nome: 'Cardápio',        color: '#f59e0b', icon: '📋' },
  { nome: 'Marcar Evento',   color: '#10b981', icon: '📅' },
  { nome: 'Nosso WhatsApp',  color: '#25D366', icon: '💬' },
  { nome: 'Criar Orçamento', color: '#8b5cf6', icon: '📝' },
  { nome: 'Remover Fundo',   color: '#06b6d4', icon: '🖼️' },
  { nome: 'Tocar Música',    color: '#ec4899', icon: '🎵' },
]

export default function SceneFuncoesIntro() {
  const [carouselOffset, setCarouselOffset] = useState(0)
  const [catVisible, setCatVisible] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)

  // Anima carrossel
  useEffect(() => {
    const t = setInterval(() => setCarouselOffset(v => v + 1), 1200)
    return () => clearInterval(t)
  }, [])

  // Aparece categorias
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

  const total = CATEGORIAS.reduce((a, c) => a + c.count, 0)

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
          Funções e Habilidades
        </p>
        {totalVisible && (
          <div className="rounded-full px-2 py-0.5" style={{ background: 'rgba(50,188,173,0.15)', border: '1px solid rgba(50,188,173,0.3)' }}>
            <span className="font-bold" style={{ color: '#32bcad', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
              {total}+ funções · 14 categorias
            </span>
          </div>
        )}
      </div>

      {/* Carrossel mockado */}
      <div className="flex-shrink-0 px-3 py-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <p className="text-white/30 mb-1.5" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Carrossel do assistente
        </p>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => {
            const item = CARROSSEL_ITEMS[(carouselOffset + i) % CARROSSEL_ITEMS.length]
            return (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-1 rounded-xl px-2.5 py-2"
                style={{
                  background: `${item.color}12`,
                  border: `1px solid ${item.color}25`,
                  minWidth: 'clamp(56px, 14vw, 80px)',
                  transition: 'all 400ms ease',
                }}
              >
                <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1.2rem)' }}>{item.icon}</span>
                <span className="text-white/70 text-center font-medium" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
                  {item.nome}
                </span>
              </div>
            )
          })}
          <div className="flex-shrink-0 flex items-center justify-center rounded-xl px-2" style={{ minWidth: 'clamp(28px, 6vw, 36px)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-white/20" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>›</span>
          </div>
        </div>
      </div>

      {/* Grid de categorias */}
      <div className="flex-1 overflow-hidden p-3 grid grid-cols-4 gap-1.5 content-start">
        {CATEGORIAS.slice(0, catVisible).map((cat, i) => (
          <div
            key={cat.nome}
            className="rounded-xl px-2 py-1.5 flex flex-col gap-0.5"
            style={{
              background: `${cat.color}10`,
              border: `1px solid ${cat.color}20`,
            }}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-white" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>{cat.nome}</p>
              <span className="font-semibold" style={{ color: cat.color, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{cat.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
