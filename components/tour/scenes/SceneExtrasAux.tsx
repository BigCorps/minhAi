'use client'
// components/tour/scenes/SceneExtrasAux.tsx
// Três auxiliares: Antifraude + Auxiliar de Funções + Cadastro de Produto
// Mock fiel às UIs reais — mesma paleta, layout, ícones e animações

import { useEffect, useState, useRef } from 'react'

// ─── Paleta fiel aos modais ────────────────────────────────────────────────────
const C = {
  bg:       '#0f172a',
  surface:  '#1e293b',
  border:   '#334155',
  text:     '#f1f5f9',
  muted:    '#94a3b8',
  faint:    '#475569',
  blue:     '#3b82f6',
  green:    '#10b981',
  indigo:   '#6366f1',
  amber:    '#f59e0b',
  red:      '#ef4444',
  redLight: '#f87171',
  headerBg: 'rgba(15,23,42,0.85)',
}

type Panel = 'antifraude' | 'funcoes' | 'cadastro'
const SEQUENCE: Panel[]     = ['antifraude', 'funcoes', 'cadastro']
const PANEL_DURATION        = 5000 // ms por painel

// ─── Dados Antifraude (fiel ao IdentificarFraudeDisplay) ──────────────────────
const RISCO_ITEMS = [
  { label: 'Linha digitável',  status: 'ok',   text: 'Banco real — Itaú S.A.',       score: 0  },
  { label: 'Beneficiário',     status: 'ok',   text: 'CNPJ 12.345.678/0001-90 ✓',   score: 5  },
  { label: 'Valor do boleto',  status: 'warn', text: 'R$ 0,00 — suspeito',            score: 55 },
  { label: 'Código de barras', status: 'err',  text: 'Inconsistente com linha',        score: 88 },
]

// ─── Dados Funções (fiel ao FuncoesChat) ─────────────────────────────────────
const CHAT_FUNCOES = [
  { from: 'user', text: 'Ative o PIX e o Cardápio Digital pra mim' },
  { from: 'bot',  text: 'Ativando as funções de Pagamento PIX e Cardápio Digital...' },
  { from: 'bot',  text: '✅ Pronto! 2 funções ativadas. 14 funções ativas no total.' },
]
const FUNCOES_CATEGORIAS = [
  { cat: 'Financeiro',  items: [{ key: 'pix', nome: 'Pagamento PIX', ativo: true,  novo: true }, { key: 'boleto', nome: 'Boleto Bancário', ativo: false, novo: false }] },
  { cat: 'Comercial',   items: [{ key: 'cardapio', nome: 'Cardápio Digital', ativo: true, novo: true }, { key: 'estoque', nome: 'Gestão de Estoque', ativo: true, novo: false }] },
  { cat: 'Utilitários', items: [{ key: 'nfe', nome: 'Emitir NF-e', ativo: true, novo: false }, { key: 'relatorio', nome: 'Relatórios IA', ativo: false, novo: false }] },
]

// ─── Dados Cadastro (fiel ao CadastrarProdutoDisplay) ─────────────────────────
const CHAT_CADASTRO = [
  { from: 'user', text: 'Café Especial 250g, grãos selecionados torra média, R$32,90, categoria Cafés' },
  { from: 'bot',  text: 'Entendido! Preenchendo nome, descrição, categoria e preço...' },
  { from: 'bot',  text: '🖼️ Buscando imagem recomendada e gerando NCM automaticamente.' },
]
const PRODUTO_FIELDS = [
  { label: 'Nome',      value: 'Café Especial 250g',                         accent: false },
  { label: 'Categoria', value: 'Cafés',                                        accent: false },
  { label: 'Descrição', value: 'Grãos selecionados, torra média, caramelo',  accent: false },
  { label: 'Preço',     value: 'R$ 32,90',                                    accent: false },
  { label: 'NCM',       value: '0901.21.00',                                  accent: true  },
  { label: 'Imagem',    value: '✓ Recomendação gerada pela IA',              accent: true  },
]

