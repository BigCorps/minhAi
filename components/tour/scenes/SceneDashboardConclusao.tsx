'use client'
// components/tour/scenes/SceneDashboardConclusao.tsx
// Conclusão — visão geral do dashboard com todos os módulos

import { useEffect, useState } from 'react'

const MODULOS = [
  { label: 'Funções',      value: '+100',  color: '#3b82f6', icon: '⚡' },
  { label: 'Integrações',  value: '12',    color: '#10b981', icon: '🔗' },
  { label: 'Gestão',       value: '6 áreas',color: '#8b5cf6', icon: '📊' },
  { label: 'Assistentes',  value: 'ilimitados', color: '#f59e0b', icon: '🤖' },
  { label: 'Canais',       value: 'todos', color: '#84cc16', icon: '📡' },
  { label: 'Suporte',      value: 'direto',color: '#ef4444', icon: '🆘' },
]

export default function SceneDashboardConclusao() {
  const [visible, setVisible] = useState(0)
  const [tagVisible, setTagVisible] = useState(false)

  useEffect(() => {
    if (visible >= MODULOS.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 350)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => {
    if (visible < MODULOS.length) return
    const t = setTimeout(() => setTagVisible(true), 400)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none gap-3 px-4"
      style={{ background: '#f8fafc' }}
    >
      {/* Título */}
      <div className="text-center flex-shrink-0">
        <p className="text-slate-500 font-semibold uppercase tracking-widest" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
          Centro de operações
        </p>
        <p className="font-bold text-slate-800" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.1rem)' }}>
          Tudo em um único painel
        </p>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {MODULOS.slice(0, visible).map((m, i) => (
          <div
            key={m.label}
            className="flex flex-col items-center gap-1 rounded-xl p-2.5"
            style={{
              background: 'white',
              border: `1px solid ${m.color}20`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
            <p className="font-bold text-center" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', color: m.color }}>
              {m.value}
            </p>
            <p className="text-gray-500 text-center" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Tag final */}
      {tagVisible && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #10b981)',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            opacity: tagVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-white font-bold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Simples de usar · Completo para escalar
          </span>
        </div>
      )}
    </div>
  )
}