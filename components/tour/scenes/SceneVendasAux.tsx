'use client'
// components/tour/scenes/SceneVendasAux.tsx
// Assistente de Vendas — padrão visual unificado com SceneVendas
// Cicla automaticamente: pedido (chat+carrinho) → entrega → pagamento (QR → confirmado)

import { useEffect, useState, useRef } from 'react'

// ─── Paleta (espelho exato do SceneVendas / FazerPedidoDisplay dark) ──────────
const BG_DARK   = '#0f172a'
const BG_CARD   = 'rgba(255,255,255,0.04)'
const BG_CHAT   = '#0f172a'
const BG_SEC    = '#1e293b'
const BG_SEC2   = '#334155'
const BORDER    = 'rgba(255,255,255,0.08)'
const BORDER2   = '#475569'
const ACCENT    = '#10b981'
const ACCENT_B  = '#3b82f6'
const TXT       = '#f1f5f9'
const TXT_MUTED = '#94a3b8'
const USER_BUB  = '#10b981'
const BOT_BUB   = '#334155'

const PRODUCTS = [
  { id: '1', name: 'Expresso',      price: 8.00,  img: '/vendas1.jpg', fav: true  },
  { id: '2', name: 'Cappuccino',    price: 12.00, img: '/vendas2.jpg', fav: true  },
  { id: '3', name: 'Croissant',     price: 9.50,  img: '/vendas3.jpg', fav: false },
  { id: '4', name: 'Pão de Queijo', price: 5.00,  img: '/vendas4.jpg', fav: false },
]

interface Msg { from: 'user' | 'bot'; text: string; produto?: true }
const MSGS: Msg[] = [
  { from: 'user', text: 'Quero um cappuccino e um croissant' },
  { from: 'bot',  text: 'Ótima escolha! Adicionei ao carrinho:', produto: true },
  { from: 'user', text: 'Pode finalizar' },
  { from: 'bot',  text: 'Perfeito! Avançando para entrega.' },
]

type Step = 'pedido' | 'entrega' | 'pagamento'
const STEPS: Step[] = ['pedido', 'entrega', 'pagamento']

