'use client'
// components/tour/scenes/SceneFuncoesContato.tsx

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Contato'
const CAT1_COLOR = '#f59e0b'
const CAT1_FUNCOES = [
  'Nosso WhatsApp', 'Nosso Instagram', 'Nosso Facebook', 'Nosso TikTok',
  'Nosso LinkedIn', 'Nosso Twitter/X', 'Nosso Site', 'Nosso Email', 'Nosso Telefone',
]

const CAT2_NOME = 'Serviços'
const CAT2_COLOR = '#ef4444'
const CAT2_FUNCOES = [
  'Cardápio', 'Wi-Fi QR Code', 'Chamar Gerente', 'Enviar SMS',
  'Lista de Compras', 'Impressão Local', 'Impressão Remota', 'Impressão Recibo', 'Nosso QR Code',
]

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'

// ─── Carrossel ───────────────────────────────────────────────────────────────

function NamesCarousel({ names, color, reverse = false }: { names: string[]; color: string; reverse?: boolean }) {
  const [offset, setOffset] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const unitWidth = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setOffset(v => v + 1), 40)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (ref.current) unitWidth.current = ref.current.scrollWidth / 3
  })

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

// ─── Modal 1: QR Code WhatsApp ───────────────────────────────────────────────

function ModalQRWhatsApp() {
  const [timeLeft, setTimeLeft] = useState(15)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setTimeLeft(15); setCopied(false)
    const t = setInterval(() => setTimeLeft(v => Math.max(v - 1, 0)), 1000)
    const t2 = setTimeout(() => { setCopied(true) }, 2800)
    const t3 = setTimeout(() => { setCopied(false) }, 4200)
    return () => { clearInterval(t); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(37,211,102,0.35)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.4rem', color: 'white', fontWeight: 700 }}>WA</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>WhatsApp</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Escaneie para conversar</p>
          </div>
        </div>
        <div style={{ padding: '2px 7px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <span style={{ color: '#60a5fa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{timeLeft}s</span>
        </div>
      </div>

      {/* QR */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', gap: 8, overflow: 'hidden', position: 'relative' }}>
        <div style={{ background: 'white', padding: 'clamp(6px, 2vw, 12px)', borderRadius: 10, width: 'clamp(80px, 40%, 120px)', aspectRatio: '1/1' }}>
          <img src="/qrcode.png" alt="QR WhatsApp" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>

        {/* Overlay copiado */}
        {copied && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(37,211,102,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, animation: 'fadeIn 200ms ease' }}>
            <span style={{ color: 'white', fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)', fontWeight: 700 }}>✓</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>Copiado!</span>
          </div>
        )}

        {/* Barra inferior */}
        <div style={{ width: '100%', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>wa.me/5511999999999</span>
          </div>
          <div style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, background: '#2563eb', cursor: 'pointer' }}>
            <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>Copiar</span>
          </div>
        </div>

        {/* Barra de progresso auto-close */}
        <div style={{ width: '100%', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ height: '100%', background: '#25D366', width: `${(timeLeft / 15) * 100}%`, transition: 'width 1s linear', borderRadius: 1 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Modal 2: Chamar Gerente ─────────────────────────────────────────────────

function ModalChamarGerente() {
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form')
  const [typed, setTyped] = useState('')
  const TEXTO = 'Cliente solicitando aprovação de desconto no caixa.'

  useEffect(() => {
    setPhase('form'); setTyped('')
    let i = 0
    const typing = setInterval(() => {
      i++; setTyped(TEXTO.slice(0, i))
      if (i >= TEXTO.length) {
        clearInterval(typing)
        setTimeout(() => setPhase('sending'), 600)
        setTimeout(() => setPhase('done'), 1800)
      }
    }, 35)
    return () => clearInterval(typing)
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>GER</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Chamar Gerente</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Email + SMS</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase !== 'done' ? (
          <>
            {/* Destinatário */}
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>Destinatário</p>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '1px 0 0' }}>Carlos Silva — Gerente</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '1px 0 0' }}>carlos@empresa.com · (11) 99999-0000</p>
            </div>
            {/* Motivo */}
            <div style={{ flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Motivo da chamada</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.3)', minHeight: 48 }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0, lineHeight: 1.5 }}>
                  {typed}<span style={{ opacity: 0.6 }}>|</span>
                </p>
              </div>
            </div>
            {/* Botões */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Cancelar</span>
              </div>
              <div style={{ flex: 2, padding: '3px 6px', borderRadius: 6, background: phase === 'sending' ? 'rgba(217,119,6,0.5)' : '#d97706', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {phase === 'sending' && <div style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>{phase === 'sending' ? 'Enviando...' : 'Notificar Gerente'}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#4ade80', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Gerente notificado!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, textAlign: 'center' }}>carlos@empresa.com · SMS enviado</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 3: Lista de Compras ───────────────────────────────────────────────

function ModalListaCompras() {
  const [phase, setPhase] = useState<'adding' | 'saved' | 'checking'>('adding')
  const [items, setItems] = useState<string[]>([])
  const [checked, setChecked] = useState<boolean[]>([])
  const [progress, setProgress] = useState(0)

  const ITEMS = ['Leite integral', 'Ovos (1 dz)', 'Pão de forma', 'Queijo minas', 'Iogurte natural']

  useEffect(() => {
    setPhase('adding'); setItems([]); setChecked([]); setProgress(0)
    let i = 0
    const add = setInterval(() => {
      i++; setItems(ITEMS.slice(0, i))
      if (i >= ITEMS.length) {
        clearInterval(add)
        setTimeout(() => setPhase('saved'), 600)
        setTimeout(() => setPhase('checking'), 1600)
        // Marca itens progressivamente
        let j = 0
        const check = setInterval(() => {
          j++
          setChecked(prev => { const n = [...prev]; n[j - 1] = true; return n })
          setProgress(Math.round((j / ITEMS.length) * 100))
          if (j >= ITEMS.length) clearInterval(check)
        }, 500)
        setTimeout(() => clearInterval(check), 4000)
      }
    }, 400)
    return () => clearInterval(add)
  }, [])

  const pegos = checked.filter(Boolean).length

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>LISTA</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Lista de Compras</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>
              {phase === 'adding' ? 'Ditando itens...' : phase === 'saved' ? 'Lista salva!' : `${pegos} de ${ITEMS.length} itens`}
            </p>
          </div>
        </div>
        {phase === 'checking' && (
          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{progress}%</span>
        )}
      </div>

      <div style={{ flex: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        {/* Barra de progresso (modo checking) */}
        {phase === 'checking' && (
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0, marginBottom: 4 }}>
            <div style={{ height: '100%', background: '#10b981', width: `${progress}%`, transition: 'width 400ms ease', borderRadius: 2 }} />
          </div>
        )}

        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 7, background: checked[i] ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)', border: `1px solid ${checked[i] ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 300ms ease', opacity: checked[i] ? 0.5 : 1 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: checked[i] ? '#10b981' : 'rgba(255,255,255,0.1)', border: `1px solid ${checked[i] ? '#10b981' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 300ms ease' }}>
              {checked[i] && <span style={{ color: 'white', fontSize: '0.38rem', fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ color: checked[i] ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', fontWeight: 500, textDecoration: checked[i] ? 'line-through' : 'none', transition: 'all 300ms ease' }}>{item}</span>
          </div>
        ))}

        {phase === 'adding' && items.length < ITEMS.length && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#10b981', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontStyle: 'italic' }}>ouvindo...</span>
          </div>
        )}
      </div>

      {phase === 'adding' && (
        <div style={{ padding: '4px 12px 8px', flexShrink: 0 }}>
          <div style={{ padding: '3px 8px', borderRadius: 6, background: '#059669', textAlign: 'center' }}>
            <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Salvar Lista ({items.length} itens)</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal 4: Wi-Fi QR Code ──────────────────────────────────────────────────

function ModalWifiQR() {
  const [timeLeft, setTimeLeft] = useState(15)

  useEffect(() => {
    setTimeLeft(15)
    const t = setInterval(() => setTimeLeft(v => Math.max(v - 1, 0)), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>WIFI</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Wi-Fi QR Code</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Conecte sem digitar senha</p>
          </div>
        </div>
        <div style={{ padding: '2px 7px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <span style={{ color: '#60a5fa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{timeLeft}s</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', gap: 8, overflow: 'hidden' }}>
        {/* Info da rede */}
        <div style={{ width: '100%', padding: '5px 8px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>Rede</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '1px 0 0' }}>CafeExemplo_WiFi</p>
          </div>
          <div style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span style={{ color: '#34d399', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>WPA2</span>
          </div>
        </div>

        {/* QR */}
        <div style={{ background: 'white', padding: 'clamp(5px, 1.5vw, 10px)', borderRadius: 10, width: 'clamp(70px, 35%, 110px)', aspectRatio: '1/1', flexShrink: 0 }}>
          <img src="/qrcode.png" alt="QR Wi-Fi" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, textAlign: 'center' }}>
          Aponte a câmera do celular para conectar
        </p>

        {/* Barra auto-close */}
        <div style={{ width: '100%', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ height: '100%', background: '#6366f1', width: `${(timeLeft / 15) * 100}%`, transition: 'width 1s linear', borderRadius: 1 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'qr',      component: ModalQRWhatsApp    },
  { key: 'gerente', component: ModalChamarGerente  },
  { key: 'lista',   component: ModalListaCompras   },
  { key: 'wifi',    component: ModalWifiQR         },
]

export default function SceneFuncoesContato() {
  const [activeModal, setActiveModal] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveModal(v => (v + 1) % MODALS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const Modal = MODALS[activeModal].component

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG }}>
      {/* Cat 1 — acima, label esquerda, rola esquerda */}
      <div className="flex-shrink-0 flex items-center py-1.5" style={{ borderBottom: `1px solid ${CAT1_COLOR}20` }}>
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT1_COLOR }} />
          <span className="font-bold" style={{ color: CAT1_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{CAT1_NOME}</span>
        </div>
        <NamesCarousel names={CAT1_FUNCOES} color={CAT1_COLOR} reverse={false} />
      </div>

      {/* Modais */}
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

      {/* Cat 2 — abaixo, label direita, rola direita */}
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
