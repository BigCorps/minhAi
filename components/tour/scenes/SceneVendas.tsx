'use client'
// components/tour/scenes/SceneVendas.tsx
// Mock visual do SaleModeModal — grid de produtos + carrinho + seletor de entrega

import { useEffect, useState } from 'react'

const PRODUCTS = [
  { id: '1', name: 'Expresso',      price: 'R$ 8,00',  category: 'Cafés',   img: '/vendas1.jpg',  fav: true  },
  { id: '2', name: 'Cappuccino',    price: 'R$ 12,00', category: 'Cafés',   img: '/vendas2.jpg',  fav: true  },
  { id: '3', name: 'Croissant',     price: 'R$ 9,50',  category: 'Lanches', img: '/vendas3.jpg',  fav: false },
  { id: '4', name: 'Pão de Queijo', price: 'R$ 5,00',  category: 'Lanches', img: '/vendas4.jpg',  fav: false },
  { id: '5', name: 'Suco Laranja',  price: 'R$ 10,00', category: 'Bebidas', img: '/vendas5.jpg',  fav: false },
  { id: '6', name: 'Água Mineral',  price: 'R$ 4,00',  category: 'Bebidas', img: '/vendas6.jpg',  fav: false },
]

const CATEGORIES = ['Todos', 'Cafés', 'Lanches', 'Bebidas']

type DeliveryMode = 'grid' | 'entrega' | 'checkout'

const BG_DARK = '#0f172a'
const BG_CARD = 'rgba(255,255,255,0.04)'
const BORDER  = 'rgba(255,255,255,0.08)'

