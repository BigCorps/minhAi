'use client'
// components/tour/scenes/SceneDashboardFuncoes.tsx
// Mock animado da página Funções — grid de cards, modal de configuração, modal de execução

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Ícones SVG inline ─────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IcoSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IcoPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)
const IcoBot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M12 11V6" /><circle cx="12" cy="4" r="2" />
    <path d="M8 15h.01M16 15h.01" />
  </svg>
)
const IcoSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
  </svg>
)
const IcoGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
)
const IcoList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface FuncaoItem {
  key: string
  name: string
  category: string
  catColor: string
  desc: string
  credits: number
  badges: Array<'IA' | 'Meta' | 'Premium' | 'Sparkles'>
  enabled: boolean
  hasPlay: boolean
  hasSettings: boolean
}

// ─── Dados das funções (fiel à screenshot) ─────────────────────────────────
const FUNCOES_INICIAL: FuncaoItem[] = [
  {
    key: 'nossa_marca',
    name: 'Como Funciono?',
    category: 'INFORMAÇÃO',
    catColor: '#00FFF7',
    desc: 'Mostra informações sobre como funciona a plataforma.',
    credits: 0,
    badges: ['IA', 'Meta'],
    enabled: true,
    hasPlay: true,
    hasSettings: false,
  },
  {
    key: 'faq',
    name: 'Respostas Rápidas',
    category: 'CONHECIMENTO',
    catColor: '#0000ff',
    desc: 'Comandos e execuções para as Perguntas mais realizadas.',
    credits: 1,
    badges: ['IA', 'Meta'],
    enabled: true,
    hasPlay: false,
    hasSettings: true,
  },
  {
    key: 'emitir_nota',
    name: 'Emitir Nota Fiscal',
    category: 'UTILITÁRIOS',
    catColor: '#FFA500',
    desc: 'Emita Nota Fiscal de Serviço (NFS-e), Cupom Fiscal (NFC-e) ou NF-e.',
    credits: 3,
    badges: ['Sparkles', 'Premium'],
    enabled: false,
    hasPlay: true,
    hasSettings: true,
  },
  {
    key: 'pix_generate',
    name: 'Gerar PIX',
    category: 'FINANCEIRO',
    catColor: '#F44336',
    desc: 'Cobrar, confirmar e cancelar recebimentos via PIX.',
    credits: 0,
    badges: ['IA', 'Meta'],
    enabled: true,
    hasPlay: true,
    hasSettings: true,
  },
  {
    key: 'identificar_fraude',
    name: 'Identificar Fraude',
    category: 'CÂMERA',
    catColor: '#808080',
    desc: 'Analisa imagens, boletos (PDF) e links para detectar fraudes, phishing e golpes.',
    credits: 2,
    badges: ['Sparkles', 'Meta'],
    enabled: true,
    hasPlay: true,
    hasSettings: false,
  },
  {
    key: 'agendar_compromisso',
    name: 'Marcar Evento',
    category: 'AGENDAMENTO',
    catColor: '#FFC0CB',
    desc: 'Marcar eventos, consultas e horários no calendário.',
    credits: 3,
    badges: ['Sparkles', 'Meta', 'Premium'],
    enabled: false,
    hasPlay: true,
    hasSettings: true,
  },
]

const CATEGORIA_PILLS = ['Todas as Funções', 'Conhecimento', 'Comercial', 'Financeiro', 'Câmera', 'Agendamento']
const CAT_COLORS: Record<string, string> = {
  'Conhecimento': '#0000ff',
  'Comercial': '#FF00FF',
  'Financeiro': '#F44336',
  'Câmera': '#808080',
  'Agendamento': '#FFC0CB',
}

type AnimPhase =
  | 'idle'
  | 'opening-config'
  | 'config-open'
  | 'typing-config'
  | 'saving-config'
  | 'closing-config'
  | 'toggling'
  | 'opening-play'
  | 'play-open'
  | 'closing-play'

const BASE_W = 520
const BASE_H = 420

