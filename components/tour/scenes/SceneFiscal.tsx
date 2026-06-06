'use client'
// components/tour/scenes/SceneFiscal.tsx
// Auxiliar Fiscal: conversa → preenchimento automático → emissão

import { useEffect, useState } from 'react'

const CHAT = [
  { from: 'user', text: 'Emitir nota para João Silva, CNPJ 12.345.678/0001-90, produto Café Especial, 2 kg, R$ 89,90' },
  { from: 'bot',  text: 'Preenchendo NCM, CFOP e CSOSN automaticamente...' },
]

const FIELDS = [
  { label: 'Destinatário', value: 'João Silva' },
  { label: 'CNPJ', value: '12.345.678/0001-90' },
  { label: 'Produto', value: 'Café Especial — 2 kg' },
  { label: 'Valor', value: 'R$ 89,90' },
  { label: 'NCM', value: '0901.21.00' },
  { label: 'CFOP', value: '5.102' },
  { label: 'CSOSN', value: '102 — Tributado' },
]

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

export default function SceneFiscal() {
  const [chatCount, setChatCount] = useState(0)
  const [fieldCount, setFieldCount] = useState(0)
  const [emitido, setEmitido] = useState(false)

  // Avança mensagens do chat
  useEffect(() => {
    if (chatCount >= CHAT.length) return
    const t = setTimeout(() => setChatCount(v => v + 1), chatCount === 0 ? 500 : 1200)
    return () => clearTimeout(t)
  }, [chatCount])

  // Após chat, começa a preencher campos
  useEffect(() => {
    if (chatCount < CHAT.length) return
    if (fieldCount >= FIELDS.length) return
    const t = setTimeout(() => setFieldCount(v => v + 1), 300)
    return () => clearTimeout(t)
  }, [chatCount, fieldCount])

  // Após campos, emite
  useEffect(() => {
    if (fieldCount < FIELDS.length) return
    const t = setTimeout(() => setEmitido(true), 800)
    return () => clearTimeout(t)
  }, [fieldCount])

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
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: '#f59e0b' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>
            Auxiliar Fiscal
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-semibold"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}
        >
          NFe · NFSe · NFCe
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-2 px-3 py-2 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col justify-end gap-1.5 overflow-hidden" style={{ flex: 1 }}>
          {CHAT.slice(0, chatCount).map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-xl px-2.5 py-1.5 max-w-[90%]"
                style={{
                  fontSize: 'clamp(0.46rem, 1vw, 0.58rem)',
                  background: msg.from === 'user' ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  lineHeight: 1.4,
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Painel de campos */}
        {chatCount >= CHAT.length && (
          <div
            className="flex flex-col gap-1 rounded-xl p-2 flex-shrink-0"
            style={{ width: '48%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p
              className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0"
              style={{ fontSize: 'clamp(0.35rem, 0.8vw, 0.45rem)' }}
            >
              Preenchendo automaticamente
            </p>

            <div className="flex flex-col gap-1 flex-1 overflow-hidden">
              {FIELDS.slice(0, fieldCount).map((f, i) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-1"
                  style={{
                    opacity: 1,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}>{f.label}</span>
                  <span
                    className="font-semibold text-right truncate"
                    style={{
                      color: i >= 4 ? '#f59e0b' : 'rgba(255,255,255,0.8)',
                      fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)',
                    }}
                  >
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Status emissão */}
            {emitido && (
              <div
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 flex-shrink-0"
                style={{
                  background: 'rgba(132,204,22,0.12)',
                  border: '1px solid rgba(132,204,22,0.35)',
                  opacity: emitido ? 1 : 0,
                  transition: 'opacity 400ms ease',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ color: '#84cc16', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)' }}>
                  Nota emitida na SEFAZ
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.42rem, 1vw, 0.54rem)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Diga os dados da nota...
          </div>
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: '#f59e0b' }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}