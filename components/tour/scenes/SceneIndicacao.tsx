'use client'
// components/tour/scenes/SceneIndicacao.tsx
// Programa de indicação — créditos acumulados + link de indicação

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const INDICACOES = [
  { nome: 'Padaria do João',    creditos: 50,  status: 'ativo' },
  { nome: 'Salão da Maria',     creditos: 50,  status: 'ativo' },
  { nome: 'Auto Peças Silva',   creditos: 50,  status: 'ativo' },
  { nome: 'Clínica Bem Estar',  creditos: 50,  status: 'pendente' },
]

export default function SceneIndicacao() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [totalVisible, setTotalVisible] = useState(false)

  useEffect(() => {
    if (visibleCount >= INDICACOES.length) return
    const t = setTimeout(() => setVisibleCount(v => v + 1), 500)
    return () => clearTimeout(t)
  }, [visibleCount])

  useEffect(() => {
    if (visibleCount < INDICACOES.length) return
    const t = setTimeout(() => setTotalVisible(true), 400)
    return () => clearTimeout(t)
  }, [visibleCount])

  const totalCreditos = INDICACOES.filter(i => i.status === 'ativo').reduce((a, b) => a + b.creditos, 0)

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Programa de Indicação
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-3 overflow-hidden">

        {/* Link de indicação */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 flex-shrink-0"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-amber-300 font-mono font-semibold truncate flex-1" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>
            minhai.app/ref/cafeexemplo
          </span>
          <div className="flex-shrink-0 rounded-lg px-1.5 py-0.5" style={{ background: 'rgba(251,191,36,0.2)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', color: '#fde68a' }}>
            Compartilhar
          </div>
        </div>

        {/* Lista de indicações */}
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          <p className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
            Suas indicações
          </p>
          {INDICACOES.slice(0, visibleCount).map((ind, i) => (
            <div
              key={ind.nome}
              className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
              style={{
                background: ind.status === 'ativo' ? 'rgba(132,204,22,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${ind.status === 'ativo' ? 'rgba(132,204,22,0.2)' : 'rgba(255,255,255,0.08)'}`,
                opacity: 1,
                transition: 'all 300ms ease',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                  style={{
                    background: ind.status === 'ativo' ? 'rgba(132,204,22,0.2)' : 'rgba(255,255,255,0.08)',
                    color: ind.status === 'ativo' ? '#84cc16' : 'rgba(255,255,255,0.3)',
                    fontSize: '0.38rem',
                  }}
                >
                  {ind.nome.charAt(0)}
                </div>
                <span className="text-white/70 truncate" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{ind.nome}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  style={{
                    color: ind.status === 'ativo' ? '#84cc16' : 'rgba(255,255,255,0.3)',
                    fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
                    fontWeight: 700,
                  }}
                >
                  {ind.status === 'ativo' ? `+${ind.creditos} créditos` : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total de créditos */}
        {totalVisible && (
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(132,204,22,0.15), rgba(16,185,129,0.1))',
              border: '1px solid rgba(132,204,22,0.3)',
              opacity: totalVisible ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          >
            <div>
              <p className="text-white/50" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Total acumulado</p>
              <p className="text-white font-bold" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)' }}>
                {totalCreditos} créditos
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Equivalem a</p>
              <p className="text-emerald-400 font-bold" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)' }}>
                R$ {(totalCreditos * 0.05).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}