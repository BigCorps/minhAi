'use client'
// components/tour/scenes/SceneFiscal.tsx
// Mock fiel ao EmitirNotaModal — tour visual com todas as etapas animadas

import { useEffect, useState, useRef } from 'react'

// ─── Constantes de timing ─────────────────────────────────────────────────────
const STEP_DURATIONS = {
  form:       1800,  // seleção de tipo
  form_nfe:   2800,  // chat + preenchimento
  confirming: 1600,  // confirmação
  emitting:    900,  // transmitindo
  success:    2000,  // sucesso
}

type Stage = 'form' | 'form_nfe' | 'confirming' | 'emitting' | 'success'

// ─── Dados do mock ────────────────────────────────────────────────────────────
const CHAT_MSGS = [
  { from: 'user', text: 'Nota para João Silva, CNPJ 12.345.678/0001-90, Café Especial 2kg, R$89,90' },
  { from: 'bot',  text: 'Perfeito! Vou preencher os dados fiscais automaticamente...' },
  { from: 'bot',  text: 'NCM, CFOP e CSOSN identificados. Formulário pronto!' },
]

const DEST_FIELDS = [
  { label: 'Nome', value: 'João Silva' },
  { label: 'CNPJ', value: '12.345.678/0001-90' },
  { label: 'E-mail', value: 'joao@empresa.com' },
]

const ITEM_FIELDS = [
  { label: 'Produto', value: 'Café Especial' },
  { label: 'Qtd / Valor', value: '2 kg · R$ 89,90' },
  { label: 'NCM', value: '0901.21.00', fiscal: true },
  { label: 'CFOP', value: '5.102', fiscal: true },
  { label: 'CSOSN', value: '102', fiscal: true },
]

// ─── Paleta fiel ao modal ─────────────────────────────────────────────────────
const C = {
  bg:        '#0f172a',   // slate-900
  surface:   '#1e293b',   // slate-800
  border:    '#334155',   // slate-700
  text:      '#f1f5f9',   // white-ish
  muted:     '#94a3b8',   // gray-400
  blue:      '#3b82f6',   // blue-500
  blueHover: '#2563eb',
  green:     '#22c55e',
  amber:     '#f59e0b',
  headerBg:  'rgba(30,58,138,0.25)', // blue-950/30
}

// ─── SVG Icons (fiel aos usados no modal) ────────────────────────────────────
const Icons = {
  Receipt: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  CheckCircle2: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  MessageSquare: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  ClipboardList: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="16" y2="16"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="8" y1="16" x2="8.01" y2="16"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Mic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Volume: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
}

// ─── Componente de Typing indicator ──────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '6px 10px' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: C.muted,
            animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Subcomponentes de cada stage ─────────────────────────────────────────────

