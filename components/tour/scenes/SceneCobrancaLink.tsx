'use client'
// components/tour/scenes/SceneCobrancaLink.tsx
// Dois cards lado a lado (PIX | InfinitePay), mock clica no PIX,
// abre tela de valor → tela de QR Code (Café Exemplo)

import { useEffect, useRef, useState } from 'react'

const BG = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)'
const BG_CARD = '#1e293b'

// ── Ícones ────────────────────────────────────────────────────────
const PixIcon = () => (
  <svg viewBox="0 0 24 24" fill="#00B8A9" style={{ width: '100%', height: '100%' }}>
    <path d="M18.15 17.94c-.98 0-1.9-.38-2.59-1.07l-3.15-3.15a.58.58 0 0 0-.82 0l-3.16 3.16c-.69.69-1.61 1.07-2.59 1.07H5.1l4.36 4.36a3.59 3.59 0 0 0 5.08 0l4.37-4.37h-.76ZM5.84 6.05c.98 0 1.9.38 2.59 1.07l3.16 3.16c.23.23.59.23.82 0l3.15-3.15c.69-.69 1.61-1.07 2.59-1.07h.76L14.54 1.7a3.59 3.59 0 0 0-5.08 0L5.1 6.05h.74Z" />
    <path d="m22.3 9.46-2.56-2.56a.7.7 0 0 1-.2.03h-1.3c-.67 0-1.32.27-1.8.75l-3.15 3.15a1.82 1.82 0 0 1-2.58 0L7.56 7.67c-.48-.48-1.13-.75-1.8-.75H4.25a.7.7 0 0 1-.19-.03L1.7 9.25a3.59 3.59 0 0 0 0 5.08l2.36 2.36a.7.7 0 0 1 .19-.03h1.51c.67 0 1.32-.27 1.8-.75l3.16-3.16a1.82 1.82 0 0 1 2.58 0l3.15 3.15c.48.48 1.13.75 1.8.75h1.3c.07 0 .14.01.2.03l2.56-2.56a3.59 3.59 0 0 0 0-5.07Z" />
  </svg>
)

const InfinitePayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)

const CafeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="round" style={{ width: '55%', height: '55%' }}>
    <path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
    <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" />
    <path d="M3 21h18" />
  </svg>
)

// ── Tela 1 — Dois cards lado a lado ──────────────────────────────
function TelaCards({ onPixClick }: { onPixClick: () => void }) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: 10, height: 10 }}>
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
          Links de Cobrança
        </span>
      </div>

      {/* Dois cards lado a lado */}
      <div className="flex-1 min-h-0 flex gap-2 px-3 py-3">

        {/* Card PIX */}
        <button
          onClick={onPixClick}
          className="flex-1 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{
            background: 'rgba(0,184,169,0.08)',
            border: '1.5px solid rgba(0,184,169,0.35)',
            padding: 'clamp(10px, 2vw, 18px)',
          }}
        >
          {/* Ícone PIX grande */}
          <div style={{ width: 'clamp(28px, 6vw, 44px)', height: 'clamp(28px, 6vw, 44px)' }}>
            <PixIcon />
          </div>

          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
            Link PIX
          </span>

          <div className="rounded-lg px-2 py-0.5 font-mono text-center w-full truncate"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#00B8A9', fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
            minhai.app/pix/cafeexemplo
          </div>

          <p className="text-center text-white/40" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', lineHeight: 1.4 }}>
            Cliente escolhe o valor · QR gerado na hora
          </p>

          <div className="rounded-full px-2 py-0.5 font-semibold"
            style={{ background: 'rgba(0,184,169,0.15)', color: '#00B8A9', fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', border: '1px solid rgba(0,184,169,0.25)' }}>
            Ativo
          </div>
        </button>

        {/* Card InfinitePay */}
        <div
          className="flex-1 rounded-xl flex flex-col items-center justify-center gap-2"
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1.5px solid rgba(245,158,11,0.25)',
            padding: 'clamp(10px, 2vw, 18px)',
          }}
        >
          {/* Ícone InfinitePay grande */}
          <div style={{ width: 'clamp(28px, 6vw, 44px)', height: 'clamp(28px, 6vw, 44px)' }}>
            <InfinitePayIcon />
          </div>

          <span className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>
            Link InfinitePay
          </span>

          <div className="rounded-lg px-2 py-0.5 font-mono text-center w-full truncate"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#f59e0b', fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
            minhai.app/pay/cafeexemplo
          </div>

          <p className="text-center text-white/40" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', lineHeight: 1.4 }}>
            Cliente informa telefone · paga pelo celular
          </p>

          <div className="rounded-full px-2 py-0.5 font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontSize: 'clamp(0.26rem, 0.6vw, 0.34rem)', border: '1px solid rgba(245,158,11,0.25)' }}>
            Ativo
          </div>
        </div>

      </div>

      {/* Rodapé */}
      <div className="flex items-center gap-2 mx-3 mb-3 rounded-xl px-3 py-2 flex-shrink-0"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-white/45" style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.37rem)' }}>
          Dois links diferentes · cada um com endereço próprio minhAi
        </p>
      </div>
    </div>
  )
}