// ─── Badge component ────────────────────────────────────────────────────────
function Badge({ type }: { type: 'IA' | 'Meta' | 'Premium' | 'Sparkles' }) {
  const styles: Record<string, { bg: string; color: string }> = {
    IA:       { bg: 'rgba(59,130,246,0.2)',  color: '#93c5fd' },
    Meta:     { bg: 'rgba(34,197,94,0.2)',   color: '#86efac' },
    Premium:  { bg: 'rgba(245,158,11,0.2)',  color: '#fcd34d' },
    Sparkles: { bg: 'rgba(168,85,247,0.2)',  color: '#d8b4fe' },
  }
  const s = styles[type]
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 600, padding: '2px 5px', borderRadius: 20,
      background: s.bg, color: s.color,
      display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
    }}>
      {type === 'Sparkles' ? (
        <span style={{ width: 9, height: 9, display: 'inline-flex' }}><IcoSparkles /></span>
      ) : type}
    </span>
  )
}

// ─── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ on, animating }: { on: boolean; animating?: boolean }) {
  return (
    <div style={{
      width: 32, height: 18, borderRadius: 9,
      background: on ? '#3b82f6' : 'rgba(255,255,255,0.15)',
      position: 'relative', flexShrink: 0,
      transition: 'background 300ms ease',
      outline: animating ? '2px solid rgba(59,130,246,0.5)' : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 2,
        left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        transition: 'left 300ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

// ─── FunctionCard ───────────────────────────────────────────────────────────
function FunctionCard({
  fn,
  highlightSettings,
  highlightPlay,
  highlightToggle,
}: {
  fn: FuncaoItem
  highlightSettings?: boolean
  highlightPlay?: boolean
  highlightToggle?: boolean
}) {
  return (
    <div style={{
      background: fn.enabled ? '#0f172a' : 'rgba(15,23,42,0.5)',
      border: `0.5px solid ${fn.enabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 14, padding: '10px 11px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: 100,
      transition: 'all 300ms ease',
    }}>
      {/* Top row: category dot + name + badges */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: fn.catColor, flexShrink: 0 }} />
            <span style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {fn.category}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {fn.badges.map(b => <Badge key={b} type={b} />)}
          </div>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: fn.enabled ? '#fff' : 'rgba(255,255,255,0.5)', margin: '0 0 3px', lineHeight: 1.2 }}>
          {fn.name}
        </p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {fn.desc}
        </p>
      </div>

      {/* Bottom row: credits + actions + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 7, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {fn.credits > 0 && (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} style={{ width: 10, height: 10 }}>
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                {fn.credits} crédito{fn.credits > 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {fn.hasPlay && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: highlightPlay ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4ade80',
              outline: highlightPlay ? '1.5px solid #4ade80' : 'none',
              transition: 'all 200ms ease',
            }}>
              <div style={{ width: 10, height: 10 }}><IcoPlay /></div>
            </div>
          )}
          {fn.hasSettings && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: highlightSettings ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: highlightSettings ? '#fff' : 'rgba(255,255,255,0.4)',
              outline: highlightSettings ? '1.5px solid rgba(255,255,255,0.4)' : 'none',
              transition: 'all 200ms ease',
            }}>
              <div style={{ width: 10, height: 10 }}><IcoSettings /></div>
            </div>
          )}
          <Toggle on={fn.enabled} animating={highlightToggle} />
        </div>
      </div>
    </div>
  )
}

// ─── ConfigModal (fiel ao FunctionConfigModal real) ─────────────────────────
function ConfigModal({
  fn,
  typedText,
  saving,
  saved,
}: {
  fn: FuncaoItem
  typedText: string
  saving: boolean
  saved: boolean
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f172a',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        width: 280, maxHeight: 340,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header do modal */}
        <div style={{
          padding: '12px 14px 10px',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: fn.catColor }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{fn.name}</span>
            </div>
            <div style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <IcoX />
            </div>
          </div>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
            {fn.desc}
          </p>
        </div>

        {/* Conteúdo do formulário */}
        <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
          {fn.key === 'pix_generate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: 'rgba(59,130,246,0.08)',
                border: '0.5px solid rgba(59,130,246,0.25)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                <p style={{ fontSize: 9, color: '#93c5fd', fontWeight: 600, margin: '0 0 4px' }}>Como funciona o PIX</p>
                <ul style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.55)', margin: 0, paddingLeft: 12, lineHeight: 1.7 }}>
                  <li>Diga "Gerar PIX de 50 reais" para criar um QR Code</li>
                  <li>Confirme recebimento com "Confirmar PIX"</li>
                  <li>Cancele com "Cancelar PIX"</li>
                </ul>
              </div>
              <div>
                <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Chave PIX para Recebimento
                </label>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `0.5px solid ${typedText ? 'rgba(84,204,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 7, padding: '7px 10px',
                  color: 'rgba(255,255,255,0.85)', fontSize: 10,
                  minHeight: 32, display: 'flex', alignItems: 'center',
                  transition: 'border-color 300ms',
                  fontFamily: 'monospace',
                }}>
                  {typedText || (
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>cafe@exemplo.com.br</span>
                  )}
                  {typedText && (
                    <span style={{
                      display: 'inline-block', width: 1, height: 12,
                      background: 'rgba(255,255,255,0.7)', marginLeft: 1,
                      animation: 'fn-blink 0.8s step-end infinite',
                    }} />
                  )}
                </div>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>
                  Esta chave será usada para receber pagamentos via PIX.
                </p>
              </div>
              <div style={{
                background: 'rgba(34,197,94,0.08)',
                border: '0.5px solid rgba(34,197,94,0.2)',
                borderRadius: 8, padding: '6px 10px',
              }}>
                <p style={{ fontSize: 8.5, color: '#86efac', margin: 0 }}>
                  Os valores recebidos aparecem em <strong>Recebimentos</strong> no menu.
                </p>
              </div>
            </div>
          )}

          {fn.key === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: 'rgba(34,197,94,0.08)',
                border: '0.5px solid rgba(34,197,94,0.2)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                <p style={{ fontSize: 9, color: '#86efac', fontWeight: 600, margin: '0 0 4px' }}>Vantagens das Respostas Rápidas</p>
                <ul style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.55)', margin: 0, paddingLeft: 12, lineHeight: 1.7 }}>
                  <li>Gastam metade dos créditos do ChatGPT</li>
                  <li>Respostas instantâneas e consistentes</li>
                  <li>Ideal para perguntas frequentes</li>
                </ul>
              </div>
              <div>
                <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  Pergunta frequente
                </label>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `0.5px solid ${typedText ? 'rgba(84,204,31,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 7, padding: '7px 10px',
                  color: 'rgba(255,255,255,0.85)', fontSize: 10,
                  minHeight: 32, display: 'flex', alignItems: 'center',
                  transition: 'border-color 300ms',
                }}>
                  {typedText || (
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>Qual o horário de funcionamento?</span>
                  )}
                  {typedText && (
                    <span style={{
                      display: 'inline-block', width: 1, height: 12,
                      background: 'rgba(255,255,255,0.7)', marginLeft: 1,
                      animation: 'fn-blink 0.8s step-end infinite',
                    }} />
                  )}
                </div>
              </div>
              <a style={{
                display: 'inline-block', padding: '6px 12px',
                background: '#2563eb', color: '#fff',
                fontSize: 9.5, fontWeight: 600, borderRadius: 7, textDecoration: 'none',
              }}>
                Gerenciar FAQs
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
          }}>
            Cancelar
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: saved ? '#16a34a' : saving ? 'rgba(59,130,246,0.5)' : '#2563eb',
            color: '#fff',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 300ms',
          }}>
            {saved ? (
              <>
                <div style={{ width: 10, height: 10 }}><IcoCheck /></div>
                Salvo!
              </>
            ) : saving ? (
              <>
                <div style={{
                  width: 10, height: 10, border: '1.5px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'fn-spin 0.7s linear infinite',
                }} />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PlayModal (execução de função — PIX) ──────────────────────────────────
function PlayModal({ fn }: { fn: FuncaoItem }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#0f172a',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        width: 280,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '9px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(29,78,216,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" style={{ width: 13, height: 13 }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Gerar PIX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 8, fontWeight: 600, padding: '2px 6px', borderRadius: 20,
              background: 'rgba(59,130,246,0.2)', color: '#93c5fd',
            }}>
              Café Exemplo
            </span>
            <div style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.35)' }}><IcoX /></div>
          </div>
        </div>

        {/* Body: QR + info */}
        <div style={{ display: 'flex', padding: '10px 12px', gap: 10 }}>
          {/* QR */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 7, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/qrcode.png" alt="QR PIX" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          {/* Info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <div style={{ padding: '5px 8px', background: 'rgba(29,78,216,0.18)', borderRadius: 7 }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Valor a pagar</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.02em', lineHeight: 1.1 }}>R$ 89,90</div>
            </div>
            {[
              { l: 'Empresa', v: 'Café Exemplo' },
              { l: 'Banco', v: 'Banco Inter' },
              { l: 'Validade', v: 'Válido 30 min', hi: true },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{r.l}</span>
                <span style={{ fontSize: 9.5, color: (r as any).hi ? '#fbbf24' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chave PIX */}
        <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '4px 7px',
            fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            00020126580014br.gov.bcb.pix0136cafe@exemplo.com…
          </div>
          <div style={{
            width: 20, height: 20, borderRadius: 4, background: '#2563eb', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 11, height: 11 }}><IcoCopy /></div>
          </div>
        </div>

        {/* Botões confirmar/cancelar */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
          <div style={{
            flex: 1, background: '#16a34a', borderRadius: 8, padding: '7px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontSize: 9.5, fontWeight: 700, color: '#fff',
          }}>
            <div style={{ width: 10, height: 10 }}><IcoCheck /></div>
            Confirmar
          </div>
          <div style={{
            flex: 1, background: '#dc2626', borderRadius: 8, padding: '7px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontSize: 9.5, fontWeight: 700, color: '#fff',
          }}>
            <div style={{ width: 10, height: 10 }}><IcoX /></div>
            Cancelar
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
export default function SceneDashboardFuncoes() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const [funcoes, setFuncoes] = useState<FuncaoItem[]>(FUNCOES_INICIAL)
  const [phase, setPhase] = useState<AnimPhase>('idle')
  const [activeCatPill, setActiveCatPill] = useState(0)
  const [configFnKey, setConfigFnKey] = useState<string | null>(null)
  const [playFnKey, setPlayFnKey] = useState<string | null>(null)
  const [typedText, setTypedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [highlightSettingsKey, setHighlightSettingsKey] = useState<string | null>(null)
  const [highlightPlayKey, setHighlightPlayKey] = useState<string | null>(null)
  const [highlightToggleKey, setHighlightToggleKey] = useState<string | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const add = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t); return t }
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }

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

  // ── Loop de animação ──────────────────────────────────────────────────────
  useEffect(() => {
    clearAll()

    if (phase === 'idle') {
      // Após 1.2s: highlight settings do PIX → abre modal de config
      add(setTimeout(() => {
        setHighlightSettingsKey('pix_generate')
        add(setTimeout(() => {
          setHighlightSettingsKey(null)
          setConfigFnKey('pix_generate')
          setPhase('config-open')
          setTypedText('')
          setSaving(false)
          setSaved(false)
        }, 500))
      }, 1200))
      return
    }

    if (phase === 'config-open') {
      // Digita a chave PIX
      const TARGET = 'cafe@exemplo.com.br'
      let i = 0
      const type = () => {
        if (i > TARGET.length) {
          add(setTimeout(() => {
            setSaving(true)
            add(setTimeout(() => {
              setSaving(false)
              setSaved(true)
              add(setTimeout(() => {
                setConfigFnKey(null)
                setSaved(false)
                setTypedText('')
                setPhase('toggling')
              }, 600))
            }, 900))
          }, 400))
          return
        }
        setTypedText(TARGET.slice(0, i++))
        add(setTimeout(type, 65))
      }
      add(setTimeout(type, 700))
      return
    }

    if (phase === 'toggling') {
      // Ativa toggle da Nota Fiscal (estava desativada)
      add(setTimeout(() => {
        setHighlightToggleKey('emitir_nota')
        add(setTimeout(() => {
          setFuncoes(prev => prev.map(f => f.key === 'emitir_nota' ? { ...f, enabled: true } : f))
          add(setTimeout(() => {
            setHighlightToggleKey(null)
            // Ativa também Marcar Evento
            add(setTimeout(() => {
              setHighlightToggleKey('agendar_compromisso')
              add(setTimeout(() => {
                setFuncoes(prev => prev.map(f => f.key === 'agendar_compromisso' ? { ...f, enabled: true } : f))
                add(setTimeout(() => {
                  setHighlightToggleKey(null)
                  setPhase('opening-play')
                }, 400))
              }, 300))
            }, 600))
          }, 300))
        }, 500))
      }, 600))
      return
    }

    if (phase === 'opening-play') {
      // Highlight play do PIX → abre modal de execução
      add(setTimeout(() => {
        setHighlightPlayKey('pix_generate')
        add(setTimeout(() => {
          setHighlightPlayKey(null)
          setPlayFnKey('pix_generate')
          setPhase('play-open')
        }, 500))
      }, 800))
      return
    }

    if (phase === 'play-open') {
      // Fecha após 3s e reseta
      add(setTimeout(() => {
        setPlayFnKey(null)
        // Reseta toggles para o estado original antes de reiniciar
        add(setTimeout(() => {
          setFuncoes(FUNCOES_INICIAL)
          setActiveCatPill(0)
          setPhase('idle')
        }, 400))
      }, 3000))
      return
    }

    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const configFn = funcoes.find(f => f.key === configFnKey) ?? null
  const playFn   = funcoes.find(f => f.key === playFnKey) ?? null

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
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>

        {/* ══ HEADER DA PÁGINA ════════════════════════════════════════════ */}
        <div style={{
          padding: '12px 16px 8px',
          flexShrink: 0,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Funções do Assistente</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Defina as funções que seu assistente Café Exemplo pode executar
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Botão Auxiliar de Funções */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 8,
                border: '0.5px solid rgba(59,130,246,0.4)',
                color: '#60a5fa', fontSize: 9.5, fontWeight: 600, cursor: 'pointer',
              }}>
                <div style={{ width: 12, height: 12 }}><IcoBot /></div>
                Auxiliar de Funções
              </div>
              {/* Settings */}
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}>
                <div style={{ width: 13, height: 13 }}><IcoSettings /></div>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {/* Search */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '5px 9px',
            }}>
              <div style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}><IcoSearch /></div>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)' }}>Buscar por nome...</span>
            </div>
            {/* Status pills */}
            {['Todos os Status', 'Ativas', 'Inativas'].map((s, i) => (
              <div key={s} style={{
                padding: '4px 9px', borderRadius: 20, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                background: i === 0 ? '#e2e8f0' : 'transparent',
                color: i === 0 ? '#0f172a' : 'rgba(255,255,255,0.5)',
                border: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
              }}>
                {s}
              </div>
            ))}
            {/* Grid/List toggle */}
            <div style={{
              display: 'flex', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7,
              background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexShrink: 0,
            }}>
              {[{ Ico: IcoGrid, active: true }, { Ico: IcoList, active: false }].map(({ Ico, active }, i) => (
                <div key={i} style={{
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? '#2563eb' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                  <div style={{ width: 13, height: 13 }}><Ico /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {CATEGORIA_PILLS.map((cat, i) => {
              const active = i === activeCatPill
              const color = CAT_COLORS[cat]
              return (
                <div
                  key={cat}
                  style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 8.5, fontWeight: 600, cursor: 'pointer',
                    background: active ? (color || '#e2e8f0') : 'transparent',
                    color: active ? (i === 0 ? '#0f172a' : '#fff') : 'rgba(255,255,255,0.5)',
                    border: active ? 'none' : '0.5px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 200ms ease',
                  }}
                >
                  {color && !active && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  )}
                  {active && color && i > 0 && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                  )}
                  {cat}
                </div>
              )
            })}
          </div>
        </div>

        {/* ══ GRID DE CARDS ═══════════════════════════════════════════════ */}
        <div style={{
          flex: 1, padding: '10px 12px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          overflow: 'hidden', alignContent: 'start',
        }}>
          {funcoes.map(fn => (
            <FunctionCard
              key={fn.key}
              fn={fn}
              highlightSettings={highlightSettingsKey === fn.key}
              highlightPlay={highlightPlayKey === fn.key}
              highlightToggle={highlightToggleKey === fn.key}
            />
          ))}
        </div>

        {/* ══ MODAL DE CONFIGURAÇÃO ════════════════════════════════════════ */}
        {configFn && (
          <ConfigModal
            fn={configFn}
            typedText={typedText}
            saving={saving}
            saved={saved}
          />
        )}

        {/* ══ MODAL DE EXECUÇÃO ════════════════════════════════════════════ */}
        {playFn && <PlayModal fn={playFn} />}
      </div>

      <style>{`
        @keyframes fn-blink { 50% { opacity: 0; } }
        @keyframes fn-spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}