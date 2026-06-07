'use client'
// components/tour/scenes/SceneProducaoOrcamentos.tsx
// Três auxiliares: Produção + Relatórios + Orçamentos
// Mock fiel às UIs reais — mesma paleta, layout split chat+painel, animações progressivas

import { useEffect, useState, useRef } from 'react'

// ─── Paleta fiel aos modais ────────────────────────────────────────────────────
const C = {
  bg:       '#0f172a',   // bgChat
  surface:  '#1e293b',   // bg
  surface2: '#334155',   // bgSecondary / assistantBubble
  border:   '#475569',
  text:     '#f1f5f9',
  muted:    '#94a3b8',
  faint:    '#64748b',
  blue:     '#3b82f6',
  green:    '#22c55e',
  amber:    '#f59e0b',
  red:      '#ef4444',
  headerBg: 'rgba(15,23,42,0.85)',
}

type Panel = 'producao' | 'relatorios' | 'orcamento'
const SEQUENCE: Panel[]  = ['producao', 'relatorios', 'orcamento']
const PANEL_DURATION     = 5200

// ─── Dados Produção (fiel ao FichaConversacionalDisplay) ──────────────────────
const CHAT_PROD = [
  { from: 'user', text: 'Café Especial 250g — café verde 1kg R$28, 50 sachês R$6,50, 2h mão de obra R$12' },
  { from: 'bot',  text: 'Calculando custo total e margem automaticamente...' },
  { from: 'bot',  text: '✅ Ficha pronta! Produto criado no catálogo com preço sugerido.' },
]
const PROD_ITENS = [
  { label: 'Café Verde 1kg',    value: 'R$ 28,00',  tag: 'insumo'   },
  { label: '50 sachês',         value: 'R$ 6,50',   tag: 'insumo'   },
  { label: 'Mão de obra 2h',    value: 'R$ 12,00',  tag: 'insumo'   },
  { label: 'Custo total',       value: 'R$ 46,50',  tag: 'custo'    },
  { label: 'Margem 40%',        value: '+R$ 18,60', tag: 'margem'   },
  { label: 'Preço sugerido',    value: 'R$ 65,10',  tag: 'preco'    },
]

// ─── Dados Relatórios (fiel ao AnalisarPlanilhaDisplay) ──────────────────────
const CHAT_REL = [
  { from: 'user', text: '📊 vendas_q1_2025.xlsx' },
  { from: 'bot',  text: 'Planilha lida: 312 linhas, 8 colunas. Iniciando análise...' },
  { from: 'bot',  text: '✅ Dashboard gerado com KPIs, gráficos e insights.' },
]
const REL_KPIS = [
  { label: 'Receita Total',   value: 'R$ 28.740', icon: '↑', color: C.green  },
  { label: 'Ticket Médio',    value: 'R$ 179',    icon: '→', color: C.blue   },
  { label: 'Clientes Únicos', value: '156',       icon: '↑', color: C.green  },
  { label: 'Churn',           value: '4,2%',      icon: '↓', color: C.red    },
]
const REL_INSIGHTS = [
  { text: 'Pico às sextas: +38% vs média semanal', prio: 'high' },
  { text: 'Março cresceu 34% — sazonalidade identificada', prio: 'medium' },
]
// Barras do gráfico de barras mock
const REL_BARS = [
  { label: 'Jan', h: 55, color: C.blue  },
  { label: 'Fev', h: 68, color: C.blue  },
  { label: 'Mar', h: 88, color: C.green },
]

// ─── Dados Orçamento (fiel ao OrcamentoDisplay) ──────────────────────────────
const CHAT_ORC = [
  { from: 'user', text: 'Orçamento para Gráfica Silva — banner 2×1m (3un), cartão 500un, desconto 10%' },
  { from: 'bot',  text: 'Montando orçamento com itens, desconto e total...' },
  { from: 'bot',  text: '✅ Pronto! Gere o PDF com logo ou envie o link de pagamento PIX.' },
]
const ORC_ITENS = [
  { desc: 'Banner 2×1m',    qty: '3 un',   value: 'R$ 120,00',  neg: false },
  { desc: 'Cartão de Visita', qty: '500 un', value: 'R$ 89,90',  neg: false },
  { desc: 'Desconto 10%',   qty: '',        value: '- R$ 20,99', neg: true  },
]

