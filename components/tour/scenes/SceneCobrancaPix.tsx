'use client'
// components/tour/scenes/SceneCobrancaPix.tsx
// Mock fiel ao PIXConfirmationModal real — vertical, com auto-check e confirmação manual

import { useEffect, useState } from 'react'

// ─── Fases da animação ────────────────────────────────────────────────────
// generating → qr (modal aparece) → autocheck (spinner lateral) → confirmed (verde)
// A qualquer momento entre qr e autocheck o "usuário" pode clicar em Confirmar
type Phase = 'generating' | 'qr' | 'autocheck' | 'confirmed'

const AMOUNT  = 'R$ 89,90'
const PIX_KEY = '00020126580014br.gov.bcb.pix0136cafe@exemplo.com.br...'
const COMPANY = 'Café Exemplo'

// Ícones inline
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const IcoBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

// ─── InfoRow ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{
        fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 10, color: highlight ? '#fbbf24' : 'rgba(255,255,255,0.8)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── VoiceButton ─────────────────────────────────────────────────────────
function VoiceButton({
  color,
  label,
  loading,
  disabled,
  confirmed: done,
  onClick,
}: {
  color: 'green' | 'red'
  label: string
  loading?: boolean
  disabled?: boolean
  confirmed?: boolean
  onClick?: () => void
}) {
  const bg = done
    ? '#15803d'
    : color === 'green'
    ? 'rgba(22,163,74,0.9)'
    : 'rgba(220,38,38,0.9)'

  return (
    <div
      onClick={!disabled && !done ? onClick : undefined}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 6px', borderRadius: 8, cursor: disabled || done ? 'default' : 'pointer',
        background: bg,
        opacity: disabled && !done ? 0.5 : 1,
        transition: 'background 300ms ease',
      }}
    >
      {loading ? (
        <div style={{
          width: 12, height: 12,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff', borderRadius: '50%',
          animation: 'pix-spin 0.7s linear infinite',
        }} />
      ) : (
        <div style={{ width: 12, height: 12, color: '#fff' }}>
          {done ? <IcoCheck /> : color === 'green' ? <IcoCheck /> : <IcoX />}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)' }}>Diga:</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>
          {done ? 'Confirmado!' : label}
        </span>
        {!done && <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.45)' }}>ou clique aqui</span>}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'warning' }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      zIndex: 60, display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 20,
      background: type === 'success' ? '#16a34a' : '#d97706',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ width: 12, height: 12, color: '#fff' }}>
        {type === 'success' ? <IcoCheck /> : <IcoBolt />}
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{message}</span>
    </div>
  )
}

// ─── Gerador (spinner antes do modal) ────────────────────────────────────
function GeneratingOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, background: '#020617',
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(96,165,250,0.2)',
        borderTopColor: '#60a5fa', borderRadius: '50%',
        animation: 'pix-spin 0.9s linear infinite',
      }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Gerando QR Code PIX...</span>
    </div>
  )
}