// ─── Ícones ───────────────────────────────────────────────────────────────────
const IconCart = ({ size = 16, color = 'white' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)
const IconSend = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
)
const IconMic = ({ size = 14, color = 'white' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconCheck = ({ size = 20, color = ACCENT }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconSearch = ({ size = 12, color = TXT_MUTED }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

// ─── Helper ───────────────────────────────────────────────────────────────────
const R = (n: number, w: number) => Math.round((n * w) / 360)

// ─── StepPedido ───────────────────────────────────────────────────────────────
function StepPedido({ msgCount, w }: { msgCount: number; w: number }) {
  const r = (n: number) => R(n, w)
  const cartItems = msgCount >= 2
    ? [{ id: '2', qty: 1 }, { id: '3', qty: 1 }]
    : []
  const total = cartItems.reduce((s, i) => {
    const p = PRODUCTS.find(x => x.id === i.id)
    return s + (p ? p.price * i.qty : 0)
  }, 0)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Coluna Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER2}`, overflow: 'hidden' }}>
        {/* Mensagens */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden',
        }}>
          {/* Boas-vindas */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              backgroundColor: BOT_BUB, color: TXT, borderRadius: r(10),
              padding: `${r(5)}px ${r(8)}px`, fontSize: r(7), lineHeight: 1.4, maxWidth: '85%',
            }}>
              Olá! Me diga o que deseja. Posso buscar no cardápio.
            </div>
          </div>

          {MSGS.slice(0, msgCount).map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'user' ? 'flex-end' : 'flex-start', gap: r(4) }}>
              <div style={{
                backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB,
                color: '#fff', borderRadius: r(10),
                padding: `${r(5)}px ${r(8)}px`, fontSize: r(7), lineHeight: 1.4, maxWidth: '85%',
              }}>
                {m.text}
              </div>

              {/* Card produto inline (igual FazerPedidoDisplay) */}
              {m.produto && (
                <div style={{
                  border: `1px solid ${BORDER2}`, borderRadius: r(10), overflow: 'hidden',
                  backgroundColor: BG_SEC, width: '88%',
                }}>
                  <div style={{ display: 'flex', height: r(36) }}>
                    <img src="/vendas2.jpg" alt="Cappuccino" style={{ width: '50%', objectFit: 'cover' }} />
                    <img src="/vendas3.jpg" alt="Croissant"  style={{ width: '50%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: `${r(5)}px ${r(8)}px ${r(7)}px` }}>
                    <div style={{ fontWeight: 700, fontSize: r(7.5), color: TXT }}>Cappuccino + Croissant</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: r(4) }}>
                      <span style={{ fontWeight: 800, fontSize: r(8), color: ACCENT }}>R$ 21,50</span>
                      <div style={{
                        backgroundColor: ACCENT, color: '#fff', borderRadius: r(6),
                        padding: `${r(2)}px ${r(7)}px`, fontSize: r(6.5), fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: r(2),
                      }}>
                        + Adicionar
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div style={{
          padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER2}`,
          backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{
            flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER2}`,
            padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED,
          }}>
            Digite sua mensagem...
          </div>
          <div style={{
            width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconMic size={r(12)} />
          </div>
          <div style={{
            width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7),
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconSend size={r(12)} />
          </div>
        </div>
      </div>

      {/* ── Coluna Carrinho ── */}
      <div style={{ width: `${r(136)}px`, display: 'flex', flexDirection: 'column', backgroundColor: BG_SEC, flexShrink: 0 }}>
        {/* Busca */}
        <div style={{ padding: `${r(8)}px ${r(8)}px ${r(6)}px`, borderBottom: `1px solid ${BORDER2}`, flexShrink: 0 }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(5) }}>
            Adicionar produto
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: r(7), top: '50%', transform: 'translateY(-50%)' }}>
              <IconSearch size={r(10)} />
            </div>
            <div style={{
              backgroundColor: BG_SEC2, border: `1px solid ${BORDER2}`, borderRadius: r(8),
              paddingLeft: r(22), paddingRight: r(8), paddingTop: r(5), paddingBottom: r(5),
              fontSize: r(6.5), color: TXT_MUTED,
            }}>
              Buscar produto...
            </div>
          </div>
        </div>

        {/* Itens */}
        <div style={{ flex: 1, overflowY: 'hidden', padding: `${r(6)}px ${r(7)}px`, backgroundColor: BG_CHAT, display: 'flex', flexDirection: 'column', gap: r(5) }}>
          {cartItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: r(6), color: TXT_MUTED, opacity: 0.5 }}>
              <IconCart size={r(28)} color={TXT_MUTED} />
              <span style={{ fontSize: r(7) }}>Carrinho vazio</span>
            </div>
          ) : cartItems.map(ci => {
            const p = PRODUCTS.find(x => x.id === ci.id)!
            return (
              <div key={ci.id} style={{
                backgroundColor: BG_SEC, border: `1px solid ${BORDER2}`, borderRadius: r(9),
                padding: `${r(6)}px ${r(7)}px`, display: 'flex', alignItems: 'center', gap: r(6),
              }}>
                <img src={p.img} alt={p.name} style={{ width: r(28), height: r(28), borderRadius: r(6), objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: r(7), fontWeight: 700, color: TXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: r(5.5), color: TXT_MUTED }}>R$ {p.price.toFixed(2).replace('.', ',')} / un</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: r(2), backgroundColor: BG_SEC2, borderRadius: r(6), padding: `${r(2)}px ${r(3)}px`, flexShrink: 0 }}>
                  <span style={{ fontSize: r(7), color: TXT_MUTED, lineHeight: 1 }}>−</span>
                  <span style={{ fontSize: r(7), fontWeight: 700, color: TXT, minWidth: r(8), textAlign: 'center' }}>{ci.qty}</span>
                  <span style={{ fontSize: r(7), color: TXT_MUTED, lineHeight: 1 }}>+</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Total + botão */}
        {cartItems.length > 0 && (
          <div style={{ padding: `${r(6)}px ${r(7)}px`, borderTop: `1px solid ${BORDER2}`, backgroundColor: BG_SEC, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: r(5) }}>
              <span style={{ fontSize: r(6.5), color: TXT_MUTED }}>2 itens</span>
              <span style={{ fontSize: r(8), fontWeight: 800, color: TXT }}>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            <div style={{
              backgroundColor: ACCENT, color: '#fff', borderRadius: r(9), padding: `${r(7)}px`,
              fontSize: r(7), fontWeight: 700, textAlign: 'center', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: r(4),
            }}>
              <IconCart size={r(11)} />
              Finalizar Venda
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StepEntrega ──────────────────────────────────────────────────────────────
function StepEntrega({ selected, w }: { selected: number; w: number }) {
  const r = (n: number) => R(n, w)
  const opcoes = [
    {
      label: 'Retirada no local', desc: 'Cliente retira no balcão',
      icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      label: 'Delivery', desc: 'Entrega no endereço do cliente',
      icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    },
    {
      label: 'Mesa / Comanda', desc: 'Consumo no estabelecimento',
      icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>,
    },
  ]

  return (
    <div style={{ padding: `${r(12)}px ${r(16)}px`, display: 'flex', flexDirection: 'column', gap: r(8), height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ fontSize: r(7), color: TXT_MUTED }}>Como o pedido será entregue?</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: r(6) }}>
        {opcoes.map((op, i) => (
          <div key={i} style={{
            border: `1px solid ${i === selected ? ACCENT : BORDER2}`,
            backgroundColor: i === selected ? 'rgba(16,185,129,0.08)' : BG_SEC2,
            borderRadius: r(10), padding: `${r(10)}px ${r(12)}px`,
            display: 'flex', alignItems: 'center', gap: r(10),
            transition: 'all 300ms',
            color: i === selected ? ACCENT : TXT_MUTED,
          }}>
            {op.icon}
            <div>
              <div style={{ fontSize: r(8), fontWeight: 700, color: TXT }}>{op.label}</div>
              <div style={{ fontSize: r(6.5), color: TXT_MUTED, marginTop: r(1) }}>{op.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: r(8), marginTop: 'auto' }}>
        <div style={{ flex: 1, backgroundColor: BG_SEC2, color: TXT, borderRadius: r(9), padding: `${r(9)}px`, fontSize: r(7.5), fontWeight: 700, textAlign: 'center' }}>
          ← Voltar
        </div>
        <div style={{ flex: 1, backgroundColor: ACCENT, color: '#fff', borderRadius: r(9), padding: `${r(9)}px`, fontSize: r(7.5), fontWeight: 700, textAlign: 'center' }}>
          Ir para pagamento →
        </div>
      </div>
    </div>
  )
}

// ─── StepPagamento ────────────────────────────────────────────────────────────
function StepPagamento({ phase, w }: { phase: number; w: number }) {
  const r = (n: number) => R(n, w)
  const metodos = [
    { label: 'PIX',         cor: ACCENT,    icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
    { label: 'Débito NFC',  cor: ACCENT_B,  icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { label: 'Crédito NFC', cor: '#8b5cf6', icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { label: 'Dinheiro',    cor: '#f59e0b', icon: <svg width={r(16)} height={r(16)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg> },
  ]

  return (
    <div style={{ padding: `${r(10)}px ${r(16)}px`, display: 'flex', flexDirection: 'column', gap: r(7), height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Resumo do pedido */}
      <div style={{
        backgroundColor: BG_SEC2, borderRadius: r(10), border: `1px solid ${BORDER2}`,
        padding: `${r(8)}px ${r(10)}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: r(6), color: TXT_MUTED }}>Total do pedido</div>
          <div style={{ fontSize: r(13), fontWeight: 800, color: TXT, marginTop: r(1) }}>R$ 21,50</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {[{ img: '/vendas2.jpg', label: 'Cappuccino × 1' }, { img: '/vendas3.jpg', label: 'Croissant × 1' }].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: r(4), justifyContent: 'flex-end', marginBottom: i === 0 ? r(3) : 0 }}>
              <span style={{ fontSize: r(6.5), color: TXT_MUTED }}>{item.label}</span>
              <img src={item.img} alt="" style={{ width: r(18), height: r(18), borderRadius: r(4), objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Grid de métodos */}
      <div style={{ fontSize: r(6), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        Forma de pagamento
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: r(6), flexShrink: 0 }}>
        {metodos.map((m, i) => (
          <div key={m.label} style={{
            border: `1px solid ${i === 0 && phase >= 1 ? m.cor : BORDER2}`,
            backgroundColor: i === 0 && phase >= 1 ? `${m.cor}1a` : BG_SEC2,
            borderRadius: r(9), padding: `${r(9)}px ${r(8)}px`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(4),
            color: i === 0 && phase >= 1 ? m.cor : TXT_MUTED,
            transition: 'all 300ms',
          }}>
            {m.icon}
            <span style={{ fontSize: r(6.5), fontWeight: 700 }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* QR Code → Confirmação */}
      {phase >= 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(5), flex: 1, justifyContent: 'center', transition: 'all 400ms' }}>
          {phase === 1 && (
            <>
              <img
                src="/qrcode.png"
                alt="QR Code PIX"
                style={{ width: r(72), height: r(72), borderRadius: r(8), objectFit: 'contain', backgroundColor: '#fff', padding: r(4) }}
              />
              <div style={{ fontSize: r(6.5), color: TXT_MUTED }}>Aguardando pagamento PIX...</div>
            </>
          )}
          {phase >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(5) }}>
              <div style={{
                width: r(40), height: r(40),
                backgroundColor: 'rgba(16,185,129,0.15)',
                border: `2px solid ${ACCENT}`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconCheck size={r(22)} />
              </div>
              <div style={{ fontSize: r(9), fontWeight: 800, color: ACCENT }}>Pagamento confirmado!</div>
              <div style={{ fontSize: r(6.5), color: TXT_MUTED }}>Venda registrada com sucesso</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneVendasAux() {
  const [step, setStep]           = useState<Step>('pedido')
  const [msgCount, setMsgCount]   = useState(0)
  const [entregaSel, setEntregaSel] = useState(-1)
  const [pagPhase, setPagPhase]   = useState(0)
  const containerRef              = useRef<HTMLDivElement>(null)
  const [w, setW]                 = useState(360)

  // Escala responsiva
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const r = (n: number) => R(n, w)

  // ─── Sequência automática ────────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    if (step === 'pedido') {
      if (msgCount < MSGS.length) {
        t = setTimeout(() => setMsgCount(c => c + 1), msgCount === 0 ? 700 : 1100)
      } else {
        t = setTimeout(() => { setStep('entrega'); setEntregaSel(-1) }, 1200)
      }
    }

    if (step === 'entrega') {
      if (entregaSel < 1) {
        t = setTimeout(() => setEntregaSel(s => s + 1), entregaSel === -1 ? 600 : 800)
      } else {
        t = setTimeout(() => { setStep('pagamento'); setPagPhase(0) }, 1200)
      }
    }

    if (step === 'pagamento') {
      if (pagPhase === 0) {
        t = setTimeout(() => setPagPhase(1), 600)
      } else if (pagPhase === 1) {
        t = setTimeout(() => setPagPhase(2), 2200)
      } else {
        t = setTimeout(() => {
          setStep('pedido'); setMsgCount(0); setEntregaSel(-1); setPagPhase(0)
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
      style={{ backgroundColor: BG_SEC, fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Header — idêntico ao FazerPedidoDisplay ── */}
      <div style={{
        padding: `${r(8)}px ${r(12)}px`,
        borderBottom: `1px solid ${BORDER2}`,
        backgroundColor: 'rgba(16,185,129,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: r(8) }}>
          <div style={{
            width: r(28), height: r(28), borderRadius: '50%',
            backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconCart size={r(14)} />
          </div>
          <div>
            <div style={{ fontSize: r(9), fontWeight: 800, color: TXT, lineHeight: 1.2 }}>
              {step === 'pedido' ? 'Assistente de Vendas'
                : step === 'entrega' ? 'Tipo de Entrega'
                : 'Pagamento'}
            </div>
            <div style={{ fontSize: r(6), color: TXT_MUTED, marginTop: r(1) }}>
              {step === 'pedido' ? 'Monte seu pedido com o assistente'
                : step === 'entrega' ? 'Como deseja receber seu pedido?'
                : 'Escolha a forma de pagamento'}
            </div>
          </div>
        </div>

        {/* Dots de progresso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: r(3) }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: r(3) }}>
              <div style={{
                width: r(6), height: r(6), borderRadius: '50%',
                backgroundColor: i <= stepIndex ? ACCENT : BORDER2,
                transition: 'background-color 400ms',
              }} />
              {i < STEPS.length - 1 && (
                <div style={{ width: r(10), height: r(1), backgroundColor: BORDER2 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {step === 'pedido'    && <StepPedido    msgCount={msgCount}  w={w} />}
        {step === 'entrega'   && <StepEntrega   selected={entregaSel} w={w} />}
        {step === 'pagamento' && <StepPagamento phase={pagPhase}      w={w} />}
      </div>
    </div>
  )
}
