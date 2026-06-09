'use client'
// components/tour/scenes/SceneIndicacao.tsx

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Base sizes ───────────────────────────────────────────────────────────────
const BASE_W = 900
const BASE_H = 540

// ─── Paleta ───────────────────────────────────────────────────────────────────
const WHITE  = '#f8fafc'
const MUTED  = 'rgba(248,250,252,0.50)'
const SUB    = 'rgba(248,250,252,0.25)'
const BORDER = 'rgba(255,255,255,0.07)'
const INPUTBG= 'rgba(255,255,255,0.04)'
const ROWBG  = 'rgba(255,255,255,0.02)'
const CARD   = '#162032'
const BLUE   = '#3b82f6'
const GREEN  = '#10b981'

// ─── Dados fictícios ──────────────────────────────────────────────────────────
// Mensalidades: R$49,90 (→ R$24,95/mês comissão) e R$299,90 (→ R$149,95/mês)
const INDICADOS = [
  { nome: 'Padaria do João',   data: '03/01/2025', plano: 49.90,  status: 'active',    meses: 5 },
  { nome: 'Salão da Maria',    data: '15/02/2025', plano: 299.90, status: 'active',    meses: 4 },
  { nome: 'Auto Peças Silva',  data: '02/03/2025', plano: 49.90,  status: 'active',    meses: 3 },
  { nome: 'Clínica Bem Estar', data: '20/04/2025', plano: 299.90, status: 'pending',   meses: 0 },
  { nome: 'Barbearia Top',     data: '01/05/2025', plano: 49.90,  status: 'cancelled', meses: 1 },
]

function comissao(plano: number) { return plano * 0.5 }
function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const totalGanho = INDICADOS
  .filter(i => i.status === 'active' || i.status === 'cancelled')
  .reduce((acc, i) => acc + comissao(i.plano) * i.meses, 0)

const ativos = INDICADOS.filter(i => i.status === 'active').length

// ─── Ícones ───────────────────────────────────────────────────────────────────
const IconUsers = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconTrend = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
  </svg>
)
const IconQR = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
  </svg>
)
const IconCopy = ({ done }: { done: boolean }) => done
  ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
  : <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
const IconSend = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
  </svg>
)