// ─── SVG Icons inline ────────────────────────────────────────────────────────
const Ico = {
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  Warning: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="6 9 12 15 18 9"/>
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
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Volume: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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

// ─── Painel Antifraude ────────────────────────────────────────────────────────
function PanelAntifraude({ progress }: { progress: number }) {
  const itemsVisible = Math.floor(progress * (RISCO_ITEMS.length + 1.2))
  const finalScore   = 88
  const currentScore = progress > 0.85 ? finalScore : Math.floor(progress * finalScore * 1.2)
  const showLaudo    = itemsVisible >= RISCO_ITEMS.length

  const statusColor = (s: string) =>
    s === 'ok' ? C.green : s === 'warn' ? C.amber : C.red

  const statusIcon = (s: string) => {
    if (s === 'ok')   return <div style={{ width: 9, height: 9, color: C.green }}><Ico.Check /></div>
    if (s === 'warn') return <div style={{ width: 9, height: 9, color: C.amber }}><Ico.Warning /></div>
    return <div style={{ width: 9, height: 9, color: C.red }}><Ico.X /></div>
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Coluna esquerda — Input/Upload (fiel ao IdentificarFraudeDisplay) */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 12px',
        borderRight: `1px solid ${C.border}`, gap: 8,
      }}>
        {/* Toggle tabs Imagem / Link */}
        <div style={{
          display: 'flex', gap: 3, padding: 3,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10,
        }}>
          {['Imagem / Boleto', 'Link / URL'].map((label, i) => (
            <div key={label} style={{
              flex: 1, padding: '5px 4px', borderRadius: 7, textAlign: 'center',
              background: i === 0 ? C.indigo : 'transparent',
              color: i === 0 ? 'white' : C.muted,
              fontSize: '0.44rem', fontWeight: 600,
            }}>{label}</div>
          ))}
        </div>

        {/* Área de upload */}
        <div style={{
          flex: 1, borderRadius: 10,
          border: `2px dashed ${C.border}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ width: 20, height: 20, color: C.muted }}><Ico.Image /></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: C.text, fontSize: '0.48rem', fontWeight: 600, margin: 0 }}>Envie o boleto</p>
            <p style={{ color: C.muted, fontSize: '0.42rem', margin: '2px 0 0' }}>Foto, PDF ou linha digitável</p>
          </div>
          {/* Simulação de boleto enviado */}
          {progress > 0.08 && (
            <div style={{
              padding: '3px 8px', borderRadius: 20,
              background: 'rgba(99,102,241,0.15)', border: `1px solid rgba(99,102,241,0.3)`,
              color: 'rgba(165,180,252,0.9)', fontSize: '0.4rem', fontWeight: 700,
            }}>
              📎 boleto_itau.pdf enviado
            </div>
          )}
        </div>

        {/* Hint de voz */}
        <div style={{
          padding: '4px 8px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{ width: 10, height: 10, color: C.muted, flexShrink: 0 }}><Ico.Mic /></div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['"imagem"', '"link"', '"fechar"'].map(cmd => (
              <span key={cmd} style={{
                padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace',
                background: 'rgba(255,255,255,0.07)', color: C.muted, fontSize: '0.4rem',
              }}>{cmd}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Coluna direita — Resultado da análise */}
      <div style={{
        width: '52%', display: 'flex', flexDirection: 'column',
        padding: '10px 12px', gap: 6, overflow: 'hidden',
      }}>
        <p style={{
          color: C.muted, fontSize: '0.42rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
        }}>Análise de boleto</p>

        {/* Itens de risco */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
          {RISCO_ITEMS.slice(0, itemsVisible).map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: 8,
              background: `${statusColor(item.status)}10`,
              border: `1px solid ${statusColor(item.status)}28`,
              gap: 4,
            }}>
              <span style={{ color: C.muted, fontSize: '0.42rem', flexShrink: 0 }}>{item.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: statusColor(item.status), fontSize: '0.42rem', fontWeight: 600, textAlign: 'right' }}>
                  {item.text}
                </span>
                {statusIcon(item.status)}
              </div>
            </div>
          ))}

          {/* Score bar */}
          {itemsVisible >= 2 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: C.muted, fontSize: '0.4rem' }}>Score de risco</span>
                <span style={{ color: C.red, fontSize: '0.4rem', fontWeight: 700 }}>{Math.min(currentScore, 88)}/100</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  background: currentScore > 60 ? C.red : currentScore > 30 ? C.amber : C.green,
                  width: `${Math.min(currentScore, 88)}%`,
                  transition: 'width 0.1s linear',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Laudo final */}
        {showLaudo && (
          <div style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>🚨 FRAUDE — Alto Risco</span>
            <span style={{ color: C.red, fontSize: '0.46rem', fontWeight: 800 }}>Não pague!</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Painel Funções ───────────────────────────────────────────────────────────
function PanelFuncoes({ progress }: { progress: number }) {
  const chatVisible  = Math.floor(progress * (CHAT_FUNCOES.length + 0.5))
  const showTyping   = progress > 0.05 && chatVisible < CHAT_FUNCOES.length
  // Após chat completo, mostrar funções ativadas
  const showFuncoes  = progress > 0.55
  const novosAtivos  = progress > 0.65

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Coluna esquerda — Chat (fiel ao FuncoesChat) */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
        {/* Mensagens */}
        <div style={{
          flex: 1, padding: '10px 12px', display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', gap: 6, overflow: 'hidden',
        }}>
          {CHAT_FUNCOES.slice(0, chatVisible).map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 5 }}>
              {msg.from === 'bot' && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: C.indigo, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <div style={{ width: 8, height: 8, color: 'white' }}><Ico.Zap /></div>
                </div>
              )}
              <div style={{
                padding: '5px 9px', borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                background: msg.from === 'user' ? C.blue : C.surface,
                color: C.text, fontSize: '0.46rem', lineHeight: 1.45, maxWidth: '80%',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {showTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: C.indigo,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: 8, height: 8, color: 'white' }}><Ico.Zap /></div>
              </div>
              <div style={{ background: C.surface, borderRadius: '10px 10px 10px 2px' }}>
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Input bar (fiel ao FuncoesChat) */}
        <div style={{
          padding: '8px 12px', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ width: 12, height: 12, color: 'white' }}><Ico.Mic /></div>
          </div>
          <div style={{
            flex: 1, padding: '5px 10px', borderRadius: 20,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.muted, fontSize: '0.44rem',
          }}>
            Ex: "ative o PIX", "desative cardápio"...
          </div>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ width: 11, height: 11, color: 'white' }}><Ico.Send /></div>
          </div>
        </div>
      </div>

      {/* Coluna direita — Painel de funções (fiel ao FuncoesChat) */}
      <div style={{
        width: '46%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header do painel */}
        <div style={{
          padding: '8px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: C.text, fontSize: '0.48rem', fontWeight: 700 }}>Funções disponíveis</span>
            {/* Badge contador fiel ao FuncoesChat */}
            <span style={{
              padding: '2px 6px', borderRadius: 20,
              background: `${C.green}18`, border: `1px solid ${C.green}44`,
              color: C.green, fontSize: '0.4rem', fontWeight: 700,
            }}>
              {novosAtivos ? '14 ativas' : '12 ativas'}
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: '0.4rem', margin: '2px 0 0' }}>
            Clique ou peça ao assistente
          </p>
        </div>

        {/* Lista de categorias colapsáveis */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FUNCOES_CATEGORIAS.map((cat, ci) => (
            <div key={cat.cat}>
              {/* Header da categoria */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
                cursor: 'pointer',
              }}>
                <div style={{ width: 9, height: 9, color: C.muted }}><Ico.ChevronDown /></div>
                <span style={{ color: C.muted, fontSize: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {cat.cat} ({cat.items.length})
                </span>
              </div>
              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8 }}>
                {cat.items.map((fn) => {
                  const isNovo  = fn.novo && novosAtivos && showFuncoes
                  const isAtivo = fn.ativo
                  return (
                    <div key={fn.key} style={{
                      padding: '5px 7px', borderRadius: 6,
                      border: `1px solid ${isAtivo ? C.blue : C.border}`,
                      background: isAtivo ? `${C.blue}12` : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.3s ease',
                      boxShadow: isNovo ? `0 0 0 2px ${C.blue}40` : 'none',
                    }}>
                      <div style={{ width: 11, height: 11, color: isAtivo ? C.blue : C.muted, flexShrink: 0 }}>
                        {isAtivo ? <Ico.CheckCircle /> : <Ico.Circle />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.44rem', fontWeight: 600, color: C.text }}>{fn.nome}</div>
                      </div>
                      {isNovo && (
                        <span style={{
                          marginLeft: 'auto', padding: '1px 5px', borderRadius: 20,
                          background: `${C.blue}20`, color: C.blue,
                          fontSize: '0.36rem', fontWeight: 700,
                        }}>NOVO</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Botão salvar (aparece quando há alterações) */}
        {novosAtivos && (
          <div style={{
            padding: '6px 10px', borderTop: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <div style={{
              width: '100%', padding: '6px 0', borderRadius: 7,
              background: C.indigo,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ color: 'white', fontSize: '0.46rem', fontWeight: 700 }}>💾 Salvar Alterações</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Painel Cadastro ──────────────────────────────────────────────────────────
function PanelCadastro({ progress }: { progress: number }) {
  const chatVisible   = Math.floor(progress * (CHAT_CADASTRO.length + 0.6))
  const showTyping    = progress > 0.06 && chatVisible < CHAT_CADASTRO.length
  const formProgress  = progress > 0.4 ? (progress - 0.4) / 0.6 : 0
  const fieldsVisible = Math.floor(formProgress * (PRODUTO_FIELDS.length + 1))
  const showSalvar    = fieldsVisible >= PRODUTO_FIELDS.length

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* Coluna esquerda — Chat (fiel ao CadastrarProdutoDisplay) */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`, overflow: 'hidden',
        background: C.bg,
      }}>
        {/* Tip */}
        <div style={{
          padding: '5px 10px', borderBottom: `1px solid ${C.border}`,
          background: 'rgba(59,130,246,0.06)', flexShrink: 0,
        }}>
          <span style={{ color: 'rgba(147,197,253,0.85)', fontSize: '0.42rem' }}>
            💡 Descreva o produto por voz ou texto — preenche tudo sozinho
          </span>
        </div>

        {/* Mensagens */}
        <div style={{
          flex: 1, padding: '10px 12px', display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', gap: 6, overflow: 'hidden',
        }}>
          {CHAT_CADASTRO.slice(0, chatVisible).map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 5 }}>
              {msg.from === 'bot' && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: C.green, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <div style={{ width: 8, height: 8, color: 'white' }}><Ico.Package /></div>
                </div>
              )}
              <div style={{
                padding: '5px 9px',
                borderRadius: msg.from === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                background: msg.from === 'user' ? C.blue : C.surface,
                color: C.text, fontSize: '0.46rem', lineHeight: 1.45, maxWidth: '82%',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {showTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: C.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: 8, height: 8, color: 'white' }}><Ico.Package /></div>
              </div>
              <div style={{ background: C.surface, borderRadius: '10px 10px 10px 2px' }}>
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Input bar (fiel ao CadastrarProdutoDisplay — textarea + mic + send) */}
        <div style={{
          padding: '8px 12px', borderTop: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0,
        }}>
          {/* Botões upload */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['CSV / Excel / PDF', 'Importar CSV'].map(label => (
              <div key={label} style={{
                padding: '3px 7px', borderRadius: 6, border: `1px solid ${C.border}`,
                color: C.muted, fontSize: '0.38rem', fontWeight: 600,
              }}>{label}</div>
            ))}
          </div>
          {/* Textarea + botões */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
            <div style={{
              flex: 1, padding: '5px 9px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bg,
              color: C.muted, fontSize: '0.44rem', lineHeight: 1.4,
            }}>
              Ex: Pizza margherita 35cm por R$45...
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, color: C.muted }}><Ico.Mic /></div>
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 11, height: 11, color: 'white' }}><Ico.Send /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna direita — Painel de produto (fiel ao PainelProduto) */}
      <div style={{
        width: '46%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header com preview de imagem */}
        <div style={{
          padding: '8px 10px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          {/* Placeholder imagem */}
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: fieldsVisible >= PRODUTO_FIELDS.length
              ? `${C.green}15`
              : C.surface,
            border: `1px solid ${fieldsVisible >= PRODUTO_FIELDS.length ? C.green : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.4s ease',
          }}>
            {fieldsVisible >= PRODUTO_FIELDS.length
              ? <div style={{ width: 16, height: 16, color: C.green }}><Ico.Check /></div>
              : <div style={{ width: 14, height: 14, color: C.muted }}><Ico.Image /></div>
            }
          </div>
          <div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: '0.5rem', margin: 0 }}>
              {fieldsVisible >= 1 ? 'Café Especial 250g' : 'Novo Produto'}
            </p>
            <p style={{ color: C.muted, fontSize: '0.4rem', margin: '2px 0 0' }}>
              {fieldsVisible >= 2 ? 'Cafés · R$ 32,90' : 'Preencha pelo chat'}
            </p>
          </div>
        </div>

        {/* Campos preenchidos progressivamente */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PRODUTO_FIELDS.map((f, i) => {
            const visible = fieldsVisible > i
            return (
              <div key={f.label} style={{
                opacity: visible ? 1 : 0.18,
                transition: 'opacity 0.35s ease',
              }}>
                <div style={{ color: C.muted, fontSize: '0.38rem', marginBottom: 2 }}>{f.label}</div>
                <div style={{
                  padding: '4px 8px', borderRadius: 6,
                  border: `1px solid ${visible ? (f.accent ? C.green : C.blue) : C.border}`,
                  background: visible
                    ? f.accent ? `${C.green}10` : `${C.blue}08`
                    : C.surface,
                  color: visible
                    ? f.accent ? C.green : C.text
                    : C.muted,
                  fontSize: '0.44rem', fontWeight: visible ? 600 : 400,
                  transition: 'all 0.35s ease',
                }}>
                  {visible ? f.value : '···'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer — botão salvar (fiel ao CadastrarProdutoDisplay) */}
        <div style={{
          padding: '8px 10px', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{
            padding: '5px 8px', borderRadius: 7,
            border: `1px solid ${C.border}`, background: 'none',
          }}>
            <span style={{ color: C.muted, fontSize: '0.44rem', fontWeight: 600 }}>Cancelar</span>
          </div>
          {showSalvar && (
            <span style={{ color: C.muted, fontSize: '0.4rem', marginLeft: 'auto' }}>1 produto pronto</span>
          )}
          <div style={{
            flex: showSalvar ? 'none' : 1, marginLeft: showSalvar ? 0 : 'auto',
            padding: '5px 10px', borderRadius: 7,
            background: showSalvar ? C.green : C.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.4s ease',
          }}>
            <span style={{ color: 'white', fontSize: '0.44rem', fontWeight: 700 }}>
              {showSalvar ? '✅ Cadastrar Produto' : 'Cadastrar Produtos'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Configuração dos painéis ─────────────────────────────────────────────────
const PANEL_CONFIG: Record<Panel, {
  label: string;
  icon: keyof typeof Ico;
  accent: string;
  headerLabel: string;
}> = {
  antifraude: { label: 'Antifraude',       icon: 'Shield',  accent: C.indigo, headerLabel: 'Investigador Antifraude' },
  funcoes:    { label: 'Funções',           icon: 'Zap',     accent: C.indigo, headerLabel: 'Auxiliar de Funções'     },
  cadastro:   { label: 'Cadastro',          icon: 'Package', accent: C.green,  headerLabel: 'Auxiliar de Cadastro'   },
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneExtrasAux() {
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
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
        style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* ── Header fiel ao padrão dos modais ── */}
        <div style={{
          padding: '8px 12px', borderBottom: `1px solid ${C.border}`,
          background: C.headerBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: cfg.accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, transition: 'background 0.4s ease',
            }}>
              <div style={{ width: 13, height: 13, color: 'white' }}><IconComp /></div>
            </div>
            <div>
              <p style={{ color: C.text, fontWeight: 800, fontSize: '0.58rem', lineHeight: 1, margin: 0 }}>
                {cfg.headerLabel}
              </p>
              <p style={{ color: C.muted, fontSize: '0.42rem', margin: '2px 0 0' }}>Cafeteria Bom Grão</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2 }}>
            {SEQUENCE.map((p, i) => {
              const pcfg = PANEL_CONFIG[p]
              const active = p === currentPanel
              const PIco = Ico[pcfg.icon]
              return (
                <button
                  key={p}
                  onClick={() => { setPanelIdx(i); }}
                  style={{
                    padding: '3px 7px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: active ? `${pcfg.accent}22` : 'rgba(255,255,255,0.04)',
                    color: active ? pcfg.accent : C.muted,
                    fontSize: '0.4rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 3,
                    border: `1px solid ${active ? `${pcfg.accent}40` : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ width: 9, height: 9 }}><PIco /></div>
                  {pcfg.label}
                </button>
              )
            })}
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 18, height: 18, padding: 3, color: C.muted }}><Ico.Volume /></div>
            <div style={{ width: 18, height: 18, padding: 3, color: C.muted }}><Ico.Close /></div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ height: 2, background: C.surface, flexShrink: 0 }}>
          <div style={{
            height: '100%', background: cfg.accent,
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
          {currentPanel === 'antifraude' && <PanelAntifraude progress={progress} />}
          {currentPanel === 'funcoes'    && <PanelFuncoes    progress={progress} />}
          {currentPanel === 'cadastro'   && <PanelCadastro   progress={progress} />}
        </div>
      </div>
    </>
  )
}