// ─── SVG Icons inline ────────────────────────────────────────────────────────
const Ico = {
  ChefHat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/>
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  TrendUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  TrendDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Pix: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Mic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Volume: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  ClipboardList: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/>
    </svg>
  ),
}

// ─── TypingDots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, padding: '5px 8px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: C.muted,
          animation: `dotBounce 1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Shared: ChatColumn ───────────────────────────────────────────────────────
function ChatColumn({
  msgs, chatVisible, showTyping, accent, botIcon,
}: {
  msgs: typeof CHAT_PROD
  chatVisible: number
  showTyping: boolean
  accent: string
  botIcon: React.ReactNode
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${C.border}`,
      background: C.bg, overflow: 'hidden',
    }}>
      {/* Mensagens */}
      <div style={{
        flex: 1, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        gap: 5, overflow: 'hidden',
      }}>
        {msgs.slice(0, chatVisible).map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end', gap: 4,
          }}>
            {msg.from === 'bot' && (
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 8, height: 8, color: 'white' }}>{botIcon}</div>
              </div>
            )}
            <div style={{
              padding: '5px 9px', maxWidth: '80%',
              borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              background: msg.from === 'user' ? accent : C.surface2,
              color: C.text, fontSize: '0.46rem', lineHeight: 1.45,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {showTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 8, height: 8, color: 'white' }}>{botIcon}</div>
            </div>
            <div style={{ background: C.surface2, borderRadius: '10px 10px 10px 2px' }}>
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Input bar (fiel ao padrão dos modais) */}
      <div style={{
        padding: '6px 10px', borderTop: `1px solid ${C.border}`,
        display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0,
        background: C.surface,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 11, height: 11, color: 'white' }}><Ico.Mic /></div>
        </div>
        <div style={{
          flex: 1, padding: '4px 9px', borderRadius: 20,
          background: C.bg, border: `1px solid ${C.border}`,
          color: C.muted, fontSize: '0.42rem',
        }}>
          Digite ou use o microfone...
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 10, height: 10, color: 'white' }}><Ico.Send /></div>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Produção ──────────────────────────────────────────────────────────
function PanelProducao({ progress }: { progress: number }) {
  const chatVisible   = Math.floor(progress * (CHAT_PROD.length + 0.5))
  const showTyping    = progress > 0.06 && chatVisible < CHAT_PROD.length
  const formProgress  = progress > 0.38 ? (progress - 0.38) / 0.62 : 0
  const itensVisible  = Math.floor(formProgress * (PROD_ITENS.length + 1))
  const showSalvar    = itensVisible >= PROD_ITENS.length

  const tagColor = (tag: string) => {
    if (tag === 'preco')  return C.green
    if (tag === 'margem') return C.blue
    if (tag === 'custo')  return C.amber
    return C.muted
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Chat */}
      <ChatColumn
        msgs={CHAT_PROD}
        chatVisible={chatVisible}
        showTyping={showTyping}
        accent={C.blue}
        botIcon={<Ico.ChefHat />}
      />

      {/* Painel direito — Ficha de Produção */}
      <div style={{
        width: '46%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.surface,
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 10px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <div style={{ width: 10, height: 10, color: C.blue }}><Ico.ClipboardList /></div>
          <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>Preview da Ficha</span>
          {showSalvar && (
            <span style={{
              marginLeft: 'auto', padding: '1px 6px', borderRadius: 20,
              background: `${C.green}18`, border: `1px solid ${C.green}44`,
              color: C.green, fontSize: '0.38rem', fontWeight: 700,
            }}>✓ Pronta</span>
          )}
        </div>

        {/* Nome do produto */}
        {itensVisible >= 1 && (
          <div style={{ padding: '8px 10px 4px', flexShrink: 0 }}>
            <div style={{ color: C.muted, fontSize: '0.38rem', marginBottom: 2 }}>Nome</div>
            <div style={{ color: C.text, fontSize: '0.52rem', fontWeight: 700 }}>Café Especial 250g</div>
          </div>
        )}

        {/* Tags (fiel ao FichaConversacionalDisplay) */}
        {itensVisible >= 1 && (
          <div style={{ padding: '2px 10px 6px', display: 'flex', gap: 4, flexShrink: 0 }}>
            {['produto', 'vendável'].map(tag => (
              <span key={tag} style={{
                padding: '1px 7px', borderRadius: 4,
                background: `${C.blue}22`, color: C.blue,
                fontSize: '0.38rem', fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Itens de custo */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: C.muted, fontSize: '0.38rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Ingredientes & Custos
          </div>
          {PROD_ITENS.map((item, i) => {
            const visible = itensVisible > i
            const isDivider = item.tag === 'custo'
            return (
              <div key={item.label}>
                {isDivider && visible && (
                  <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 4, marginTop: 2 }} />
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  opacity: visible ? 1 : 0.12, transition: 'opacity 0.3s ease',
                  padding: item.tag === 'preco' ? '4px 7px' : '1px 0',
                  borderRadius: item.tag === 'preco' ? 7 : 0,
                  background: item.tag === 'preco' ? `${C.green}10` : 'transparent',
                  border: item.tag === 'preco' && visible ? `1px solid ${C.green}30` : '1px solid transparent',
                }}>
                  <span style={{ color: C.muted, fontSize: '0.42rem' }}>{item.label}</span>
                  <span style={{
                    fontSize: item.tag === 'preco' ? '0.52rem' : '0.44rem',
                    fontWeight: item.tag === 'preco' || item.tag === 'custo' ? 700 : 500,
                    color: visible ? tagColor(item.tag) : C.muted,
                    transition: 'color 0.3s ease',
                  }}>
                    {visible ? item.value : '···'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão salvar (fiel ao FichaConversacionalDisplay) */}
        <div style={{ padding: '7px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{
            width: '100%', padding: '6px 0', borderRadius: 8,
            background: showSalvar ? C.green : `${C.green}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.4s ease',
          }}>
            <div style={{ width: 10, height: 10, color: 'white' }}>
              {showSalvar ? <Ico.Check /> : <Ico.Plus />}
            </div>
            <span style={{ color: 'white', fontSize: '0.46rem', fontWeight: 700 }}>
              {showSalvar ? 'Salvar Ficha' : 'Aguardando dados...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Relatórios ────────────────────────────────────────────────────────
function PanelRelatorios({ progress }: { progress: number }) {
  const chatVisible  = Math.floor(progress * (CHAT_REL.length + 0.5))
  const showTyping   = progress > 0.06 && chatVisible < CHAT_REL.length
  const dashProgress = progress > 0.42 ? (progress - 0.42) / 0.58 : 0
  const kpisVisible  = Math.floor(dashProgress * (REL_KPIS.length + 1))
  const showBars     = dashProgress > 0.5
  const showInsights = dashProgress > 0.75
  const showExport   = dashProgress > 0.9

  const priColor = (p: string) => p === 'high' ? C.red : C.amber

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Chat */}
      <ChatColumn
        msgs={CHAT_REL}
        chatVisible={chatVisible}
        showTyping={showTyping}
        accent={C.blue}
        botIcon={<Ico.BarChart />}
      />

      {/* Painel direito — Dashboard (fiel ao AnalisarPlanilhaDisplay) */}
      <div style={{
        width: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.surface,
      }}>
        {/* Header com tabs (fiel às abas KPI/Gráficos/Insights/Resumo) */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            padding: '7px 10px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, color: C.blue }}><Ico.BarChart /></div>
              <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>Dashboard</span>
              {kpisVisible >= REL_KPIS.length && (
                <span style={{
                  padding: '1px 5px', borderRadius: 4, fontSize: '0.38rem', fontWeight: 700,
                  background: `${C.green}18`, color: C.green,
                }}>✓ Pronto</span>
              )}
            </div>
            {showExport && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6,
                background: C.blue, cursor: 'pointer',
              }}>
                <div style={{ width: 8, height: 8, color: 'white' }}><Ico.Download /></div>
                <span style={{ color: 'white', fontSize: '0.38rem', fontWeight: 700 }}>PDF</span>
              </div>
            )}
          </div>
          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {['KPIs', 'Gráficos', 'Insights', 'Resumo'].map((tab, i) => (
              <div key={tab} style={{
                flex: 1, padding: '4px 2px', textAlign: 'center',
                fontSize: '0.4rem', fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? C.blue : C.muted,
                borderBottom: `2px solid ${i === 0 ? C.blue : 'transparent'}`,
              }}>{tab}</div>
            ))}
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* KPIs grid (fiel ao KPICard) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {REL_KPIS.map((kpi, i) => {
              const visible = kpisVisible > i
              return (
                <div key={kpi.label} style={{
                  padding: '6px 8px', borderRadius: 8,
                  background: 'rgba(30,58,95,0.5)', border: `1px solid ${C.blue}22`,
                  opacity: visible ? 1 : 0.12, transition: 'opacity 0.3s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ color: C.muted, fontSize: '0.38rem' }}>{kpi.label}</span>
                    <div style={{ width: 9, height: 9, color: kpi.color }}>
                      {kpi.icon === '↑' ? <Ico.TrendUp /> : kpi.icon === '↓' ? <Ico.TrendDown /> : null}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.54rem', fontWeight: 700,
                    color: visible ? kpi.color : C.muted,
                    transition: 'color 0.3s ease',
                  }}>
                    {visible ? kpi.value : '···'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Gráfico de barras mock */}
          {showBars && (
            <div style={{
              padding: '6px 8px', borderRadius: 8,
              background: C.bg, border: `1px solid ${C.border}`,
            }}>
              <p style={{ color: C.muted, fontSize: '0.38rem', marginBottom: 8 }}>Vendas por mês</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 40 }}>
                {REL_BARS.map((bar, i) => (
                  <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: '100%', borderRadius: '2px 2px 0 0',
                      background: bar.color, height: `${bar.h}%`,
                      transition: 'height 0.6s ease',
                    }} />
                    <span style={{ color: C.muted, fontSize: '0.36rem' }}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights (fiel ao InsightCard) */}
          {showInsights && REL_INSIGHTS.map((ins, i) => (
            <div key={i} style={{
              padding: '5px 8px', borderRadius: 7,
              background: C.surface2, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 5,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: priColor(ins.prio),
              }} />
              <span style={{ color: C.text, fontSize: '0.42rem', lineHeight: 1.4 }}>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Painel Orçamento ─────────────────────────────────────────────────────────
function PanelOrcamento({ progress }: { progress: number }) {
  const chatVisible  = Math.floor(progress * (CHAT_ORC.length + 0.5))
  const showTyping   = progress > 0.06 && chatVisible < CHAT_ORC.length
  const orcProgress  = progress > 0.4 ? (progress - 0.4) / 0.6 : 0
  const itensVisible = Math.floor(orcProgress * (ORC_ITENS.length + 1.5))
  const showTotal    = itensVisible >= ORC_ITENS.length
  const showPdf      = orcProgress > 0.72
  const showPix      = orcProgress > 0.88

  const total = 188.91

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Chat */}
      <ChatColumn
        msgs={CHAT_ORC}
        chatVisible={chatVisible}
        showTyping={showTyping}
        accent={C.blue}
        botIcon={<Ico.FileText />}
      />

      {/* Painel direito — Preview Orçamento (fiel ao PreviewOrcamento) */}
      <div style={{
        width: '48%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.surface,
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 10px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <div style={{ width: 10, height: 10, color: C.blue }}><Ico.FileText /></div>
          <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>Preview do Orçamento</span>
        </div>

        {/* Logo da empresa (fiel ao OrcamentoDisplay com companyInfo) */}
        {itensVisible >= 1 && (
          <div style={{
            margin: '6px 10px 0', padding: '5px 8px', borderRadius: 8,
            background: C.surface2, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              background: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontSize: '0.38rem', fontWeight: 800 }}>GS</span>
            </div>
            <div>
              <p style={{ color: C.text, fontSize: '0.44rem', fontWeight: 700, margin: 0 }}>Gráfica Silva</p>
              <p style={{ color: C.muted, fontSize: '0.38rem', margin: 0 }}>Orçamento #042</p>
            </div>
          </div>
        )}

        {/* Itens */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {itensVisible >= 1 && (
            <div style={{ color: C.muted, fontSize: '0.38rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Itens ({Math.min(itensVisible, ORC_ITENS.length)})
            </div>
          )}
          {ORC_ITENS.map((item, i) => {
            const visible = itensVisible > i
            return (
              <div key={item.desc} style={{
                padding: '5px 8px', borderRadius: 7,
                background: C.surface2, border: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: visible ? 1 : 0.1, transition: 'opacity 0.3s ease',
              }}>
                <div>
                  <p style={{ color: C.text, fontSize: '0.44rem', fontWeight: 500, margin: 0 }}>{item.desc}</p>
                  {item.qty && <p style={{ color: C.muted, fontSize: '0.38rem', margin: 0 }}>{item.qty}</p>}
                </div>
                <span style={{
                  fontSize: '0.44rem', fontWeight: 600,
                  color: visible ? (item.neg ? C.red : C.text) : C.muted,
                  transition: 'color 0.3s ease',
                }}>
                  {visible ? item.value : '···'}
                </span>
              </div>
            )
          })}

          {/* Total (fiel ao bloco de total do OrcamentoDisplay) */}
          {showTotal && (
            <div style={{
              padding: '7px 10px', borderRadius: 8,
              background: `${C.blue}18`, border: `1px solid ${C.blue}40`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>TOTAL</span>
              <span style={{ color: C.blue, fontSize: '0.58rem', fontWeight: 800 }}>
                R$ {total.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Footer — Botões PDF + PIX (fiel ao PreviewOrcamento) */}
        <div style={{
          padding: '7px 10px', borderTop: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0,
        }}>
          {/* Botão Gerar PDF */}
          <div style={{
            width: '100%', padding: '5px 0', borderRadius: 7,
            background: showPdf ? C.blue : `${C.blue}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.4s ease',
          }}>
            <div style={{ width: 10, height: 10, color: 'white' }}><Ico.Download /></div>
            <span style={{ color: 'white', fontSize: '0.44rem', fontWeight: 700 }}>
              {showPdf ? 'Baixar PDF com logo' : 'Gerar PDF'}
            </span>
          </div>

          {/* PIX (fiel ao bloco PIX do OrcamentoDisplay) */}
          {showPix && (
            <div style={{
              padding: '5px 8px', borderRadius: 7,
              background: 'rgba(50,188,173,0.12)', border: '1px solid rgba(50,188,173,0.35)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{ width: 11, height: 11, color: '#32bcad', flexShrink: 0 }}><Ico.Pix /></div>
              <div>
                <p style={{ color: '#32bcad', fontSize: '0.44rem', fontWeight: 700, margin: 0 }}>
                  Link PIX gerado · R$ {total.toFixed(2)}
                </p>
                <p style={{ color: 'rgba(50,188,173,0.7)', fontSize: '0.38rem', margin: 0 }}>
                  Copie e envie ao cliente
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Configuração dos painéis ─────────────────────────────────────────────────
const PANEL_CONFIG: Record<Panel, {
  label: string; icon: keyof typeof Ico; accent: string; headerLabel: string;
}> = {
  producao:   { label: 'Produção',   icon: 'ChefHat',  accent: C.blue, headerLabel: 'Auxiliar de Produção'   },
  relatorios: { label: 'Relatórios', icon: 'BarChart',  accent: C.blue, headerLabel: 'Auxiliar de Relatórios' },
  orcamento:  { label: 'Orçamentos', icon: 'FileText',  accent: C.blue, headerLabel: 'Assistente de Orçamentos' },
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneProducaoOrcamentos() {
  const [panelIdx, setPanelIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [fadeIn, setFadeIn]     = useState(true)
  const animRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentPanel = SEQUENCE[panelIdx]
  const cfg          = PANEL_CONFIG[currentPanel]
  const IconComp     = Ico[cfg.icon]

  useEffect(() => {
    setProgress(0)
    setFadeIn(false)
    const fadeTimer = setTimeout(() => setFadeIn(true), 100)

    const tick  = 50
    const steps = PANEL_DURATION / tick

    if (animRef.current) clearInterval(animRef.current)
    animRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + 1 / steps
        if (next >= 1) {
          clearInterval(animRef.current!)
          setTimeout(() => setPanelIdx(i => (i + 1) % SEQUENCE.length), 180)
          return 1
        }
        return next
      })
    }, tick)

    return () => {
      clearInterval(animRef.current!)
      clearTimeout(fadeTimer)
    }
  }, [panelIdx])

  return (
    <>
      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
        style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* ── Header fiel ao padrão dos modais ── */}
        <div style={{
          padding: '7px 12px', borderBottom: `1px solid ${C.border}`,
          background: C.headerBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: cfg.accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 12, height: 12, color: 'white' }}><IconComp /></div>
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 800, fontSize: '0.58rem', lineHeight: 1, margin: 0 }}>
                {cfg.headerLabel}
              </p>
              <p style={{ color: C.muted, fontSize: '0.4rem', margin: '2px 0 0' }}>Cafeteria Bom Grão</p>
            </div>
          </div>

          {/* Tab switcher (fiel ao padrão do SceneExtrasAux) */}
          <div style={{ display: 'flex', gap: 2 }}>
            {SEQUENCE.map((p, i) => {
              const pcfg  = PANEL_CONFIG[p]
              const active = p === currentPanel
              const PIco  = Ico[pcfg.icon]
              return (
                <button
                  key={p}
                  onClick={() => setPanelIdx(i)}
                  style={{
                    padding: '3px 7px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: active ? `${C.blue}22` : 'rgba(255,255,255,0.04)',
                    color: active ? C.blue : C.muted,
                    fontSize: '0.4rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 3,
                    outline: `1px solid ${active ? `${C.blue}40` : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ width: 8, height: 8 }}><PIco /></div>
                  {pcfg.label}
                </button>
              )
            })}
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 18, height: 18, padding: 3, color: C.muted }}><Ico.Volume /></div>
            <div style={{ width: 18, height: 18, padding: 3, color: C.muted }}><Ico.X /></div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: 2, background: C.surface, flexShrink: 0 }}>
          <div style={{
            height: '100%', background: C.blue,
            width: `${progress * 100}%`, transition: 'width 0.05s linear',
          }} />
        </div>

        {/* ── Conteúdo ── */}
        <div
          key={panelIdx}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(7px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}
        >
          {currentPanel === 'producao'   && <PanelProducao   progress={progress} />}
          {currentPanel === 'relatorios' && <PanelRelatorios progress={progress} />}
          {currentPanel === 'orcamento'  && <PanelOrcamento  progress={progress} />}
        </div>
      </div>
    </>
  )
}
