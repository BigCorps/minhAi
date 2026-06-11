'use client'
// components/tour/scenes/SceneCobrancaRecebimentos.tsx
// Transações chegando → PIX confirma → saldo sobe em tempo real

import { useEffect, useState } from 'react'

const BG = '#f8fafc'

const TRANSACTIONS = [
  { tipo: 'PIX',  valor: 89.90,  status: 'confirmed', label: 'PIX',            color: '#32bcad', saldoAdd: 89.90 },
  { tipo: 'TEF',  valor: 149.70, status: 'confirmed', label: 'TEF Crédito 3×', color: '#3b82f6', saldoAdd: 0 },
  { tipo: 'PIX',  valor: 57.50,  status: 'confirmed', label: 'PIX',            color: '#32bcad', saldoAdd: 57.50 },
  { tipo: 'NFC',  valor: 32.00,  status: 'confirmed', label: 'NFC Débito',     color: '#8b5cf6', saldoAdd: 0 },
  { tipo: 'PIX',  valor: 110.90, status: 'confirmed', label: 'PIX',            color: '#32bcad', saldoAdd: 110.90 },
]

export default function SceneCobrancaRecebimentos() {
  const [visibleTx, setVisibleTx] = useState(0)
  const [saldo, setSaldo] = useState(201.90)
  const [flashSaldo, setFlashSaldo] = useState(false)

  useEffect(() => {
    if (visibleTx >= TRANSACTIONS.length) return
    const delay = visibleTx === 0 ? 600 : 900
    const t = setTimeout(() => {
      const tx = TRANSACTIONS[visibleTx]
      if (tx.saldoAdd > 0) {
        setSaldo(v => parseFloat((v + tx.saldoAdd).toFixed(2)))
        setFlashSaldo(true)
        setTimeout(() => setFlashSaldo(false), 600)
      }
      setVisibleTx(v => v + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [visibleTx])

  const totalRecebido = (visibleTx > 0 ? TRANSACTIONS.slice(0, visibleTx).reduce((a, tx) => a + tx.valor, 0) : 0)

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <p className="text-slate-800 font-bold" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
          Recebimentos
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-600 font-semibold" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
            Atualizando
          </span>
        </div>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-2 pb-1 flex-shrink-0">
        {[
          {
            label: 'Saldo Disponível',
            value: `R$ ${saldo.toFixed(2).replace('.', ',')}`,
            color: '#10b981',
            bg: 'rgba(16,185,129,0.08)',
            border: 'rgba(16,185,129,0.2)',
            flash: flashSaldo,
            note: 'Apenas PIX',
          },
          {
            label: 'Total Recebido',
            value: `R$ ${(15484.45 + totalRecebido).toFixed(2).replace('.', ',')}`,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.08)',
            border: 'rgba(59,130,246,0.15)',
            flash: false,
            note: 'Todos os métodos',
          },
          {
            label: 'Total Sacado',
            value: 'R$ 15.103,55',
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.08)',
            border: 'rgba(139,92,246,0.15)',
            flash: false,
            note: 'Via PIX',
          },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-xl p-2"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: s.flash ? `0 0 12px ${s.color}40` : 'none',
              transition: 'box-shadow 300ms ease',
            }}
          >
            <p className="text-gray-500 font-medium" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{s.label}</p>
            <p
              className="font-bold"
              style={{
                fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
                color: s.color,
                transition: 'transform 200ms ease',
                transform: s.flash ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {s.value}
            </p>
            <p style={{ fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', color: '#94a3b8' }}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Tabela de transações */}
      <div className="flex-1 overflow-hidden flex flex-col mx-3 mb-2 rounded-xl" style={{ border: '1px solid #e2e8f0', background: 'white' }}>
        {/* Cabeçalho */}
        <div className="grid px-3 py-1.5 flex-shrink-0" style={{ gridTemplateColumns: '80px 1fr 70px 70px', borderBottom: '1px solid #f1f5f9' }}>
          {['DATA', 'TIPO', 'VALOR', 'STATUS'].map(h => (
            <div key={h} style={{ color: '#94a3b8', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700, letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col overflow-hidden">
          {TRANSACTIONS.slice(0, visibleTx).map((tx, i) => (
            <div
              key={i}
              className="grid px-3 py-1.5 items-center"
              style={{
                gridTemplateColumns: '80px 1fr 70px 70px',
                borderBottom: '1px solid #f8fafc',
                animation: 'slideIn 300ms ease',
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>
                10/06 {14 - i}:{String(32 - i * 3).padStart(2,'0')}
              </div>
              <div>
                <span
                  className="rounded-full px-1.5 py-0.5 font-bold"
                  style={{
                    background: `${tx.color}15`,
                    color: tx.color,
                    fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)',
                    border: `1px solid ${tx.color}25`,
                  }}
                >
                  {tx.label}
                </span>
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)',
                  color: '#1e293b',
                }}
              >
                R$ {tx.valor.toFixed(2).replace('.', ',')}
              </div>
              <div>
                <span
                  className="rounded-full px-1.5 py-0.5 font-bold"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  {tx.saldoAdd > 0 ? '+ Saldo' : 'Histórico'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  )
}
