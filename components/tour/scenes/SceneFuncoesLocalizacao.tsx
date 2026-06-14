'use client'
// components/tour/scenes/SceneFuncoesLocalizacao.tsx

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Localização'
const CAT1_COLOR = '#6366f1'
const CAT1_FUNCOES = [
  'Nosso Endereço', 'Buscar Endereço', 'Traçar Rota',
  'Consultar CEP', 'Rastreio Correios', 'Consultar DDD',
]

const CAT2_NOME = 'Informação'
const CAT2_COLOR = '#14b8a6'
const CAT2_FUNCOES = [
  'Cotação de Câmbio', 'Clima e Tempo', 'Ver Notícias',
  'Calculadora de Juros', 'Calculadora de IMC',
  'Converter Medidas', 'Feriados Nacionais', 'Pesquisar Produto',
]

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

function NamesCarousel({ names, color, reverse = false }: { names: string[]; color: string; reverse?: boolean }) {
  const [offset, setOffset] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const unitWidth = useRef(0)
  useEffect(() => { const t = setInterval(() => setOffset(v => v + 1), 40); return () => clearInterval(t) }, [])
  useEffect(() => { if (ref.current) unitWidth.current = ref.current.scrollWidth / 3 })
  const tripled = [...names, ...names, ...names]
  const unit = unitWidth.current || 9999
  const shift = reverse ? (unit - (offset % unit)) : (offset % unit)
  return (
    <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <div ref={ref} className="flex items-center whitespace-nowrap" style={{ transform: `translateX(-${shift}px)`, transition: 'none', gap: 0 }}>
        {tripled.map((name, i) => (
          <span key={i} className="flex items-center flex-shrink-0">
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', padding: '0 clamp(6px, 1.5vw, 10px)' }}>{name}</span>
            <span style={{ color, opacity: 0.5, fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Modal 1: Traçar Rota ────────────────────────────────────────────────────

function ModalTracarRota() {
  const [phase, setPhase] = useState<'input' | 'processing' | 'result'>('input')
  const [destino, setDestino] = useState('')
  const DEST = 'Av. Paulista, 1000 — São Paulo'

  useEffect(() => {
    setPhase('input'); setDestino('')
    let i = 0
    const typing = setInterval(() => {
      i++; setDestino(DEST.slice(0, i))
      if (i >= DEST.length) { clearInterval(typing); setTimeout(() => setPhase('processing'), 400) }
    }, 50)
    const t2 = setTimeout(() => setPhase('result'), DEST.length * 50 + 1400)
    return () => { clearInterval(typing); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>ROTA</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Traçar Rota</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>
            {phase === 'result' ? 'Rota encontrada' : phase === 'processing' ? 'Calculando...' : 'Informe o destino'}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase === 'input' && (
          <>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Origem</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>Detectando localização...</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Destino</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.4)' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{destino}<span style={{ opacity: 0.6 }}>|</span></span>
              </div>
            </div>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.4)', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Calcular Rota</span>
            </div>
          </>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Calculando rota...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
            {/* Mapa mockado */}
            <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg, #1e3a5f, #0f2d4a)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Grid de ruas mockado */}
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%', opacity: 0.4 }}>
                <line x1="0" y1="30" x2="200" y2="30" stroke="#334155" strokeWidth="1"/>
                <line x1="0" y1="60" x2="200" y2="60" stroke="#334155" strokeWidth="1"/>
                <line x1="0" y1="90" x2="200" y2="90" stroke="#334155" strokeWidth="1"/>
                <line x1="40" y1="0" x2="40" y2="120" stroke="#334155" strokeWidth="1"/>
                <line x1="100" y1="0" x2="100" y2="120" stroke="#334155" strokeWidth="1"/>
                <line x1="160" y1="0" x2="160" y2="120" stroke="#334155" strokeWidth="1"/>
                {/* Rota */}
                <path d="M 20 100 L 20 60 L 100 60 L 100 30 L 160 30" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                {/* Origem */}
                <circle cx="20" cy="100" r="4" fill="#22c55e"/>
                {/* Destino */}
                <circle cx="160" cy="30" r="4" fill="#ef4444"/>
              </svg>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, flexShrink: 0 }}>
              {[['Distância', '8,4 km'], ['Tempo estimado', '23 min']].map(([l, v]) => (
                <div key={l} style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{l}</p>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '2px 0 0' }}>{v}</p>
                </div>
              ))}
            </div>
            {/* Botão + QR */}
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <div style={{ flex: 2, padding: '3px 6px', borderRadius: 6, background: '#10b981', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Abrir no Maps</span>
              </div>
              <div style={{ flexShrink: 0, background: 'white', padding: 3, borderRadius: 5, width: 'clamp(24px, 8%, 32px)', aspectRatio: '1/1' }}>
                <img src="/qrcode.png" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 2: Nosso Endereço ─────────────────────────────────────────────────

function ModalNossoEndereco() {
  const [timeLeft, setTimeLeft] = useState(15)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setTimeLeft(15); setCopied(false)
    const t = setInterval(() => setTimeLeft(v => Math.max(v - 1, 0)), 1000)
    const t2 = setTimeout(() => setCopied(true), 2800)
    const t3 = setTimeout(() => setCopied(false), 4200)
    return () => { clearInterval(t); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>END</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Café Exemplo</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Localização</p>
          </div>
        </div>
        <div style={{ padding: '2px 7px', borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <span style={{ color: '#818cf8', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', overflow: 'hidden' }}>
        {/* Mapa mockado */}
        <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(135deg, #1e3a5f, #0f2d4a)', position: 'relative' }}>
          <svg viewBox="0 0 200 100" style={{ width: '100%', height: '100%', opacity: 0.5 }}>
            {[20,50,80].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#334155" strokeWidth="1"/>)}
            {[50,100,150].map(x => <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#334155" strokeWidth="1"/>)}
          </svg>
          {/* Pin */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50% 50% 50% 0', background: '#ef4444', transform: 'rotate(-45deg)', boxShadow: '0 2px 8px rgba(239,68,68,0.6)' }} />
          </div>
        </div>
        {/* Endereço */}
        <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Rua das Flores, 123 — Vila Madalena</p>
        </div>
        {/* Botões */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <div
            style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: copied ? '#10b981' : '#2563eb', textAlign: 'center', transition: 'background 300ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </div>
          <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: '#10b981', textAlign: 'center' }}>
            <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Abrir no Maps</span>
          </div>
          <div style={{ flexShrink: 0, background: 'white', padding: 3, borderRadius: 5, width: 'clamp(22px, 7%, 30px)', aspectRatio: '1/1' }}>
            <img src="/qrcode.png" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ height: '100%', background: '#2563eb', width: `${(timeLeft / 15) * 100}%`, transition: 'width 1s linear' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Modal 3: Cotação de Câmbio ──────────────────────────────────────────────

function ModalCotacaoCambio() {
  const [phase, setPhase] = useState<'select' | 'processing' | 'result'>('select')
  const [selected, setSelected] = useState('USD')

  useEffect(() => {
    setPhase('select'); setSelected('USD')
    const t1 = setTimeout(() => setPhase('processing'), 1600)
    const t2 = setTimeout(() => setPhase('result'), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const MOEDAS = [
    { code: 'USD', flag: '🇺🇸', name: 'Dólar' },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
    { code: 'GBP', flag: '🇬🇧', name: 'Libra' },
    { code: 'JPY', flag: '🇯🇵', name: 'Iene' },
    { code: 'BTC', flag: '₿', name: 'Bitcoin' },
    { code: 'CAD', flag: '🇨🇦', name: 'CAD' },
  ]

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>CAM</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Cotação de Câmbio</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Tempo real</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase === 'select' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {MOEDAS.map(m => (
                <div key={m.code} style={{ padding: '5px 6px', borderRadius: 8, background: m.code === selected ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${m.code === selected ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 300ms ease' }}>
                  <span style={{ fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>{m.flag}</span>
                  <div>
                    <p style={{ color: m.code === selected ? '#f87171' : 'white', fontWeight: 600, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>{m.code}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', margin: 0 }}>{m.name}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'auto', padding: '3px 8px', borderRadius: 6, background: '#dc2626', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Consultar Cotação</span>
            </div>
          </>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(239,68,68,0.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Consultando cotação...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)' }}>🇺🇸</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Dólar Americano · USD</p>
                <p style={{ color: 'white', fontWeight: 800, fontSize: 'clamp(0.85rem, 2.2vw, 1.1rem)', margin: '2px 0 0' }}>R$ 5,18</p>
              </div>
            </div>
            {/* Variação */}
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ color: '#ef4444', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>↓ -0,42%</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>em relação a ontem</span>
            </div>
            {/* Grid compra/venda */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, flex: 1 }}>
              {[['Compra', 'R$ 5,17'], ['Venda', 'R$ 5,19']].map(([l, v]) => (
                <div key={l} style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{l}</p>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '2px 0 0' }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Copiar</span>
              </div>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: '#dc2626', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Baixar PDF</span>
              </div>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Nova</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 4: Pesquisar Produto ──────────────────────────────────────────────

function ModalPesquisarProduto() {
  const [phase, setPhase] = useState<'input' | 'loading' | 'result'>('input')
  const [query, setQuery] = useState('')
  const QUERY = 'notebook gamer'

  const PRODUTOS = [
    { nome: 'Notebook Gamer ASUS ROG 16"', preco: 'R$ 4.299,00', loja: 'Amazon', color: '#f59e0b' },
    { nome: 'Dell G15 i7 RTX 3060', preco: 'R$ 5.849,00', loja: 'Kabum', color: '#3b82f6' },
    { nome: 'Lenovo Legion 5 Gen 8', preco: 'R$ 6.199,00', loja: 'Mercado Livre', color: '#10b981' },
  ]

  useEffect(() => {
    setPhase('input'); setQuery('')
    let i = 0
    const typing = setInterval(() => {
      i++; setQuery(QUERY.slice(0, i))
      if (i >= QUERY.length) { clearInterval(typing); setTimeout(() => setPhase('loading'), 400) }
    }, 70)
    const t2 = setTimeout(() => setPhase('result'), QUERY.length * 70 + 1400)
    return () => { clearInterval(typing); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(0,255,247,0.2)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,255,247,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#00b8b0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>PROD</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Procurar Produto</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Busca em tempo real</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase !== 'result' && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>O que você está procurando?</p>
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,255,247,0.3)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{query}<span style={{ opacity: 0.6 }}>|</span></span>
            </div>
          </div>
        )}

        {phase === 'input' && (
          <div style={{ marginTop: 'auto', padding: '3px 8px', borderRadius: 6, background: '#00b8b0', textAlign: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Buscar Produtos</span>
          </div>
        )}

        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(0,255,247,0.2)', borderTopColor: '#00fff7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Buscando produtos...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Busca: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{QUERY}</strong></span>
              <div style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>Nova busca</span>
              </div>
            </div>
            {PRODUTOS.map((p, i) => (
              <div key={p.nome} style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${p.color}20`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>💻</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ color: '#00b8b0', fontWeight: 700, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{p.preco}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>{p.loja}</span>
                  </div>
                </div>
                <div style={{ padding: '3px 6px', borderRadius: 6, background: '#00b8b0', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 700 }}>Abrir</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'rota',     component: ModalTracarRota       },
  { key: 'endereco', component: ModalNossoEndereco    },
  { key: 'cambio',   component: ModalCotacaoCambio    },
  { key: 'produto',  component: ModalPesquisarProduto },
]

export default function SceneFuncoesLocalizacao() {
  const [activeModal, setActiveModal] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveModal(v => (v + 1) % MODALS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const Modal = MODALS[activeModal].component

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG, maxWidth: 500, margin: '0 auto' }}>
      <div className="flex-shrink-0 flex items-center py-1.5" style={{ borderBottom: `1px solid ${CAT1_COLOR}20` }}>
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT1_COLOR }} />
          <span className="font-bold" style={{ color: CAT1_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{CAT1_NOME}</span>
        </div>
        <NamesCarousel names={CAT1_FUNCOES} color={CAT1_COLOR} reverse={false} />
      </div>

      <div className="flex-1 min-h-0 px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-1.5 flex-shrink-0">
          {MODALS.map((m, i) => (
            <button key={m.key} onClick={() => setActiveModal(i)} style={{ width: activeModal === i ? 16 : 5, height: 5, borderRadius: 3, background: activeModal === i ? CAT1_COLOR : 'rgba(255,255,255,0.2)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 300ms ease' }} />
          ))}
        </div>
        <div className="flex-1 min-h-0" key={activeModal} style={{ animation: 'fadeIn 300ms ease' }}>
          <Modal />
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center py-1.5" style={{ borderTop: `1px solid ${CAT2_COLOR}20` }}>
        <NamesCarousel names={CAT2_FUNCOES} color={CAT2_COLOR} reverse={true} />
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT2_COLOR }} />
          <span className="font-bold" style={{ color: CAT2_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{CAT2_NOME}</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