// ── Tela 2 — Digitar valor (Print 1) ─────────────────────────────
function TelaValor({ onConfirm, onBack }: { onConfirm: () => void; onBack: () => void }) {
  const [value, setValue] = useState('')

  // auto-type animation: "100,00"
  useEffect(() => {
    const chars = '100,00'.split('')
    let i = 0
    setValue('')
    const t = setInterval(() => {
      if (i < chars.length) {
        const ch = chars[i]
        setValue(prev => prev + ch)
        i++
      } else {
        clearInterval(t)
        setTimeout(() => onConfirm(), 700)
      }
    }, 180)
    return () => clearInterval(t)
  }, [onConfirm])

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#0a0f1e' }}>

      {/* Topo — logo Café Exemplo */}
      <div className="flex flex-col items-center flex-shrink-0 pt-4 pb-2 gap-1">
        <div style={{
          width: 'clamp(36px, 9vw, 52px)', height: 'clamp(36px, 9vw, 52px)',
          borderRadius: '50%', background: 'rgba(245,158,11,0.15)',
          border: '2px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CafeIcon />
        </div>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.6rem, 1.4vw, 0.82rem)', margin: 0 }}>
          Café Exemplo
        </p>
        <p style={{ fontSize: 'clamp(0.36rem, 0.85vw, 0.5rem)', color: '#00B8A9', fontWeight: 600, margin: 0 }}>
          Pagamento via PIX
        </p>
      </div>

      {/* Card valor */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
        <div className="w-full rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)', maxWidth: 320 }}>
          <p className="text-white/60" style={{ fontSize: 'clamp(0.4rem, 0.95vw, 0.56rem)', margin: 0 }}>
            Valor do pagamento
          </p>
          {/* Input simulado */}
          <div className="rounded-xl px-3 py-2 flex items-center"
            style={{ background: '#0f172a', border: '1.5px solid rgba(59,130,246,0.4)', minHeight: 36 }}>
            <span style={{ color: value ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.7rem, 1.8vw, 1.05rem)', fontWeight: 500, letterSpacing: '0.02em' }}>
              {value ? `R$  ${value}` : 'R$  0,00'}
            </span>
          </div>

          {/* Botão */}
          <div className="w-full rounded-xl flex items-center justify-center font-bold"
            style={{
              background: value.length > 0 ? '#3b82f6' : 'rgba(59,130,246,0.3)',
              color: '#fff', padding: '8px 0',
              fontSize: 'clamp(0.44rem, 1vw, 0.6rem)',
              transition: 'background 200ms',
            }}>
            Gerar QR Code PIX
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center pb-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)' }}>
        Pagamento processado com segurança via Banco Inter e BigCorps
        <br />
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>minhAi — Uma IA pra chamar de sua!</span>
      </div>
    </div>
  )
}

// ── Tela 3 — QR Code gerado (Print 2) ────────────────────────────
function TelaQR({ onBack }: { onBack: () => void }) {
  const [seconds, setSeconds] = useState(1797) // 29:57

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#0a0f1e' }}>

      {/* Topo */}
      <div className="flex flex-col items-center flex-shrink-0 pt-3 pb-1 gap-0.5">
        <div style={{
          width: 'clamp(30px, 7vw, 44px)', height: 'clamp(30px, 7vw, 44px)',
          borderRadius: '50%', background: 'rgba(245,158,11,0.15)',
          border: '2px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CafeIcon />
        </div>
        <p className="font-bold text-white" style={{ fontSize: 'clamp(0.55rem, 1.3vw, 0.76rem)', margin: 0 }}>
          Café Exemplo
        </p>
        <p style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.44rem)', color: '#60a5fa', fontWeight: 600, margin: 0 }}>
          Pagamento de <span style={{ color: '#fff' }}>R$ 100,00</span>
        </p>
      </div>

      {/* Dois painéis */}
      <div className="flex-1 min-h-0 flex gap-2 px-2 pb-2 pt-1">

        {/* Esquerda — resumo + botões */}
        <div className="flex-1 rounded-xl flex flex-col gap-1.5 p-2"
          style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Header resumo */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Resumo
            </span>
            <span className="rounded-full px-1.5 py-0.5 font-semibold"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: 'clamp(0.24rem, 0.55vw, 0.32rem)', border: '1px solid rgba(251,191,36,0.25)' }}>
              Aguardando
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.24rem, 0.55vw, 0.32rem)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Intermediações de Pagamentos BigCorps
          </p>

          {/* Linhas */}
          {[
            { label: 'Empresa', value: 'Café Exemplo', color: '#fff' },
            { label: 'Banco', value: 'Banco Inter', color: '#fff' },
            { label: 'Validade', value: 'Válido por 30 min', color: '#4ade80' },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)' }}>{r.label}</span>
              <span style={{ color: r.color, fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between mt-0.5 pt-1.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(0.32rem, 0.75vw, 0.44rem)' }}>Total</span>
            <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: 'clamp(0.38rem, 0.9vw, 0.52rem)' }}>R$ 100,00</span>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-1 mt-auto">
            <div className="rounded-lg flex items-center justify-center gap-1 font-bold"
              style={{ background: '#3b82f6', color: '#fff', padding: '5px 0', fontSize: 'clamp(0.3rem, 0.7vw, 0.42rem)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" style={{ width: 8, height: 8 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copiar Código PIX
            </div>
            <div className="rounded-lg flex items-center justify-center font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', padding: '5px 0', fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Já paguei, verificar agora
            </div>
          </div>

          {/* Novo valor link */}
          <div className="flex items-center gap-1" style={{ cursor: 'pointer' }} onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" style={{ width: 7, height: 7 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.26rem, 0.6vw, 0.35rem)' }}>Novo valor</span>
          </div>
        </div>

        {/* Direita — QR Code */}
        <div className="flex-1 rounded-xl flex flex-col items-center justify-center gap-2 p-2"
          style={{ background: BG_CARD, border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, opacity: 0.7 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} style={{ width: '100%', height: '100%' }}>
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" />
              </svg>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.42rem)', fontWeight: 600 }}>
              2. Escaneie o QR Code
            </span>
          </div>

          {/* QR code image */}
          <div className="rounded-xl overflow-hidden flex-shrink-0"
            style={{ width: 'clamp(64px, 15vw, 100px)', height: 'clamp(64px, 15vw, 100px)', background: '#fff', padding: 4 }}>
            <img src="/qrcode.png" alt="QR Code PIX" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          {/* Timer */}
          <div className="rounded-full flex items-center gap-1 px-2 py-0.5"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" style={{ width: 8, height: 8 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ color: '#60a5fa', fontSize: 'clamp(0.28rem, 0.65vw, 0.38rem)', fontWeight: 600 }}>
              Expira em: {mm}:{ss}
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center pb-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 'clamp(0.26rem, 0.6vw, 0.36rem)' }}>
        Pagamento processado com segurança via Banco Inter e BigCorps
        <br />
        <span style={{ color: 'rgba(255,255,255,0.12)' }}>minhAi — Uma IA pra chamar de sua!</span>
      </div>
    </div>
  )
}

// ── Orquestrador ─────────────────────────────────────────────────
type Screen = 'cards' | 'valor' | 'qr'

export default function SceneCobrancaLink() {
  const [screen, setScreen] = useState<Screen>('cards')
  const [visible, setVisible] = useState(true)

  const transition = (next: Screen) => {
    setVisible(false)
    setTimeout(() => {
      setScreen(next)
      setVisible(true)
    }, 250)
  }

  // Auto-demo: após 1.2 s clica no PIX, segue o fluxo
  useEffect(() => {
    const t1 = setTimeout(() => transition('valor'), 1200)
    return () => clearTimeout(t1)
  }, [])

  const handleConfirm = () => transition('qr')
  const handleBack = () => transition('cards')

  return (
    <div className="w-full h-full relative" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease' }}>
        {screen === 'cards' && <TelaCards onPixClick={() => transition('valor')} />}
        {screen === 'valor' && <TelaValor onConfirm={handleConfirm} onBack={handleBack} />}
        {screen === 'qr' && <TelaQR onBack={handleBack} />}
      </div>
    </div>
  )
}