export default function SceneVendas() {
  const [activeCat, setActiveCat]     = useState('Todos')
  const [cart, setCart]               = useState<Record<string, number>>({ '1': 1, '2': 1 })
  const [mode, setMode]               = useState<DeliveryMode>('grid')
  const [delivery, setDelivery]       = useState<'retirada' | 'mesa' | 'entrega'>('retirada')
  const [addedId, setAddedId]         = useState<string | null>(null)

  // Avança automaticamente para tela de entrega após 4s
  useEffect(() => {
    const t1 = setTimeout(() => setMode('entrega'), 4500)
    const t2 = setTimeout(() => setMode('grid'),    8500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const filtered = PRODUCTS.filter(p => activeCat === 'Todos' || p.category === activeCat)
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find(x => x.id === id)
    return sum + (p ? parseFloat(p.price.replace('R$ ', '').replace(',', '.')) * qty : 0)
  }, 0)

  const handleAdd = (id: string) => {
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
    setAddedId(id)
    setTimeout(() => setAddedId(null), 600)
  }

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG_DARK }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0 border-b"
        style={{ borderColor: BORDER, background: 'rgba(15,23,42,0.9)' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-amber-500/80 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
              <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
              <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" /><path d="M3 21h18" />
            </svg>
          </div>
          <span className="text-white/70 font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>Café Exemplo</span>
        </div>
        {totalItems > 0 && (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-emerald-300 font-bold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.52rem)' }}>
              {totalItems} · R$ {totalPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
        )}
      </div>

      {/* ── Categorias ── */}
      <div className="flex gap-1.5 px-3 py-1.5 flex-shrink-0 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className="flex-shrink-0 px-2.5 py-0.5 rounded-full font-medium transition-all"
            style={{
              fontSize: 'clamp(0.42rem, 1vw, 0.55rem)',
              background: activeCat === cat ? 'rgba(16,185,129,0.3)' : BG_CARD,
              border: `1px solid ${activeCat === cat ? 'rgba(16,185,129,0.5)' : BORDER}`,
              color: activeCat === cat ? '#6ee7b7' : 'rgba(255,255,255,0.5)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Conteúdo principal: grid OU entrega ── */}
      <div className="flex-1 min-h-0 flex gap-2 px-3 pb-3 overflow-hidden">

        {mode === 'grid' && (
          <>
            {/* Grid de produtos */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="grid grid-cols-3 gap-1.5 h-full content-start overflow-hidden">
                {filtered.map(p => (
                  <div
                    key={p.id}
                    className="rounded-xl border overflow-hidden cursor-pointer transition-all"
                    style={{
                      background: addedId === p.id ? 'rgba(16,185,129,0.15)' : BG_CARD,
                      border: `1px solid ${addedId === p.id ? 'rgba(16,185,129,0.5)' : BORDER}`,
                    }}
                    onClick={() => handleAdd(p.id)}
                  >
                    {/* Imagem mock */}
<div className="relative" style={{ aspectRatio: '4/3' }}>
  <img
    src={p.img}
    alt={p.name}
    className="w-full h-full object-cover"
  />
  {p.fav && (
    <span className="absolute top-1 left-1 text-amber-400" style={{ fontSize: '0.5rem' }}>★</span>
  )}
  {cart[p.id] > 0 && (
    <div
      className="absolute top-0.5 right-0.5 rounded-full text-white font-bold flex items-center justify-center"
      style={{
        background: '#10b981',
        width: 'clamp(10px, 2.5vw, 14px)',
        height: 'clamp(10px, 2.5vw, 14px)',
        fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)',
      }}
    >
      {cart[p.id]}
    </div>
  )}
</div>
                    {/* Info */}
                    <div className="p-1">
                      <p className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{p.name}</p>
                      <p className="text-emerald-400 font-bold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>{p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carrinho lateral */}
            <div
              className="flex-shrink-0 flex flex-col rounded-xl border"
              style={{
                width: 'clamp(80px, 22%, 120px)',
                background: BG_CARD,
                borderColor: BORDER,
              }}
            >
              <div className="px-2 py-1.5 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
                <p className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>Carrinho</p>
              </div>
              <div className="flex-1 overflow-hidden px-2 py-1.5 flex flex-col gap-1">
                {Object.entries(cart).filter(([,q]) => q > 0).map(([id, qty]) => {
                  const p = PRODUCTS.find(x => x.id === id)
                  if (!p) return null
                  return (
                    <div key={id} className="flex items-center justify-between gap-1">
                      <span className="text-white/70 truncate" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>{p.name}</span>
                      <span className="text-white/40 flex-shrink-0" style={{ fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>×{qty}</span>
                    </div>
                  )
                })}
              </div>
              {totalItems > 0 && (
                <div className="px-2 py-1.5 border-t flex-shrink-0" style={{ borderColor: BORDER }}>
                  <p className="text-emerald-400 font-bold text-center" style={{ fontSize: 'clamp(0.42rem, 1vw, 0.55rem)' }}>
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                  <button
                    className="w-full mt-1 rounded-lg py-0.5 text-white font-semibold"
                    style={{ background: '#10b981', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}
                    onClick={() => setMode('entrega')}
                  >
                    Finalizar
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tela de entrega ── */}
        {mode === 'entrega' && (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-full max-w-xs rounded-2xl border p-4 flex flex-col gap-2"
              style={{ background: 'rgba(30,41,59,0.98)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-white/50 text-center font-medium" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.62rem)' }}>
                Como prefere receber seu pedido?
              </p>

              {(['retirada', 'mesa', 'entrega'] as const).map(opt => {
                const labels = { retirada: 'Retirar no balcão', mesa: 'Mesa / Comanda', entrega: 'Delivery' }
                const descs  = { retirada: 'Cliente retira no local', mesa: 'Consumo no estabelecimento', entrega: 'Entrega no endereço' }
                const icons  = {
                  retirada: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                  mesa:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
                  entrega:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
                }
                const isActive = delivery === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setDelivery(opt)}
                    className="flex items-center gap-2 rounded-xl border p-2 text-left transition-all"
                    style={{
                      borderColor: isActive ? '#10b981' : 'rgba(255,255,255,0.1)',
                      background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#6ee7b7' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {icons[opt]}
                    <div>
                      <p className="font-semibold" style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.62rem)' }}>{labels[opt]}</p>
                      <p style={{ fontSize: 'clamp(0.4rem, 0.95vw, 0.5rem)', color: 'rgba(255,255,255,0.35)' }}>{descs[opt]}</p>
                    </div>
                  </button>
                )
              })}

              {delivery === 'entrega' && (
                <div
                  className="rounded-lg px-2 py-1.5 text-center"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <p className="text-emerald-300 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.6rem)' }}>
                    Frete calculado automaticamente
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>
                    R$ 8,90 · ~35 min
                  </p>
                </div>
              )}

              <button
                className="w-full py-1.5 rounded-xl text-white font-bold flex items-center justify-center gap-1.5"
                style={{ background: '#10b981', fontSize: 'clamp(0.5rem, 1.2vw, 0.62rem)' }}
                onClick={() => setMode('grid')}
              >
                Ir para pagamento
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" className="w-3 h-3">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}