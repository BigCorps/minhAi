'use client'
// components/tour/scenes/SceneFuncoesCategorias.tsx
// Componente reutilizável — recebe duas categorias e exibe grid animado

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

export interface FuncaoItem {
  nome: string
  desc: string
  premium?: boolean
  meta?: boolean
  ai?: boolean
  spark?: boolean // IA generativa (Sparkles)
}

export interface CategoriaConfig {
  nome: string
  color: string
  funcoes: FuncaoItem[]
}

interface Props {
  cat1: CategoriaConfig
  cat2: CategoriaConfig
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="rounded-full px-1 font-semibold"
      style={{ background: bg, color, border: `1px solid ${color}30`, fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', padding: '1px 4px' }}
    >
      {label}
    </span>
  )
}

function CatPanel({ cat, visible, startIdx }: { cat: CategoriaConfig; visible: number; startIdx: number }) {
  return (
    <div className="flex-1 flex flex-col gap-1.5 min-w-0 overflow-hidden">
      {/* Header da categoria */}
      <div
        className="rounded-xl px-2.5 py-1.5 flex-shrink-0 flex items-center gap-2"
        style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}25` }}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{cat.nome}</p>
        <span className="ml-auto font-semibold" style={{ color: cat.color, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
          {cat.funcoes.length} funções
        </span>
      </div>

      {/* Lista de funções */}
      <div className="flex flex-col gap-1 overflow-hidden flex-1">
        {cat.funcoes.map((fn, i) => {
          const globalIdx = startIdx + i
          const show = globalIdx < visible
          return (
            <div
              key={fn.nome}
              className="rounded-lg px-2 py-1.5 flex items-start gap-1.5 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                opacity: show ? 1 : 0,
                transform: show ? 'translateX(0)' : 'translateX(-6px)',
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: cat.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="font-semibold text-white/80" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>
                    {fn.nome}
                  </p>
                  {fn.spark && <Badge label="✦ IA" color="#a78bfa" bg="rgba(167,139,250,0.15)" />}
                  {fn.meta && <Badge label="Meta" color="#10b981" bg="rgba(16,185,129,0.12)" />}
                  {fn.premium && <Badge label="Premium" color="#f59e0b" bg="rgba(245,158,11,0.12)" />}
                </div>
                <p className="text-white/35 truncate" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>
                  {fn.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SceneFuncoesCategorias({ cat1, cat2 }: Props) {
  const total = cat1.funcoes.length + cat2.funcoes.length
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= total) return
    const t = setTimeout(() => setVisible(v => v + 1), 200)
    return () => clearTimeout(t)
  }, [visible, total])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: cat1.color }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{cat1.nome}</span>
        </div>
        <span className="text-white/20" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>·</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: cat2.color }} />
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{cat2.nome}</span>
        </div>
      </div>

      {/* Duas colunas */}
      <div className="flex-1 min-h-0 flex gap-2 px-3 py-2 overflow-hidden">
        <CatPanel cat={cat1} visible={visible} startIdx={0} />
        <div className="w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <CatPanel cat={cat2} visible={visible} startIdx={cat1.funcoes.length} />
      </div>
    </div>
  )
}