// ─── Modal PIX (fiel ao PIXConfirmationModal real) ────────────────────────
function PixModal({
  phase,
  onClickConfirm,
}: {
  phase: Phase
  onClickConfirm: () => void
}) {
  const isConfirmed = phase === 'confirmed'
  const isChecking  = phase === 'autocheck'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      padding: 10,
      zIndex: 10,
    }}>
      {/* ── Toast de auto-confirmação ── */}
      {isConfirmed && <Toast message="✅ Pagamento confirmado!" type="success" />}
      {isChecking  && <Toast message="Verificando pagamento..." type="warning" />}

      {/* ── Card ── */}
      <div style={{
        width: 240,
        background: '#0f172a',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px',
          background: 'rgba(29,78,216,0.25)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(96,165,250,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#60a5fa',
            }}>
              <div style={{ width: 10, height: 10 }}><IcoBolt /></div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Gerar PIX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
              background: 'rgba(59,130,246,0.2)', color: '#93c5fd',
            }}>
              {COMPANY}
            </span>
            <div style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)' }}><IcoX /></div>
          </div>
        </div>

        {/* Valor */}
        <div style={{
          padding: '10px 14px 8px',
          background: 'rgba(29,78,216,0.15)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{ fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>
            Valor a Pagar
          </p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#60a5fa', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {AMOUNT}
          </p>
        </div>

        {/* QR Code */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 96, height: 96,
            background: isConfirmed ? 'rgba(22,163,74,0.15)' : '#fff',
            borderRadius: 10, padding: isConfirmed ? 0 : 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: isConfirmed ? '1px solid rgba(22,163,74,0.4)' : 'none',
            transition: 'background 400ms ease',
            position: 'relative', overflow: 'hidden',
          }}>
            {isConfirmed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, color: '#4ade80' }}><IcoCheck /></div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#4ade80' }}>Pago!</span>
              </div>
            ) : (
              <img src="/qrcode.png" alt="QR Code PIX"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
              />
            )}
            {/* Overlay de cópia */}
            {copied && !isConfirmed && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(22,163,74,0.92)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, borderRadius: 10,
              }}>
                <div style={{ width: 20, height: 20, color: '#fff' }}><IcoCheck /></div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>Copiado!</span>
              </div>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div style={{
          padding: '8px 14px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <InfoRow label="Empresa" value="Intermediações BigCorps" />
          <InfoRow label="Para"    value={COMPANY} />
          <InfoRow label="Banco"   value="Banco Inter" />
          <InfoRow label="Validade" value="Válido 30 min" highlight />
        </div>

        {/* Código PIX + copiar */}
        <div style={{
          padding: '7px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6,
            padding: '4px 7px', fontSize: 7.5, color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {PIX_KEY}
          </div>
          <div
            onClick={handleCopy}
            style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              background: copied ? '#16a34a' : '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 250ms ease',
              color: '#fff',
            }}
          >
            <div style={{ width: 11, height: 11 }}>
              {copied ? <IcoCheck /> : <IcoCopy />}
            </div>
          </div>
        </div>

        {/* Auto-check indicator */}
        {isChecking && (
          <div style={{
            padding: '5px 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(245,158,11,0.06)',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 10, height: 10, flexShrink: 0,
              border: '1.5px solid rgba(251,191,36,0.3)',
              borderTopColor: '#fbbf24', borderRadius: '50%',
              animation: 'pix-spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>
              Verificando pagamento automaticamente...
            </span>
          </div>
        )}

        {/* Botões */}
        <div style={{ padding: '8px 10px 10px', display: 'flex', gap: 6 }}>
          <VoiceButton
            color="green"
            label="CONFIRMAR PIX"
            disabled={isConfirmed}
            confirmed={isConfirmed}
            onClick={onClickConfirm}
          />
          <VoiceButton
            color="red"
            label="CANCELAR PIX"
            disabled={isConfirmed}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function SceneCobrancaPix() {
  const [phase, setPhase] = useState<Phase>('generating')
  const [manualConfirm, setManualConfirm] = useState(false)

  // Linha do tempo automática
  useEffect(() => {
    // 0.8s → aparece o modal com QR
    const t1 = setTimeout(() => setPhase('qr'), 800)

    // 3.5s → começa auto-check (spinner + toast)
    const t2 = setTimeout(() => {
      setPhase(prev => prev === 'qr' ? 'autocheck' : prev)
    }, 3500)

    // 6s → confirma automaticamente (se o usuário não clicou antes)
    const t3 = setTimeout(() => {
      setPhase(prev => (prev === 'autocheck' || prev === 'qr') ? 'confirmed' : prev)
    }, 6000)

    // 9.5s → reseta para loop
    const t4 = setTimeout(() => {
      setPhase('generating')
      setManualConfirm(false)
    }, 9500)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [manualConfirm]) // re-roda quando reinicia

  const handleManualConfirm = () => {
    if (phase === 'confirmed') return
    setManualConfirm(true)
    setPhase('confirmed')
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)',
      borderRadius: 16, overflow: 'hidden',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {phase === 'generating' && <GeneratingOverlay />}
      {phase !== 'generating' && (
        <PixModal phase={phase} onClickConfirm={handleManualConfirm} />
      )}

      <style>{`
        @keyframes pix-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
