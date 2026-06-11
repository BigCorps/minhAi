'use client'
// components/tour/scenes/SceneRecebimentos.tsx
// Seção de Recebimentos — transações chegando em tempo real
// Padrão visual idêntico ao SceneDashboardPerfil

import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Ícones ────────────────────────────────────────────────────────────────
const IcoMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const IcoSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)
const IcoArrowDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M12 5v14" /><path d="M5 12l7 7 7-7" />
  </svg>
)

// ─── Dados ────────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  { label: 'PIX',           color: '#32bcad', bg: 'rgba(50,188,173,0.15)',  valor: 89.90,  isSaldo: true,  hora: '14:32', },
  { label: 'TEF Crédito',color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', valor: 149.70, isSaldo: false, hora: '14:29', },
  { label: 'PIX',           color: '#32bcad', bg: 'rgba(50,188,173,0.15)',  valor: 57.50,  isSaldo: true,  hora: '14:17', },
  { label: 'NFC Débito',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', valor: 32.00,  isSaldo: false, hora: '13:59', },
  { label: 'PIX',           color: '#32bcad', bg: 'rgba(50,188,173,0.15)',  valor: 110.90, isSaldo: true,  hora: '11:37', },
  { label: 'TEF Débito',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', valor: 74.00,  isSaldo: false, hora: '11:22', },
]

const SALDO_INICIAL   = 201.90
const TOTAL_INICIAL   = 15484.45
const SACADO_TOTAL    = 15103.55
const DELAY_FIRST     = 700
const DELAY_NEXT      = 1000
const DELAY_RESET     = 3500

const BASE_W = 520
const BASE_H = 400

function fmt(v: number) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function SceneRecebimentos() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const [visibleTx, setVisibleTx]     = useState<typeof TRANSACTIONS>([])
  const [saldo, setSaldo]             = useState(SALDO_INICIAL)
  const [totalRecebido, setTotal]     = useState(TOTAL_INICIAL)
  const [flashSaldo, setFlashSaldo]   = useState(false)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const add = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t); return t }
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  // ── Escala responsiva (mesma lógica do SceneDashboardPerfil) ──────────
  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    setScale(Math.min(1, (w - 16) / BASE_W, (h - 16) / BASE_H))
  }, [])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // ── Loop de transações ────────────────────────────────────────────────
  useEffect(() => {
    let idx = 0

    function addNext() {
      if (idx >= TRANSACTIONS.length) {
        add(setTimeout(() => {
          clearAll()
          idx = 0
          setVisibleTx([])
          setSaldo(SALDO_INICIAL)
          setTotal(TOTAL_INICIAL)
          add(setTimeout(addNext, 600))
        }, DELAY_RESET))
        return
      }

      const tx = TRANSACTIONS[idx]

      if (tx.isSaldo) {
        setSaldo(v => parseFloat((v + tx.valor).toFixed(2)))
        setTotal(v => parseFloat((v + tx.valor).toFixed(2)))
        setFlashSaldo(true)
        add(setTimeout(() => setFlashSaldo(false), 600))
      }

      setVisibleTx(prev => [tx, ...prev])
      idx++
      add(setTimeout(addNext, idx === 1 ? DELAY_FIRST : DELAY_NEXT))
    }

    add(setTimeout(addNext, DELAY_FIRST))
    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        width: BASE_W,
        height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: '#0f172a',
          borderRadius: 16,
          overflow: 'hidden',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}>

          {/* ══ HEADER — idêntico ao SceneDashboardPerfil ══ */}
          <div style={{
            height: 46, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            background: '#0f172a',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          }}>
            {/* Left: hamburguer + logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.85)',
                flexShrink: 0,
              }}>
                <div style={{ width: 14, height: 14 }}><IcoMenu /></div>
              </div>
              <Image
                src="/logo.png"
                alt="minhAi"
                width={60}
                height={20}
                loading="eager"
                style={{ height: 20, width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* Right: assistant selector + theme + avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 11,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Café
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.55)' }}><IcoSun /></div>
              </div>

              {/* Avatar + nome */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 6px 3px 3px', borderRadius: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#de691b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '60%', height: '60%' }}>
                    <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
                    <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
                    <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
                    <path d="M3 21h18" />
                  </svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>Café Exemplo</span>
              </div>
            </div>
          </div>

          {/* ══ BODY ══ */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

            {/* Título + badge live */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>Recebimentos</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 3 }}>
                    Gerencie seus recebimentos e solicite saque imediato
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#34d399',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <span style={{ color: '#34d399', fontSize: 8.5, fontWeight: 600 }}>Atualizando</span>
                </div>
              </div>
            </div>

            {/* Cards de saldo — 4 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 }}>
              {[
                {
                  label: 'Saldo Disponível',
                  value: fmt(saldo),
                  sub: 'Apenas via PIX',
                  color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)',
                  flash: flashSaldo,
                },
                {
                  label: 'Total Recebido',
                  value: fmt(totalRecebido),
                  sub: 'Todos os métodos',
                  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)',
                  flash: false,
                },
                {
                  label: 'Total Sacado',
                  value: fmt(SACADO_TOTAL),
                  sub: 'Todo o período',
                  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)',
                  flash: false,
                },
                {
                  label: 'Comissões (Vendas)',
                  value: 'R$ 0,00',
                  sub: 'Comissões pendentes',
                  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)',
                  flash: false,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: s.bg,
                    border: `0.5px solid ${s.border}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    boxShadow: s.flash ? `0 0 14px ${s.color}40` : 'none',
                    transition: 'box-shadow 300ms ease',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8.5, fontWeight: 600 }}>{s.label}</div>
                  <div
                    style={{
                      color: s.color,
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      marginTop: 3,
                      transition: 'transform 200ms ease',
                      transform: s.flash ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabela de transações */}
            <div style={{
              flex: 1,
              background: 'rgba(30,41,59,0.5)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Cabeçalho da tabela */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 58px 1fr 80px 82px',
                padding: '8px 14px',
                borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}>
                {['DATA', 'TIPO', 'ASSISTENTE', 'VALOR', 'STATUS'].map(h => (
                  <div key={h} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.5px' }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {visibleTx.map((tx, i) => (
                  <div
                    key={`${tx.hora}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 58px 1fr 80px 82px',
                      padding: '7px 14px',
                      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                      alignItems: 'center',
                      animation: i === 0 ? 'slideIn 300ms ease' : 'none',
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>10/06 {tx.hora}</div>
                    <div>
                      <span style={{
                        background: tx.bg, color: tx.color,
                        fontSize: 8, fontWeight: 700,
                        borderRadius: 4, padding: '2px 6px',
                      }}>
                        {tx.label}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Café Exemplo</div>
                    <div style={{
                      color: tx.isSaldo ? '#10b981' : '#fff',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {fmt(tx.valor)}
                    </div>
                    <div>
                      <span style={{
                        background: tx.isSaldo ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
                        color: tx.isSaldo ? '#34d399' : 'rgba(255,255,255,0.45)',
                        fontSize: 7.5, fontWeight: 700,
                        borderRadius: 4, padding: '2px 6px',
                      }}>
                        {tx.isSaldo ? '+ Saldo' : 'Histórico'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Saque */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '8px 14px',
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
              }}>
                <button style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 9.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <div style={{ width: 10, height: 10 }}><IcoArrowDown /></div>
                  Sacar Saldo
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
