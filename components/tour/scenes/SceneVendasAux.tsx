'use client'
// components/tour/scenes/SceneVendasAux.tsx
// Mock visual fiel ao FazerPedidoDisplay — cicla pelas 3 etapas automaticamente

import { useEffect, useState, useRef } from 'react'

// ─── Paleta (espelho do FazerPedidoDisplay dark) ──────────────────────────────
const C = {
  bg:              '#1e293b',
  bgSecondary:     '#334155',
  bgChat:          '#0f172a',
  text:            '#f1f5f9',
  textMuted:       '#94a3b8',
  border:          '#475569',
  accent:          '#10b981',
  accentBlue:      '#3b82f6',
  userBubble:      '#10b981',
  assistantBubble: '#334155',
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Step = 'pedido' | 'entrega' | 'pagamento'

interface Msg { from: 'user' | 'bot'; text: string; produto?: true }

const MSGS: Msg[] = [
  { from: 'user', text: 'Quero um cappuccino e um croissant' },
  { from: 'bot',  text: 'Ótima escolha! Adicionei ao carrinho:', produto: true },
  { from: 'user', text: 'Pode finalizar' },
  { from: 'bot',  text: 'Perfeito! Escolha o tipo de entrega.' },
]

const STEPS: Step[] = ['pedido', 'entrega', 'pagamento']
const STEP_LABELS = { pedido: 'Pedido', entrega: 'Entrega', pagamento: 'Pagamento' }

// ─── Mini ícones SVG inline ───────────────────────────────────────────────────
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-full h-full">
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="white" className="w-full h-full"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
)
const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-full h-full">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconPix = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-full h-full">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-full h-full">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ─── Produto card mini ─────────────────────────────────────────────────────────
function ProdutoCard({ fs }: { fs: (n: number) => number }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.border, backgroundColor: C.bg, marginTop: 4 }}>
      <div style={{ background: 'linear-gradient(135deg, #134e4a, #0f766e)', height: fs(36) }} />
      <div style={{ padding: `${fs(5)}px ${fs(8)}px ${fs(7)}px` }}>
        <div style={{ fontWeight: 700, fontSize: fs(7.5), color: C.text, marginBottom: fs(1) }}>Cappuccino + Croissant</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: fs(3) }}>
          <span style={{ fontWeight: 800, fontSize: fs(8), color: C.accent }}>R$ 21,50</span>
          <div style={{
            background: C.accent, color: '#fff', borderRadius: fs(5),
            padding: `${fs(2)}px ${fs(6)}px`, fontSize: fs(6.5), fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: fs(2),
          }}>
            <span style={{ fontSize: fs(8), lineHeight: 1 }}>+</span> Adicionar
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Etapa Pedido ─────────────────────────────────────────────────────────────
function StepPedido({ msgCount, fs }: { msgCount: number; fs: (n: number) => number }) {
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Coluna Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'hidden', padding: `${fs(8)}px ${fs(10)}px`, display: 'flex', flexDirection: 'column', gap: fs(6), justifyContent: 'flex-end', backgroundColor: C.bgChat }}>
          {/* Mensagem inicial do bot */}
          {msgCount >= 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ maxWidth: '82%', backgroundColor: C.assistantBubble, borderRadius: fs(10), padding: `${fs(5)}px ${fs(8)}px`, fontSize: fs(7), color: C.text, lineHeight: 1.4 }}>
                Olá! Me diga o que deseja. Posso buscar no cardápio.
              </div>
            </div>
          )}
          {MSGS.slice(0, msgCount).map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'user' ? 'flex-end' : 'flex-start', gap: fs(3) }}>
              <div style={{
                maxWidth: '82%',
                backgroundColor: m.from === 'user' ? C.userBubble : C.assistantBubble,
                color: '#fff',
                borderRadius: fs(10),
                padding: `${fs(5)}px ${fs(8)}px`,
                fontSize: fs(7),
                lineHeight: 1.4,
              }}>
                {m.text}
              </div>
              {m.produto && <ProdutoCard fs={fs} />}
            </div>
          ))}
        </div>
        {/* Input bar */}
        <div style={{ padding: `${fs(6)}px ${fs(10)}px`, borderTop: `1px solid ${C.border}`, backgroundColor: C.bg, display: 'flex', gap: fs(5), alignItems: 'center' }}>
          <div style={{ flex: 1, backgroundColor: C.bgSecondary, borderRadius: fs(8), border: `1px solid ${C.border}`, padding: `${fs(5)}px ${fs(8)}px`, fontSize: fs(6.5), color: C.textMuted }}>
            Digite sua mensagem...
          </div>
          <div style={{ width: fs(22), height: fs(22), backgroundColor: C.accentBlue, borderRadius: fs(7), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: fs(5), color: '#fff' }}>
            <IconMic />
          </div>
          <div style={{ width: fs(22), height: fs(22), backgroundColor: C.accent, borderRadius: fs(7), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: fs(5) }}>
            <IconSend />
          </div>
        </div>
      </div>

      {/* Coluna Carrinho */}
      <div style={{ width: '38%', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
        {/* Busca */}
        <div style={{ padding: `${fs(8)}px ${fs(10)}px ${fs(6)}px`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: fs(5.5), fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: fs(4) }}>Adicionar produto</div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: fs(7), top: '50%', transform: 'translateY(-50%)', width: fs(10), height: fs(10), color: C.textMuted }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-full h-full"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <div style={{ backgroundColor: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: fs(8), paddingLeft: fs(22), paddingRight: fs(8), paddingTop: fs(5), paddingBottom: fs(5), fontSize: fs(6.5), color: C.textMuted }}>
              Buscar produto...
            </div>
          </div>
        </div>

        {/* Itens */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: fs(8), backgroundColor: C.bgChat, display: 'flex', flexDirection: 'column', gap: fs(5) }}>
          {msgCount >= 2 ? (
            <>
              {[
                { nome: 'Cappuccino', preco: 'R$ 12,00', qtd: 1 },
                { nome: 'Croissant',  preco: 'R$ 9,50',  qtd: 1 },
              ].map((item, i) => (
                <div key={i} style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: fs(10), padding: `${fs(7)}px ${fs(8)}px`, display: 'flex', alignItems: 'center', gap: fs(7) }}>
                  <div style={{ width: fs(26), height: fs(26), borderRadius: fs(7), background: i === 0 ? 'linear-gradient(135deg,#134e4a,#0f766e)' : 'linear-gradient(135deg,#78350f,#92400e)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: fs(7), fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</div>
                    <div style={{ fontSize: fs(5.5), color: C.textMuted }}>{item.preco} / un</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: fs(3), backgroundColor: C.bgSecondary, borderRadius: fs(6), padding: `${fs(2)}px ${fs(4)}px` }}>
                    <span style={{ fontSize: fs(7), color: C.textMuted }}>−</span>
                    <span style={{ fontSize: fs(7), fontWeight: 700, color: C.text, minWidth: fs(8), textAlign: 'center' }}>{item.qtd}</span>
                    <span style={{ fontSize: fs(7), color: C.textMuted }}>+</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: fs(6), color: C.textMuted }}>
              <div style={{ width: fs(32), height: fs(32), opacity: 0.2, color: C.textMuted }}>
                <IconCart />
              </div>
              <span style={{ fontSize: fs(7) }}>Carrinho vazio</span>
            </div>
          )}
        </div>

        {/* Total + botão */}
        {msgCount >= 2 && (
          <div style={{ padding: `${fs(6)}px ${fs(8)}px`, borderTop: `1px solid ${C.border}`, backgroundColor: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: fs(5) }}>
              <span style={{ fontSize: fs(6.5), color: C.textMuted }}>2 itens</span>
              <span style={{ fontSize: fs(8), fontWeight: 800, color: C.text }}>R$ 21,50</span>
            </div>
            <div style={{ backgroundColor: C.accent, color: '#fff', borderRadius: fs(9), padding: `${fs(7)}px`, fontSize: fs(7), fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fs(4) }}>
              <span style={{ width: fs(11), height: fs(11), display: 'inline-block', color: '#fff' }}><IconCart /></span>
              Finalizar Venda
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Etapa Entrega ────────────────────────────────────────────────────────────
function StepEntrega({ selected, fs }: { selected: number; fs: (n: number) => number }) {
  const opcoes = [
    { label: 'Retirada no local',  desc: 'Cliente retira no balcão',        icon: '🏪' },
    { label: 'Delivery',           desc: 'Entrega no endereço do cliente',   icon: '🚗' },
    { label: 'Mesa / Comanda',     desc: 'Consumo no estabelecimento',       icon: '🪑' },
  ]
  return (
    <div style={{ padding: `${fs(12)}px ${fs(16)}px`, display: 'flex', flexDirection: 'column', gap: fs(8), height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ fontSize: fs(7), color: C.textMuted }}>Como o pedido será entregue?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: fs(6) }}>
        {opcoes.map((op, i) => (
          <div key={i} style={{
            border: `1px solid ${i === selected ? C.accent : C.border}`,
            backgroundColor: i === selected ? 'rgba(16,185,129,0.08)' : C.bgSecondary,
            borderRadius: fs(10),
            padding: `${fs(10)}px ${fs(12)}px`,
            display: 'flex', alignItems: 'center', gap: fs(10),
            transition: 'all 300ms',
          }}>
            <span style={{ fontSize: fs(14) }}>{op.icon}</span>
            <div>
              <div style={{ fontSize: fs(8), fontWeight: 700, color: C.text }}>{op.label}</div>
              <div style={{ fontSize: fs(6.5), color: C.textMuted, marginTop: fs(1) }}>{op.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Botões */}
      <div style={{ display: 'flex', gap: fs(8), marginTop: 'auto' }}>
        <div style={{ flex: 1, backgroundColor: C.bgSecondary, color: C.text, borderRadius: fs(9), padding: `${fs(9)}px`, fontSize: fs(7.5), fontWeight: 700, textAlign: 'center' }}>
          ← Voltar
        </div>
        <div style={{ flex: 1, backgroundColor: C.accent, color: '#fff', borderRadius: fs(9), padding: `${fs(9)}px`, fontSize: fs(7.5), fontWeight: 700, textAlign: 'center' }}>
          Ir para pagamento →
        </div>
      </div>
    </div>
  )
}

// ─── Etapa Pagamento ──────────────────────────────────────────────────────────
function StepPagamento({ phase, fs }: { phase: number; fs: (n: number) => number }) {
  const metodos = [
    { key: 'pix',     label: 'PIX',          icon: <IconPix />,  cor: '#10b981' },
    { key: 'debito',  label: 'Débito NFC',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-full h-full"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>, cor: '#3b82f6' },
    { key: 'credito', label: 'Crédito NFC',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-full h-full"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>, cor: '#8b5cf6' },
    { key: 'cash',    label: 'Dinheiro',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-full h-full"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>, cor: '#f59e0b' },
  ]

  return (
    <div style={{ padding: `${fs(10)}px ${fs(16)}px`, display: 'flex', flexDirection: 'column', gap: fs(8), height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Resumo */}
      <div style={{ backgroundColor: C.bgSecondary, borderRadius: fs(10), border: `1px solid ${C.border}`, padding: `${fs(8)}px ${fs(10)}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: fs(6), color: C.textMuted }}>Total do pedido</div>
          <div style={{ fontSize: fs(12), fontWeight: 800, color: C.text, marginTop: fs(1) }}>R$ 21,50</div>
        </div>
        <div style={{ fontSize: fs(6.5), color: C.textMuted, textAlign: 'right' }}>
          <div>Cappuccino × 1</div>
          <div>Croissant × 1</div>
        </div>
      </div>

      {/* Métodos */}
      <div style={{ fontSize: fs(6), fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Forma de pagamento</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: fs(6) }}>
        {metodos.map((m, i) => (
          <div key={m.key} style={{
            border: `1px solid ${i === 0 && phase >= 1 ? m.cor : C.border}`,
            backgroundColor: i === 0 && phase >= 1 ? `${m.cor}18` : C.bgSecondary,
            borderRadius: fs(9),
            padding: `${fs(9)}px ${fs(8)}px`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fs(4),
            transition: 'all 300ms',
          }}>
            <div style={{ width: fs(18), height: fs(18), color: i === 0 && phase >= 1 ? m.cor : C.textMuted }}>
              {m.icon}
            </div>
            <span style={{ fontSize: fs(6.5), fontWeight: 700, color: i === 0 && phase >= 1 ? m.cor : C.textMuted }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* QR Code / Confirmação */}
      {phase >= 1 && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fs(5), transition: 'all 400ms' }}>
          {phase === 1 && (
            <>
              {/* QR Code mock */}
              <div style={{ width: fs(64), height: fs(64), backgroundColor: '#fff', borderRadius: fs(8), padding: fs(6), display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: fs(1.5) }}>
                {Array.from({ length: 49 }).map((_, i) => {
                  const pattern = [
                    1,1,1,1,1,1,1,
                    1,0,0,0,0,0,1,
                    1,0,1,1,1,0,1,
                    1,0,1,0,1,0,1,
                    1,0,1,1,1,0,1,
                    1,0,0,0,0,0,1,
                    1,1,1,1,1,1,1,
                  ]
                  const row = Math.floor(i / 7), col = i % 7
                  const isEdge = row < 7 && col < 7
                  const on = isEdge ? pattern[i] : Math.random() > 0.55 ? 1 : 0
                  return <div key={i} style={{ backgroundColor: on ? '#000' : '#fff', borderRadius: fs(0.5) }} />
                })}
              </div>
              <div style={{ fontSize: fs(6.5), color: C.textMuted }}>Aguardando pagamento PIX...</div>
            </>
          )}
          {phase >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fs(5) }}>
              <div style={{ width: fs(36), height: fs(36), backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.accent}` }}>
                <div style={{ width: fs(20), height: fs(20), color: C.accent }}><IconCheck /></div>
              </div>
              <div style={{ fontSize: fs(9), fontWeight: 800, color: C.accent }}>Pagamento confirmado!</div>
              <div style={{ fontSize: fs(6.5), color: C.textMuted }}>Venda registrada com sucesso</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneVendasAux() {
  const [step, setStep]         = useState<Step>('pedido')
  const [msgCount, setMsgCount] = useState(0)
  const [entregaSel, setEntregaSel] = useState(0)
  const [pagPhase, setPagPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 220 })

  // Escala responsiva
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // fs: escala de fonte relativa ao container
  const fs = (n: number) => (n * size.w) / 360

  // ─── Sequência de animações ──────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    if (step === 'pedido') {
      // Revela mensagens uma a uma
      if (msgCount < MSGS.length) {
        t = setTimeout(() => setMsgCount(c => c + 1), msgCount === 0 ? 800 : 1200)
      } else {
        // Após último msg, avança para entrega
        t = setTimeout(() => { setStep('entrega'); setEntregaSel(0) }, 1400)
      }
    }

    if (step === 'entrega') {
      if (entregaSel < 1) {
        t = setTimeout(() => setEntregaSel(1), 900)   // seleciona "Delivery"
      } else {
        t = setTimeout(() => { setStep('pagamento'); setPagPhase(0) }, 1400)
      }
    }

    if (step === 'pagamento') {
      if (pagPhase === 0) {
        t = setTimeout(() => setPagPhase(1), 700)   // mostra QR
      } else if (pagPhase === 1) {
        t = setTimeout(() => setPagPhase(2), 2000)  // confirmado
      } else {
        // Reinicia loop
        t = setTimeout(() => {
          setStep('pedido')
          setMsgCount(0)
          setEntregaSel(0)
          setPagPhase(0)
        }, 2200)
      }
    }

    return () => clearTimeout(t)
  }, [step, msgCount, entregaSel, pagPhase])

  const stepIndex = STEPS.indexOf(step)

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ backgroundColor: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Header (espelho fiel do FazerPedidoDisplay) ── */}
      <div style={{
        padding: `${fs(8)}px ${fs(12)}px`,
        borderBottom: `1px solid ${C.border}`,
        backgroundColor: 'rgba(16,185,129,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Ícone + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: fs(8) }}>
          <div style={{ width: fs(26), height: fs(26), borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: fs(6), flexShrink: 0 }}>
            <IconCart />
          </div>
          <div>
            <div style={{ fontSize: fs(9), fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
              {step === 'pedido' ? 'Assistente de Vendas'
                : step === 'entrega' ? 'Tipo de Entrega'
                : 'Pagamento'}
            </div>
            <div style={{ fontSize: fs(6), color: C.textMuted, marginTop: fs(1) }}>
              {step === 'pedido' ? 'Monte seu pedido com o assistente'
                : step === 'entrega' ? 'Como deseja receber seu pedido?'
                : 'Escolha a forma de pagamento'}
            </div>
          </div>
        </div>

        {/* Indicador de progresso — dots + linhas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: fs(4) }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: fs(3) }}>
              <div style={{
                width: fs(6), height: fs(6), borderRadius: '50%',
                backgroundColor: i <= stepIndex ? C.accent : C.border,
                transition: 'background-color 400ms',
              }} />
              {i < STEPS.length - 1 && (
                <div style={{ width: fs(10), height: fs(1), backgroundColor: C.border }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Conteúdo por etapa ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {step === 'pedido' && <StepPedido msgCount={msgCount} fs={fs} />}
        {step === 'entrega' && <StepEntrega selected={entregaSel} fs={fs} />}
        {step === 'pagamento' && <StepPagamento phase={pagPhase} fs={fs} />}
      </div>
    </div>
  )
}
