'use client'
// components/tour/scenes/SceneExtrasAux.tsx
// Três auxiliares: Antifraude + Relatórios + Cadastro de Produto

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

type Panel = 'antifraude' | 'relatorios' | 'cadastro'
const SEQUENCE: Panel[] = ['antifraude', 'relatorios', 'cadastro']

// Antifraude
const RISCO_ITEMS = [
  { label: 'Linha digitável', status: 'ok',   text: 'Banco real — Itaú S.A.' },
  { label: 'Beneficiário',    status: 'ok',   text: 'CNPJ verificado' },
  { label: 'Valor',           status: 'warn', text: 'R$ 0,00 — suspeito' },
  { label: 'Código de barras',status: 'err',  text: 'Inconsistente com linha' },
]

// Relatórios
const RELATORIO_ROWS = [
  { mes: 'Janeiro', vendas: 'R$ 8.420', clientes: 42, ticket: 'R$ 200' },
  { mes: 'Fevereiro', vendas: 'R$ 9.100', clientes: 51, ticket: 'R$ 178' },
  { mes: 'Março',   vendas: 'R$ 11.300', clientes: 63, ticket: 'R$ 179' },
]

// Cadastro
const CADASTRO_FIELDS = [
  { label: 'Nome',      value: 'Café Especial 250g' },
  { label: 'Categoria', value: 'Cafés' },
  { label: 'Descrição', value: 'Grãos selecionados, torra média, notas de caramelo' },
  { label: 'Preço',     value: 'R$ 32,90' },
  { label: 'Imagem',    value: '✓ Recomendação gerada pela IA' },
]

export default function SceneExtrasAux() {
  const [panelIdx, setPanelIdx] = useState(0)
  const [subStep, setSubStep]   = useState(0)

  const panel = SEQUENCE[panelIdx]

  // Avança painel a cada 4s
  useEffect(() => {
    const t = setTimeout(() => {
      setSubStep(0)
      setPanelIdx(i => (i + 1) % SEQUENCE.length)
    }, 4500)
    return () => clearTimeout(t)
  }, [panelIdx])

  // Avança sub-steps dentro do painel
  useEffect(() => {
    setSubStep(0)
    const items = panel === 'antifraude' ? RISCO_ITEMS.length
      : panel === 'relatorios' ? RELATORIO_ROWS.length
      : CADASTRO_FIELDS.length
    if (subStep >= items) return
    const t = setTimeout(() => setSubStep(v => v + 1), 400)
    return () => clearTimeout(t)
  }, [subStep, panel])

  const statusColor = (s: string) =>
    s === 'ok' ? '#84cc16' : s === 'warn' ? '#f59e0b' : '#f87171'

  const statusIcon = (s: string) => s === 'ok'
    ? <polyline points="20 6 9 17 4 12"/>
    : s === 'warn'
    ? <><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1"/></>
    : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Tab switcher */}
      <div
        className="flex gap-1 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        {(['antifraude', 'relatorios', 'cadastro'] as Panel[]).map(p => (
          <button
            key={p}
            className="rounded-full px-2.5 py-0.5 font-semibold transition-all duration-300"
            style={{
              fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)',
              background: panel === p ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
              color: panel === p ? '#93c5fd' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${panel === p ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
            onClick={() => { setPanelIdx(SEQUENCE.indexOf(p)); setSubStep(0) }}
          >
            {p === 'antifraude' ? 'Antifraude' : p === 'relatorios' ? 'Relatórios' : 'Cadastro'}
          </button>
        ))}
      </div>

      {/* Painel Antifraude */}
      {panel === 'antifraude' && (
        <div className="flex-1 flex flex-col gap-2 px-3 py-3 overflow-hidden">
          <p className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
            Análise de boleto
          </p>
          <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
            {RISCO_ITEMS.slice(0, subStep).map(item => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
                style={{ background: `${statusColor(item.status)}10`, border: `1px solid ${statusColor(item.status)}25` }}
              >
                <span className="text-white/50" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: statusColor(item.status), fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>{item.text}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke={statusColor(item.status)} strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, flexShrink: 0 }}>
                    {statusIcon(item.status)}
                  </svg>
                </div>
              </div>
            ))}
          </div>
          {subStep >= RISCO_ITEMS.length && (
            <div
              className="flex items-center justify-between rounded-xl px-3 py-2 flex-shrink-0"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Laudo: ALTO RISCO</span>
              <span style={{ color: '#f87171', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Não pague!</span>
            </div>
          )}
        </div>
      )}

      {/* Painel Relatórios */}
      {panel === 'relatorios' && (
        <div className="flex-1 flex flex-col gap-2 px-3 py-3 overflow-hidden">
          <p className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
            Relatório de vendas — Q1 2025
          </p>
          <div className="flex flex-col gap-1 flex-1 overflow-hidden">
            {/* Cabeçalho */}
            <div className="grid grid-cols-4 gap-1 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Mês', 'Vendas', 'Clientes', 'Ticket médio'].map(h => (
                <span key={h} className="font-semibold text-white/30" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{h}</span>
              ))}
            </div>
            {RELATORIO_ROWS.slice(0, subStep).map(row => (
              <div key={row.mes} className="grid grid-cols-4 gap-1 rounded-lg px-1 py-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{row.mes}</span>
                <span className="text-emerald-400 font-semibold" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{row.vendas}</span>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{row.clientes}</span>
                <span className="text-white/60" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{row.ticket}</span>
              </div>
            ))}
          </div>
          {subStep >= RELATORIO_ROWS.length && (
            <div
              className="rounded-xl px-3 py-2 flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
            >
              <p className="text-blue-300 font-semibold" style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>
                Insight IA: crescimento de 34% em março — março é sazonalmente forte para o segmento
              </p>
            </div>
          )}
        </div>
      )}

      {/* Painel Cadastro */}
      {panel === 'cadastro' && (
        <div className="flex-1 flex flex-col gap-2 px-3 py-3 overflow-hidden">
          <p className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>
            Auxiliar de Cadastro
          </p>
          <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
            {CADASTRO_FIELDS.slice(0, subStep).map((f, i) => (
              <div
                key={f.label}
                className="flex items-start gap-2 rounded-xl px-2.5 py-1.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="flex-shrink-0 text-white/40" style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)', minWidth: 56 }}>{f.label}</span>
                <span
                  className="font-semibold"
                  style={{
                    color: i === 4 ? '#84cc16' : 'rgba(255,255,255,0.8)',
                    fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)',
                  }}
                >
                  {f.value}
                </span>
              </div>
            ))}
          </div>
          {subStep >= CADASTRO_FIELDS.length && (
            <div
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 flex-shrink-0"
              style={{ background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.25)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ color: '#84cc16', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.85vw, 0.5rem)' }}>
                Produto criado — disponível para venda na hora
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}