// ─── Componente sumário ───────────────────────────────────────────────────────
function SummaryCard({
  label, value, icon, color,
}: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue:   { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa' },
    green:  { bg: 'rgba(16,185,129,0.1)',  text: '#34d399' },
    purple: { bg: 'rgba(139,92,246,0.1)',  text: '#a78bfa' },
  }
  const c = colorMap[color]
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ padding: 6, borderRadius: 8, background: c.bg, color: c.text }}>
          {icon}
        </div>
        <span style={{ color: MUTED, fontSize: 10, fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ color: WHITE, fontWeight: 800, fontSize: 20 }}>{value}</span>
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Ativo' },
    pending:   { bg: 'rgba(234,179,8,0.12)',  color: '#fbbf24', label: 'Pendente' },
    cancelled: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', label: 'Cancelado' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SceneIndicacao() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]         = useState(1)
  const [visibleRows, setVisibleRows] = useState(0)
  const [copied, setCopied]       = useState(false)
  const [emailTyped, setEmailTyped] = useState('')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [cycle, setCycle]         = useState(0)

  // ── Escala responsiva ─────────────────────────────────────────────────────
  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: cw, height: ch } = el.getBoundingClientRect()
    const s = Math.min(1, (cw - 24) / BASE_W, (ch - 24) / BASE_H)
    setScale(s)
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // ── Loop automático ───────────────────────────────────────────────────────
  // 0s    — reset
  // 0–2s  — linhas da tabela aparecem uma a uma
  // 2.5s  — botão "Copiar Link" pisca copiado
  // 4s    — digita email
  // 5.2s  — botão enviando
  // 6.2s  — enviado
  // 8.5s  — reinicia
  const EMAIL = 'novo@cliente.com.br'
  useEffect(() => {
    setVisibleRows(0); setCopied(false)
    setEmailTyped(''); setSending(false); setSent(false)

    const ts: ReturnType<typeof setTimeout>[] = []

    // Linhas aparecem
    for (let i = 0; i < INDICADOS.length; i++) {
      ts.push(setTimeout(() => setVisibleRows(v => v + 1), 300 + i * 380))
    }

    // Copiar link
    ts.push(setTimeout(() => setCopied(true),  2600))
    ts.push(setTimeout(() => setCopied(false), 3500))

    // Digitar email letra a letra
    for (let i = 1; i <= EMAIL.length; i++) {
      ts.push(setTimeout(() => setEmailTyped(EMAIL.slice(0, i)), 3800 + i * 55))
    }

    // Enviar
    ts.push(setTimeout(() => setSending(true),  5100))
    ts.push(setTimeout(() => { setSending(false); setSent(true) }, 6100))

    // Reinicia
    ts.push(setTimeout(() => setCycle(c => c + 1), 9000))

    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg,#020617 0%,#0f172a 50%,#020617 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute',
        width: BASE_W, height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>

        {/* ── Shell da página ── */}
        <div style={{
          width: '100%', height: '100%',
          background: '#0f172a',
          borderRadius: 16,
          border: '0.5px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', flexShrink: 0,
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,42,0.8)',
          }}>
            <div>
              <div style={{ color: WHITE, fontSize: 20, fontWeight: 800 }}>Minhas Indicações</div>
              <div style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>
                Indique amigos e ganhe 50% das mensalidades deles, todos os meses no seu saldo!
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: '14px 20px', overflow: 'hidden', display: 'flex', gap: 16 }}>

            {/* Coluna esquerda — resumo + link + email */}
            <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Cards de resumo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <SummaryCard label="Indicados" value={INDICADOS.length} icon={<IconUsers />} color="blue" />
                <SummaryCard label="Ativos" value={ativos} icon={<IconTrend />} color="green" />
                <SummaryCard label="Total Ganho" value={fmt(totalGanho)} icon={<IconTrend />} color="purple" />
              </div>

              {/* Card do link */}
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: BLUE }}>
                  <IconQR />
                  <span style={{ color: WHITE, fontWeight: 700, fontSize: 12 }}>Seu Link de Indicação</span>
                </div>

                {/* Link */}
                <div style={{
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>
                    minhai.app/indica/cafeexemplo
                  </span>
                </div>

                {/* Botão copiar */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    background: copied ? GREEN : BLUE,
                    color: '#fff', fontWeight: 700, fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.3s',
                  }}>
                    <IconCopy done={copied} />
                    {copied ? 'Copiado!' : 'Copiar Link'}
                  </div>
                  <div style={{
                    width: 36, borderRadius: 10,
                    background: INPUTBG, border: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: MUTED, fontSize: 13, fontWeight: 700,
                  }}>↗</div>
                </div>

                {/* Divisor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                  <span style={{ color: SUB, fontSize: 9 }}>ou envie o convite diretamente</span>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>

                {/* Input email */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{
                    flex: 1, padding: '7px 10px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${sent ? 'rgba(16,185,129,0.4)' : BORDER}`,
                    color: emailTyped ? WHITE : MUTED, fontSize: 10,
                    fontFamily: emailTyped ? 'monospace' : 'inherit',
                    display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'border-color 0.3s',
                  }}>
                    {emailTyped || <span style={{ color: SUB }}>email@do-indicado.com</span>}
                    {emailTyped && !sent && !sending && (
                      <span style={{ opacity: 0.5, animation: 'ind-blink 1s step-end infinite' }}>|</span>
                    )}
                  </div>
                  <div style={{
                    padding: '7px 12px', borderRadius: 10,
                    background: sending ? 'rgba(59,130,246,0.5)' : sent ? GREEN : BLUE,
                    color: '#fff', fontWeight: 700, fontSize: 10,
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'background 0.3s', whiteSpace: 'nowrap',
                  }}>
                    {sending ? (
                      <div style={{
                        width: 10, height: 10,
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                        borderRadius: '50%', animation: 'ind-spin 0.7s linear infinite',
                      }} />
                    ) : sent ? (
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : <IconSend />}
                    {sending ? 'Enviando...' : sent ? 'Enviado!' : 'Enviar'}
                  </div>
                </div>

                {/* Feedback enviado */}
                {sent && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 9,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    color: '#34d399', fontSize: 10, fontWeight: 600,
                  }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    Convite enviado para {EMAIL}!
                  </div>
                )}

                {/* Código */}
                <div style={{ color: SUB, fontSize: 9 }}>
                  Código: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: MUTED }}>CAFEEXEMPLO</span>
                </div>
              </div>

            </div>

            {/* Coluna direita — tabela de indicados */}
            <div style={{
              flex: 1, minWidth: 0,
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <span style={{ color: WHITE, fontWeight: 700, fontSize: 13 }}>
                  Indicados ({INDICADOS.length})
                </span>
              </div>

              {/* Cabeçalho da tabela */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px',
                padding: '8px 18px', borderBottom: `1px solid ${BORDER}`,
                flexShrink: 0,
              }}>
                {['Nome', 'Data', 'Status', 'Comissão/mês'].map(h => (
                  <span key={h} style={{ color: MUTED, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Linhas */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {INDICADOS.slice(0, visibleRows).map((ind, i) => (
                  <div
                    key={ind.nome}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px',
                      padding: '9px 18px',
                      borderBottom: i < INDICADOS.length - 1 ? `1px solid ${BORDER}` : 'none',
                      background: i % 2 === 0 ? 'transparent' : ROWBG,
                      animation: 'ind-fadein 0.3s ease',
                    }}
                  >
                    {/* Nome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: ind.status === 'active' ? 'rgba(16,185,129,0.15)' : INPUTBG,
                        color: ind.status === 'active' ? '#34d399' : MUTED,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800,
                      }}>
                        {ind.nome.charAt(0)}
                      </div>
                      <span style={{ color: ind.status === 'cancelled' ? MUTED : WHITE, fontSize: 11, fontWeight: 500 }}>
                        {ind.nome}
                      </span>
                    </div>
                    {/* Data */}
                    <span style={{ color: MUTED, fontSize: 10, display: 'flex', alignItems: 'center' }}>
                      {ind.data}
                    </span>
                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusBadge status={ind.status} />
                    </div>
                    {/* Comissão */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        color: ind.status === 'active' ? '#34d399' : ind.status === 'pending' ? '#fbbf24' : MUTED,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {ind.status === 'active'
                          ? fmt(comissao(ind.plano)) + '/mês'
                          : ind.status === 'pending' ? 'Pendente' : '—'}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Estado vazio */}
                {visibleRows === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg width="32" height="32" fill="none" stroke={BORDER} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <span style={{ color: MUTED, fontSize: 11 }}>Nenhuma indicação ainda.</span>
                  </div>
                )}
              </div>

              {/* Rodapé — total */}
              {visibleRows >= INDICADOS.length && (
                <div style={{
                  padding: '10px 18px', flexShrink: 0,
                  borderTop: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(16,185,129,0.04)',
                  animation: 'ind-fadein 0.4s ease',
                }}>
                  <span style={{ color: MUTED, fontSize: 10 }}>
                    {ativos} ativo{ativos !== 1 ? 's' : ''} · 50% de comissão recorrente
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: SUB, fontSize: 9 }}>Total ganho  </span>
                    <span style={{ color: '#34d399', fontWeight: 800, fontSize: 13 }}>
                      {fmt(totalGanho)}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>{/* /body */}
        </div>{/* /shell */}
      </div>

      <style>{`
        @keyframes ind-spin    { to { transform: rotate(360deg); } }
        @keyframes ind-blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ind-fadein  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
