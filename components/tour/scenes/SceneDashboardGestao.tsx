'use client'
// components/tour/scenes/SceneDashboardGestao.tsx
// Cards das seções de gestão — Vendas, Produção, Usuários, Notas, Arquivos

import { useEffect, useState } from 'react'

const SECOES = [
  {
    nome: 'Vendas e Produtos',
    desc: 'Catálogo com fotos, preços e categorias',
    color: '#10b981',
    stats: '48 produtos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    ),
  },
  {
    nome: 'Linha de Produção',
    desc: 'Fichas técnicas e custos',
    color: '#3b82f6',
    stats: '12 fichas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    ),
  },
  {
    nome: 'Controle de Usuários',
    desc: 'Clientes e colaboradores',
    color: '#8b5cf6',
    stats: '124 clientes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    nome: 'Notas Fiscais',
    desc: 'NFe, NFSe e NFCe emitidas',
    color: '#f59e0b',
    stats: '89 notas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    nome: 'Arquivos',
    desc: 'Documentos enviados pelo assistente',
    color: '#ef4444',
    stats: '37 arquivos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    nome: 'Respostas Rápidas',
    desc: 'FAQs configuradas',
    color: '#06b6d4',
    stats: '15 respostas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
]

export default function SceneDashboardGestao() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= SECOES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 300)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#f8fafc' }}
    >
      {/* Header */}
      <div
        className="flex items-center px-3 py-2 flex-shrink-0"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <p className="text-slate-800 font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
          Gestão do Negócio
        </p>
      </div>

      {/* Grid de seções */}
      <div className="flex-1 overflow-hidden p-3 grid grid-cols-2 gap-2 content-start">
        {SECOES.slice(0, visible).map((s, i) => (
          <div
            key={s.nome}
            className="rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer transition-all"
            style={{
              background: 'white',
              border: `1px solid ${s.color}20`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: s.color + '15',
                  color: s.color,
                  width: 'clamp(20px, 4vw, 26px)',
                  height: 'clamp(20px, 4vw, 26px)',
                }}
              >
                {s.icon}
              </div>
              <p className="font-bold text-slate-700 leading-tight" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
                {s.nome}
              </p>
            </div>
            <p className="text-gray-400" style={{ fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
              {s.desc}
            </p>
            <div
              className="rounded-full px-1.5 py-0.5 self-start font-semibold"
              style={{ background: s.color + '12', color: s.color, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}
            >
              {s.stats}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}