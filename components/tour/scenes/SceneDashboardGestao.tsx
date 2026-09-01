'use client'
// components/tour/scenes/SceneDashboardGestao.tsx
// Loop entre 5 seções: Vendas · Usuários · Produção · Notas Fiscais · Arquivos

import { useEffect, useRef, useState, useCallback } from 'react'

const BASE_W = 520
const BASE_H = 420

// ─── SVGs ──────────────────────────────────────────────────────────────────
const IcoCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
  </svg>
)
const IcoUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IcoClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
)
const IcoReceipt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="16" y2="14" />
  </svg>
)
const IcoFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
)
const IcoSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IcoTrendUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
)
const IcoBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
  </svg>
)
const IcoAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IcoDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
)
const IcoEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IcoTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)
const IcoPrint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)
const IcoNote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

// ─── Shared ────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'rgba(30,41,59,0.6)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
}

function Toggle({ on, color = '#3b82f6' }: { on: boolean; color?: string }) {
  return (
    <div style={{ width: 34, height: 19, borderRadius: 10, position: 'relative', flexShrink: 0, background: on ? color : 'rgba(255,255,255,0.15)', transition: 'background 300ms' }}>
      <div style={{ position: 'absolute', top: 2.5, left: on ? 17 : 2.5, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 300ms', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function PageHeader({ title, sub, assistant, badge, badgeColor = '#10b981' }: { title: string; sub: string; assistant: string; badge: string; badgeColor?: string }) {
  return (
    <div style={{ marginBottom: 8, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{title}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {sub} <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{assistant}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${badgeColor}22`, border: `0.5px solid ${badgeColor}55` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: badgeColor }} />
          <span style={{ fontSize: 8.5, fontWeight: 600, color: badgeColor }}>Conectado</span>
        </div>
      </div>
    </div>
  )
}

function ModoBanner({ label, active, color = '#10b981' }: { label: string; active: boolean; color?: string }) {
  return (
    <div style={{ ...card, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0, background: `${color}0d`, border: `0.5px solid ${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, color }}><IcoCart /></div>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8.5, color: active ? color : 'rgba(255,255,255,0.4)' }}>{active ? 'Ativo' : 'Inativo'}</span>
        <Toggle on={active} color={color} />
      </div>
    </div>
  )
}

function Tabs({ items, active }: { items: string[]; active: number }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 10, flexShrink: 0 }}>
      {items.map((t, i) => (
        <div key={t} style={{
          padding: '6px 8px', fontSize: 9, fontWeight: i === active ? 600 : 400,
          color: i === active ? '#fff' : 'rgba(255,255,255,0.4)',
          borderBottom: i === active ? '2px solid #3b82f6' : '2px solid transparent',
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {t}
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, color, Icon }: { label: string; value: string; sub?: string; color: string; Icon: React.FC }) {
  return (
    <div style={{ ...card, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <div style={{ width: 12, height: 12, color }}><Icon /></div>
        <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: VENDAS E PRODUTOS — Visão Geral
// ═══════════════════════════════════════════════════════════════════════════
function SecaoVendas() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Vendas e Produtos" sub="Gerencie a loja virtual do assistente" assistant="Café Exemplo" badge="Conectado" />
      <ModoBanner label="Modo Vendas" active={true} color="#10b981" />
      <Tabs items={['Visão Geral', 'Produtos', 'Pedidos', 'Pagamentos', 'Entrega']} active={0} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, flexShrink: 0 }}>
          <div style={{ ...card, padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 11, height: 11, color: '#10b981' }}><IcoTrendUp /></div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>Receita hoje</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>R$ 0,00</p>
            <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>Total: R$ 214,01</p>
          </div>
          <div style={{ ...card, padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 11, height: 11, color: '#3b82f6' }}><IcoClipboard /></div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>Pedidos pagos</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>19</p>
            <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>45 no total</p>
          </div>
          <div style={{ ...card, padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 11, height: 11, color: '#8b5cf6' }}><IcoBox /></div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>Produtos ativos</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>66</p>
            <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>67 cadastrados</p>
          </div>
          <div style={{ ...card, padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 11, height: 11, color: '#f59e0b' }}><IcoAlert /></div>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>Estoque baixo</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>1</p>
            <p style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>Precisam de reposição</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
          {[
            { ico: IcoBox, color: '#10b981', label: 'Gerenciar Produtos', sub: 'Cadastrar, editar preços e controlar estoque' },
            { ico: IcoClipboard, color: '#3b82f6', label: 'Ver Pedidos', sub: 'Histórico, status e detalhes de cada venda' },
          ].map(a => (
            <div key={a.label} style={{ ...card, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, color: a.color }}><a.ico /></div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{a.label}</p>
                <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: CONTROLE DE USUÁRIOS — Cadastros
// ═══════════════════════════════════════════════════════════════════════════
function SecaoUsuarios() {
  const rows = [
    { data: '12/05/2026', nome: 'Ithiel', email: 'ith.almeida@gmail.com', outro: '—' },
    { data: '18/03/2026', nome: 'ithiel', email: '—', outro: '1484552' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Controle de Usuários" sub="Gerencie cadastros, perfis e permissões do assistente" assistant="Café Exemplo" badge="Conectado" />
      <ModoBanner label="Modo Fila" active={true} color="#3b82f6" />
      <Tabs items={['Cadastros', 'Clientes', 'Colaboradores', 'Totens', 'Pesquisas/Avaliações', 'Pré-Atendimento']} active={0} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, ...card, padding: '6px 10px' }}>
            <div style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }}><IcoSearch /></div>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)' }}>Buscar por nome, telefone, e-mail...</span>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>2 registros</span>
          <div style={{ width: 22, height: 22, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 12, height: 12 }}><IcoRefresh /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 7, background: 'rgba(59,130,246,0.15)', border: '0.5px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 8.5, fontWeight: 600, cursor: 'pointer' }}>
            <div style={{ width: 10, height: 10 }}><IcoDownload /></div>
            Exportar CSV
          </div>
        </div>
        {/* Table */}
        <div style={{ ...card, overflow: 'hidden', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 100px 70px 60px', padding: '6px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', gap: 6 }}>
            {['Data', 'Nome', 'E-mail', 'outros_1773427421265', 'Biometria', 'Facial'].map((h, i) => (
              <span key={h} style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                {h}
                {i === 0 && <div style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.3)' }}><IcoChevronDown /></div>}
              </span>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 100px 70px 60px', padding: '8px 10px', borderBottom: i < rows.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>{r.data}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: '#fff' }}>{r.nome}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>{r.outro}</span>
              {['Pendente', 'Pendente'].map((b, j) => (
                <span key={j} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 600, textAlign: 'center' }}>{b}</span>
              ))}
            </div>
          ))}
          <div style={{ padding: '5px 10px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>2 do 2 cadastros</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: LINHA DE PRODUÇÃO — Produtos Finais
// ═══════════════════════════════════════════════════════════════════════════
function SecaoProducao() {
  const pizzas = [
    { nome: 'Pizza de Batata Frita', preco: 'R$ 45,00', margem: '83.0%', custo: 'R$ 7,65',  margemColor: '#10b981' },
    { nome: 'Pizza de Camarão',      preco: 'R$ 70,00', margem: '63.1%', custo: 'R$ 25,86', margemColor: '#10b981' },
    { nome: 'Pizza de Ricota',       preco: 'R$ 25,00', margem: '65.0%', custo: 'R$ 8,78',  margemColor: '#10b981' },
    { nome: 'Pizza de Catupiry',     preco: 'R$ 45,00', margem: '73.7%', custo: 'R$ 11,83', margemColor: '#10b981' },
    { nome: 'Pizza de Catupiry 2',   preco: 'R$ 45,00', margem: '59.4%', custo: 'R$ 18,27', margemColor: '#f59e0b' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Linha de Produção</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Gerencie fichas técnicas e custos de receitas</p>
      </div>
      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 10, flexShrink: 0 }}>
        {[
          { label: 'Total de Guias', value: '11' },
          { label: 'Guias Ativas',   value: '11', color: '#10b981' },
          { label: 'Com Custo',      value: '11', color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '9px 12px' }}>
            <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color ?? '#fff', margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 8, flexShrink: 0 }}>
        {[{ l: 'Produtos Finais', count: 11, active: true }, { l: 'Fichas de Preparo', count: 0 }, { l: 'Matéria Prima' }].map(t => (
          <div key={t.l} style={{ padding: '5px 10px', fontSize: 9, fontWeight: t.active ? 600 : 400, color: t.active ? '#fff' : 'rgba(255,255,255,0.4)', borderBottom: t.active ? '2px solid #3b82f6' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 4 }}>
            {t.l}
            {t.count !== undefined && (
              <span style={{ fontSize: 8, background: t.active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)', color: t.active ? '#93c5fd' : 'rgba(255,255,255,0.4)', borderRadius: 20, padding: '1px 5px', fontWeight: 600 }}>{t.count}</span>
            )}
          </div>
        ))}
      </div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 7, flexShrink: 0, flexWrap: 'wrap' }}>
        {['Todas', 'Ativas', 'Inativas'].map((f, i) => (
          <span key={f} style={{ fontSize: 8.5, padding: '3px 8px', borderRadius: 20, fontWeight: i === 0 ? 700 : 400, background: i === 0 ? '#e2e8f0' : 'transparent', color: i === 0 ? '#0f172a' : 'rgba(255,255,255,0.5)', border: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.2)' }}>{f}</span>
        ))}
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', marginLeft: 4 }}>11 fichas</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {[
            { l: 'Auxiliar de Produção', bg: 'rgba(34,197,94,0.12)', c: '#4ade80' },
            { l: '+ Nova Guia',          bg: '#2563eb', c: '#fff' },
          ].map(b => (
            <span key={b.l} style={{ fontSize: 8.5, padding: '3px 8px', borderRadius: 6, background: b.bg, color: b.c, fontWeight: 600 }}>{b.l}</span>
          ))}
        </div>
      </div>
      {/* Type pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexShrink: 0 }}>
        {['Produto', 'Preparo', 'Combo', 'Vendável', 'Comprado', 'Produzido'].map((p, i) => (
          <span key={p} style={{ fontSize: 8, padding: '3px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 8, height: 8, color: 'rgba(255,255,255,0.4)' }}><IcoClipboard /></div>
            {p}
          </span>
        ))}
      </div>
      {/* Fichas list */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {pizzas.map((p, i) => (
          <div key={i} style={{ ...card, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{p.nome}</span>
                <span style={{ fontSize: 7.5, padding: '1px 5px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontWeight: 600 }}>Ativa</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['produto', 'sim', 'produzido'].map(tag => (
                  <span key={tag} style={{ fontSize: 7.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}>{tag}</span>
                ))}
              </div>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Rendimento: 1 unidades · 5 ingredientes</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: '0 0 1px' }}>{p.preco}</p>
              <p style={{ fontSize: 8.5, color: p.margemColor, margin: '0 0 1px' }}>Margem: {p.margem}</p>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Custo: {p.custo}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8, flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.35)' }}><IcoChevronDown /></div>
              <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 5, background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontWeight: 600 }}>Ativa</span>
              <div style={{ width: 12, height: 12, color: '#f87171' }}><IcoTrash /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 4: NOTAS FISCAIS — Configuração
// ═══════════════════════════════════════════════════════════════════════════
function SecaoNotas() {
  const configSteps = [
    { label: 'Dados Fiscais', done: true },
    { label: 'Cadastro Brasil NFE', done: true },
    { label: 'Certificado Digital', done: true },
    { label: 'Ativação', done: true },
  ]
  const fields = [
    { label: 'CNPJ *', value: '14282244000119', full: false },
    { label: 'Tipo de Nota *', value: 'NF-e / NFC-e — Nota Fiscal de Produto', full: false, select: true },
    { label: 'Regime Tributário (CRT) *', value: '1 — Simples Nacional', full: false, select: true },
    { label: 'CNAE', value: '7319002', full: false },
    { label: 'Inscrição Estadual', value: '146488052111', full: false },
    { label: 'Inscrição Municipal', value: '4.374.866-0', full: false },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Notas Fiscais</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Emissão fiscal integrada ao assistente <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Café Exemplo</strong>
          </p>
        </div>
        <div style={{ padding: '5px 11px', borderRadius: 8, background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 11, height: 11 }}><IcoNote /></div>
          Emitir Nota
        </div>
      </div>
      {/* Credits banner */}
      <div style={{ ...card, padding: '6px 12px', marginBottom: 8, flexShrink: 0, background: 'rgba(59,130,246,0.08)', border: '0.5px solid rgba(59,130,246,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} style={{ width: 11, height: 11 }}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
          <span style={{ fontSize: 9, color: '#93c5fd' }}>minhAi Smart — <strong>2 créditos</strong> por nota emitida</span>
        </div>
      </div>
      {/* Sub-tabs */}
      <Tabs items={['Visão Geral', 'Clientes', 'Histórico', 'Configuração']} active={3} />
      {/* Config steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10, flexShrink: 0 }}>
        {configSteps.map(s => (
          <div key={s.label} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, color: '#fff' }}><IcoCheck /></div>
            </div>
            <span style={{ fontSize: 8.5, color: '#4ade80', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Dados Fiscais form */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ ...card, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, color: '#fff' }}><IcoCheck /></div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Dados Fiscais</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {fields.map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '5px 8px',
                  fontSize: 9.5, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</span>
                  {f.label === 'CNPJ *' && (
                    <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 5, background: '#2563eb', color: '#fff', fontWeight: 600, flexShrink: 0, marginLeft: 5 }}>Detectar</span>
                  )}
                  {f.select && <div style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}><IcoChevronDown /></div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div>
              <label style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3 }}>Ambiente</label>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', fontSize: 9.5, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                Homologação (testes, sem efeito fiscal)
                <div style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}><IcoChevronDown /></div>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 7, background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Salvar Dados Fiscais
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEÇÃO 5: ARQUIVOS — Lembretes
// ═══════════════════════════════════════════════════════════════════════════
function SecaoArquivos() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Arquivos</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Gerencie todos os arquivos gerados e recebidos no assistente Café Exemplo.</p>
      </div>
      {/* 4 stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 10, flexShrink: 0 }}>
        {[
          { label: 'Arquivos Enviados', value: '0',  color: '#fff'     },
          { label: 'Cupons',            value: '2',  color: '#3b82f6'  },
          { label: 'Total Consultas',   value: '35', color: '#f59e0b'  },
          { label: 'Impressões',        value: '47', color: '#10b981'  },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '9px 11px' }}>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 10, flexShrink: 0 }}>
        {[
          { l: 'Lembretes', ico: IcoNote, active: true },
          { l: 'Boletos',   ico: IcoReceipt },
          { l: 'Enviados',  ico: IcoDownload },
          { l: 'Cupons',    ico: IcoFolder },
          { l: 'Consultas', ico: IcoSearch },
          { l: 'Impressões',ico: IcoPrint },
        ].map(t => (
          <div key={t.l} style={{
            padding: '6px 9px', fontSize: 9, fontWeight: t.active ? 600 : 400,
            color: t.active ? '#fff' : 'rgba(255,255,255,0.4)',
            borderBottom: t.active ? '2px solid #3b82f6' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          }}>
            <div style={{ width: 10, height: 10, opacity: 0.7 }}><t.ico /></div>
            {t.l}
          </div>
        ))}
      </div>
      {/* Notas e Listas */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '7px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff' }}>Notas e Listas</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>1 nota · 1 lista</span>
              <div style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)' }}><IcoRefresh /></div>
            </div>
          </div>
          {/* Lista de Compras */}
          <div style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, color: '#10b981' }}><IcoCart /></div>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: 0 }}>Lista de Compras</p>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0' }}>03 de abr. de 2026</p>
                </div>
              </div>
              <span style={{ ...{ fontSize: 8, padding: '2px 7px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontWeight: 600 } }}>Ativa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.35)' }}>0 de 2 itens</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>0%</span>
                <span style={{ fontSize: 8.5, padding: '3px 9px', borderRadius: 6, background: '#10b981', color: '#fff', fontWeight: 700 }}>Continuar</span>
                <span style={{ fontSize: 8.5, padding: '3px 9px', borderRadius: 6, background: '#dc2626', color: '#fff', fontWeight: 700 }}>Excluir</span>
              </div>
            </div>
          </div>
          {/* Nota de texto */}
          <div style={{ padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, color: '#f59e0b' }}><IcoNote /></div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: 0 }}>teste</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0' }}>31/03/2026, 16:03</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                <div style={{ width: 20, height: 20, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)' }}><div style={{ width: 11, height: 11 }}><IcoEdit /></div></div>
                <div style={{ width: 20, height: 20, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}><div style={{ width: 11, height: 11 }}><IcoTrash /></div></div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '7px 10px', fontSize: 9.5, color: 'rgba(255,255,255,0.65)' }}>
              Testando, testando, testando 123123.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
type Section = 'vendas' | 'usuarios' | 'producao' | 'notas' | 'arquivos'
const SEQ: Section[] = ['vendas', 'usuarios', 'producao', 'notas', 'arquivos']

export default function SceneDashboardGestao() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    setScale(Math.min(1, (w - 12) / BASE_W, (h - 12) / BASE_H))
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % SEQ.length)
        setVisible(true)
      }, 350)
    }, 3800)
    return () => clearTimeout(t)
  }, [idx])

  const section = SEQ[idx]

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: BASE_W, height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        background: '#0f172a',
        borderRadius: 14,
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.1)',
        padding: '14px 16px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 350ms ease',
      }}>
        {section === 'vendas'   && <SecaoVendas />}
        {section === 'usuarios' && <SecaoUsuarios />}
        {section === 'producao' && <SecaoProducao />}
        {section === 'notas'    && <SecaoNotas />}
        {section === 'arquivos' && <SecaoArquivos />}
      </div>
    </div>
  )
}