function StageForm({ progress }: { progress: number }) {
  const selected = progress > 0.3
  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div style={{ marginBottom: 4 }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: '0.6rem', marginBottom: 2 }}>Tipo de nota</p>
        <p style={{ color: C.muted, fontSize: '0.5rem' }}>Escolha o modelo que deseja emitir</p>
      </div>

      {/* NFC-e */}
      <div style={{
        padding: '8px 10px', borderRadius: 10,
        border: `1.5px solid ${!selected ? C.blue : C.border}`,
        background: !selected ? 'rgba(59,130,246,0.1)' : C.surface,
        transition: 'all 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: '0.55rem' }}>NFC-e (Cupom Fiscal)</p>
          <p style={{ color: C.muted, fontSize: '0.46rem' }}>Modelo 65 — Ideal para vendas no balcão</p>
        </div>
        {!selected && (
          <div style={{ width: 13, height: 13, color: C.blue }}>
            <Icons.CheckCircle2 />
          </div>
        )}
      </div>

      {/* NF-e */}
      <div style={{
        padding: '8px 10px', borderRadius: 10,
        border: `1.5px solid ${selected ? C.blue : C.border}`,
        background: selected ? 'rgba(59,130,246,0.1)' : C.surface,
        transition: 'all 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: '0.55rem' }}>NF-e (Nota Fiscal Eletrônica)</p>
          <p style={{ color: C.muted, fontSize: '0.46rem' }}>Modelo 55 — Com assistente IA</p>
        </div>
        {selected && (
          <div style={{ width: 13, height: 13, color: C.blue }}>
            <Icons.CheckCircle2 />
          </div>
        )}
      </div>

      {/* Botão */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
        <div style={{
          flex: 1, padding: '7px 0', borderRadius: 8,
          background: C.surface, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: C.muted, fontSize: '0.5rem', fontWeight: 600 }}>Cancelar</span>
        </div>
        <div style={{
          flex: 2, padding: '7px 0', borderRadius: 8,
          background: selected ? C.blue : 'rgba(59,130,246,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          transition: 'background 0.4s ease',
        }}>
          <span style={{ color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>Continuar</span>
          <div style={{ width: 10, height: 10, color: 'white' }}><Icons.ArrowRight /></div>
        </div>
      </div>
    </div>
  )
}

function StageFormNfe({ progress }: { progress: number }) {
  const chatVisible = Math.floor(progress * (CHAT_MSGS.length + 1))
  const showTyping  = chatVisible < CHAT_MSGS.length && progress > 0.08
  const formProgress = progress > 0.45 ? (progress - 0.45) / 0.55 : 0
  const fieldsVisible = Math.floor(formProgress * (DEST_FIELDS.length + ITEM_FIELDS.length + 1))

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Coluna esquerda — Chat */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`,
        padding: '8px 10px', gap: 6, overflow: 'hidden',
      }}>
        {/* Tip */}
        <div style={{
          padding: '4px 8px', borderRadius: 6,
          background: 'rgba(59,130,246,0.08)',
          border: `1px solid rgba(59,130,246,0.15)`,
        }}>
          <span style={{ color: 'rgba(147,197,253,0.8)', fontSize: '0.42rem', lineHeight: 1.4 }}>
            💡 O assistente preenche o formulário automaticamente
          </span>
        </div>

        {/* Msgs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 5 }}>
          {CHAT_MSGS.slice(0, chatVisible).map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.from === 'bot' && (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: C.blue, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginRight: 4, flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontSize: '0.38rem', fontWeight: 800 }}>IA</span>
                </div>
              )}
              <div style={{
                padding: '5px 8px', borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                background: msg.from === 'user' ? C.blue : 'rgba(255,255,255,0.07)',
                color: C.text, fontSize: '0.46rem', lineHeight: 1.45,
                maxWidth: '82%',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {showTyping && chatVisible <= CHAT_MSGS.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: C.blue,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: 'white', fontSize: '0.38rem', fontWeight: 800 }}>IA</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px 10px 10px 2px' }}>
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '4px 8px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
          color: C.muted, fontSize: '0.44rem',
        }}>
          Diga os dados da nota...
        </div>
      </div>

      {/* Coluna direita — Formulário */}
      <div style={{
        width: '48%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          {[
            { label: 'Assistente IA', Icon: Icons.MessageSquare },
            { label: 'Preencher', Icon: Icons.ClipboardList },
          ].map((tab, i) => (
            <div key={i} style={{
              flex: 1, padding: '5px 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              borderBottom: `2px solid ${i === 1 ? C.blue : 'transparent'}`,
              color: i === 1 ? C.blue : C.muted,
              fontSize: '0.44rem', fontWeight: 600,
            }}>
              <div style={{ width: 9, height: 9 }}><tab.Icon /></div>
              {tab.label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Destinatário */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, color: C.muted }}><Icons.User /></div>
              <span style={{ color: C.muted, fontSize: '0.42rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destinatário</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {DEST_FIELDS.map((f, i) => {
                const visible = fieldsVisible > i
                return (
                  <div key={f.label} style={{
                    opacity: visible ? 1 : 0.15,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <div style={{ color: C.muted, fontSize: '0.38rem', marginBottom: 1 }}>{f.label}</div>
                    <div style={{
                      padding: '3px 7px', borderRadius: 6,
                      border: `1px solid ${visible ? C.blue : C.border}`,
                      background: visible ? 'rgba(59,130,246,0.08)' : C.surface,
                      color: visible ? C.text : C.muted,
                      fontSize: '0.46rem', transition: 'all 0.3s ease',
                    }}>
                      {visible ? f.value : '···'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divisor */}
          <div style={{ borderTop: `1px solid ${C.border}` }} />

          {/* Itens */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, color: C.muted }}><Icons.Package /></div>
              <span style={{ color: C.muted, fontSize: '0.42rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Itens</span>
            </div>
            <div style={{
              borderRadius: 8, border: `1px solid ${C.border}`,
              background: 'rgba(255,255,255,0.03)', padding: '6px 8px',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              {ITEM_FIELDS.map((f, i) => {
                const visible = fieldsVisible > DEST_FIELDS.length + i
                return (
                  <div key={f.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: visible ? 1 : 0.15, transition: 'opacity 0.3s ease',
                  }}>
                    <span style={{ color: C.muted, fontSize: '0.4rem' }}>{f.label}</span>
                    <span style={{
                      fontSize: '0.44rem', fontWeight: 600,
                      color: visible
                        ? (f.fiscal ? C.amber : C.text)
                        : C.muted,
                      transition: 'color 0.3s ease',
                    }}>
                      {visible ? f.value : '···'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer botão */}
        <div style={{
          padding: '6px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0,
          display: 'flex', gap: 5,
        }}>
          <div style={{
            padding: '5px 8px', borderRadius: 7,
            background: C.surface, border: `1px solid ${C.border}`,
          }}>
            <span style={{ color: C.muted, fontSize: '0.46rem', fontWeight: 600 }}>Voltar</span>
          </div>
          <div style={{
            flex: 1, padding: '5px 0', borderRadius: 7,
            background: fieldsVisible >= DEST_FIELDS.length + ITEM_FIELDS.length ? C.blue : 'rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 0.4s ease',
          }}>
            <div style={{ width: 9, height: 9, color: 'white' }}><Icons.CheckCircle2 /></div>
            <span style={{ color: 'white', fontSize: '0.46rem', fontWeight: 700 }}>Emitir NF-e</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StageConfirming({ progress }: { progress: number }) {
  const confirmed = progress > 0.7

  const rows = [
    { label: 'Tipo', value: 'NF-e (Nota Fiscal Eletrônica)' },
    { label: 'Destinatário', value: 'João Silva' },
    { label: 'CNPJ', value: '12.345.678/0001-90' },
    { label: 'Itens', value: '1 item' },
    { label: 'Total', value: 'R$ 89,90' },
    { label: 'Pagamento', value: 'PIX' },
  ]

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {/* Painel resumo */}
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <p style={{ color: C.text, fontWeight: 700, fontSize: '0.52rem', marginBottom: 2 }}>Confirme os dados:</p>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', gap: 4, fontSize: '0.46rem' }}>
            <span style={{ color: C.muted }}>{r.label}:</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Dica de voz */}
      <div style={{
        padding: '6px 10px', borderRadius: 8,
        background: 'rgba(30,58,138,0.3)', border: '1px solid rgba(59,130,246,0.25)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 12, height: 12, color: 'rgba(147,197,253,0.9)', flexShrink: 0 }}><Icons.Mic /></div>
        <p style={{ color: 'rgba(191,219,254,0.9)', fontSize: '0.46rem', lineHeight: 1.4 }}>
          Diga <strong style={{ color: 'white' }}>"CONFIRMAR"</strong> para emitir ou <strong style={{ color: 'white' }}>"CANCELAR"</strong> para fechar
        </p>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <div style={{
          flex: 1, padding: '7px 0', borderRadius: 8,
          background: C.surface, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: C.muted, fontSize: '0.5rem', fontWeight: 600 }}>Voltar</span>
        </div>
        <div style={{
          flex: 2, padding: '7px 0', borderRadius: 8,
          background: confirmed ? '#1d4ed8' : C.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transform: confirmed ? 'scale(0.97)' : 'scale(1)',
          transition: 'all 0.3s ease',
          boxShadow: confirmed ? '0 0 0 3px rgba(59,130,246,0.35)' : 'none',
        }}>
          <div style={{ width: 11, height: 11, color: 'white' }}><Icons.Receipt /></div>
          <span style={{ color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>Confirmar Emissão</span>
        </div>
      </div>
    </div>
  )
}

function StageEmitting() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: 10, padding: '16px',
    }}>
      <div style={{ width: 44, height: 44, color: C.blue }}>
        <Icons.Loader />
      </div>
      <p style={{ color: C.text, fontWeight: 700, fontSize: '0.62rem' }}>Transmitindo para a SEFAZ...</p>
      <p style={{ color: C.muted, fontSize: '0.5rem' }}>Aguarde, isso pode levar alguns segundos</p>
      {/* Progress bar */}
      <div style={{
        width: '70%', height: 3, borderRadius: 2,
        background: 'rgba(59,130,246,0.2)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: C.blue,
          animation: 'progressBar 0.9s ease-in-out forwards',
        }} />
      </div>
    </div>
  )
}

function StageSuccess() {
  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      {/* Ícone sucesso */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 6 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: C.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px rgba(34,197,94,0.4)`,
          animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          <div style={{ width: 24, height: 24, color: 'white' }}><Icons.Check /></div>
        </div>
        <p style={{ color: C.text, fontWeight: 800, fontSize: '0.7rem' }}>Nota Fiscal Emitida!</p>
      </div>

      {/* Dados */}
      <div style={{
        padding: '8px 10px', borderRadius: 10,
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', gap: 4,
        fontSize: '0.46rem',
      }}>
        {[
          { label: 'Número', value: '000.482' },
          { label: 'Chave', value: '35250612345678000190550010004...' },
          { label: 'Protocolo', value: '135230000123456' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', gap: 4 }}>
            <span style={{ color: C.muted }}>{r.label}:</span>
            <span style={{ color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Botão download DANFE */}
      <div style={{
        padding: '7px 0', borderRadius: 8,
        background: C.blue,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        <div style={{ width: 12, height: 12, color: 'white' }}><Icons.Download /></div>
        <span style={{ color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>Baixar DANFE</span>
      </div>

      {/* Concluir */}
      <div style={{
        padding: '7px 0', borderRadius: 8,
        background: '#16a34a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'white', fontSize: '0.5rem', fontWeight: 700 }}>Concluir</span>
      </div>
    </div>
  )
}

// ─── Stage label ──────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<Stage, string> = {
  form:       'Tipo de Nota',
  form_nfe:   'Assistente IA + Formulário',
  confirming: 'Confirmação',
  emitting:   'Transmissão SEFAZ',
  success:    'Emitida com Sucesso',
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneFiscal() {
  const STAGES: Stage[] = ['form', 'form_nfe', 'confirming', 'emitting', 'success']

  const [stageIdx, setStageIdx]     = useState(0)
  const [progress, setProgress]     = useState(0)
  const [fadeIn, setFadeIn]         = useState(true)
  const animRef                     = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef                    = useRef(0)

  const currentStage = STAGES[stageIdx]
  const duration     = STEP_DURATIONS[currentStage]

  useEffect(() => {
    setProgress(0)
    setFadeIn(false)
    const fadeTimer = setTimeout(() => setFadeIn(true), 80)

    const tick = 50 // ms
    const steps = duration / tick

    animRef.current && clearInterval(animRef.current)
    animRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + 1 / steps
        if (next >= 1) {
          clearInterval(animRef.current!)
          setTimeout(() => {
            setStageIdx(i => (i + 1) % STAGES.length)
          }, 200)
          return 1
        }
        return next
      })
    }, tick)

    return () => {
      clearInterval(animRef.current!)
      clearTimeout(fadeTimer)
    }
  }, [stageIdx])

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-4px); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes popIn {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
        style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* ── Header — réplica fiel do modal ── */}
        <div style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${C.border}`,
          background: C.headerBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Ícone circular azul */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 14, height: 14, color: 'white' }}><Icons.Receipt /></div>
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 800, fontSize: '0.6rem', lineHeight: 1 }}>Emitir Nota Fiscal</p>
              <p style={{ color: C.muted, fontSize: '0.44rem', marginTop: 2 }}>Cafeteria Bom Grão</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Passo atual — badge */}
            <span style={{
              padding: '2px 7px', borderRadius: 20,
              background: 'rgba(59,130,246,0.15)', border: `1px solid rgba(59,130,246,0.3)`,
              color: 'rgba(147,197,253,0.9)', fontSize: '0.4rem', fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              {STAGE_LABELS[currentStage]}
            </span>
            {/* Volume icon */}
            <div style={{ width: 18, height: 18, padding: 3, borderRadius: '50%', color: C.muted }}>
              <Icons.Volume />
            </div>
            {/* X */}
            <div style={{ width: 18, height: 18, padding: 3, borderRadius: '50%', color: C.muted }}>
              <Icons.X />
            </div>
          </div>
        </div>

        {/* ── Progress bar do stage ── */}
        <div style={{ height: 2, background: C.surface, flexShrink: 0 }}>
          <div style={{
            height: '100%', background: C.blue,
            width: `${progress * 100}%`,
            transition: 'width 0.05s linear',
          }} />
        </div>

        {/* ── Stepper visual (5 etapas) ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '4px 12px', gap: 0, flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
        }}>
          {STAGES.map((s, i) => {
            const done    = i < stageIdx
            const current = i === stageIdx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'none' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: done ? C.green : current ? C.blue : C.surface,
                  border: `1.5px solid ${done ? C.green : current ? C.blue : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}>
                  {done && <div style={{ width: 8, height: 8, color: 'white' }}><Icons.CheckCircle2 /></div>}
                  {current && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{
                    flex: 1, height: 1.5, marginLeft: 2, marginRight: 2,
                    background: done ? C.green : C.border,
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Conteúdo do stage ── */}
        <div
          key={stageIdx}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {currentStage === 'form'      && <StageForm progress={progress} />}
          {currentStage === 'form_nfe'  && <StageFormNfe progress={progress} />}
          {currentStage === 'confirming'&& <StageConfirming progress={progress} />}
          {currentStage === 'emitting'  && <StageEmitting />}
          {currentStage === 'success'   && <StageSuccess />}
        </div>
      </div>
    </>
  )
}
