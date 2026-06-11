'use client'
// components/tour/scenes/SceneFuncoesComercial.tsx
// Layout: carrossel acima | 4 modais em loop | carrossel abaixo

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Comercial'
const CAT1_COLOR = '#3b82f6'
const CAT1_FUNCOES = [
  'Modo Venda', 'Nossos Produtos', 'Fazer Pedido', 'Registrar Venda',
  'Cadastrar Produto', 'Gerar Cupom', 'Link na Bio', 'Enviar Email', 'Auxiliar Produção',
]

const CAT2_NOME = 'Financeiro'
const CAT2_COLOR = '#32bcad'
const CAT2_FUNCOES = [
  'Gerar PIX', 'TEF Crédito', 'TEF Débito', 'NFC/TAP Crédito', 'NFC/TAP Débito', 'Link de Pagamento',
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

  const doubled = [...names, ...names, ...names]
  const unit = unitWidth.current || 9999
  const shift = reverse ? (unit - (offset % unit)) : (offset % unit)

  return (
    <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <div ref={ref} className="flex items-center whitespace-nowrap" style={{ transform: `translateX(-${shift}px)`, transition: 'none', gap: 0 }}>
        {doubled.map((name, i) => (
          <span key={i} className="flex items-center flex-shrink-0">
            <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', padding: '0 clamp(6px, 1.5vw, 10px)' }}>
              {name}
            </span>
            <span style={{ color, opacity: 0.5, fontSize: 'clamp(0.5rem, 1.2vw, 0.65rem)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Modal 1: Registrar Venda ────────────────────────────────────────────────

function ModalRegistrarVenda() {
  const [pagamento, setPagamento] = useState('pix')
  const [vendaRapida, setVendaRapida] = useState(false)
  const [phase, setPhase] = useState<'form' | 'saving' | 'done'>('form')

  useEffect(() => {
    setPagamento('pix'); setVendaRapida(false); setPhase('form')
    const t1 = setTimeout(() => setPagamento('debito'), 1800)
    const t2 = setTimeout(() => setVendaRapida(true), 2800)
    const t3 = setTimeout(() => setPhase('saving'), 3400)
    const t4 = setTimeout(() => setPhase('done'), 4200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  const TIPOS = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix',      label: 'PIX'      },
    { value: 'debito',   label: 'Débito'   },
    { value: 'credito',  label: 'Crédito'  },
  ]

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.4rem', color: 'white', fontWeight: 700 }}>VENDA</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Registrar Venda</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Registro rápido</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase !== 'done' ? (
          <>
            {/* Produto */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '0 0 3px' }}>Produto ou Descrição</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>Café expresso duplo</span>
              </div>
            </div>
            {/* Valor */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '0 0 3px' }}>Valor *</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>R$</span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.45rem, 1.1vw, 0.58rem)' }}>12,50</span>
              </div>
            </div>
            {/* Pagamento */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '0 0 4px' }}>Forma de Pagamento</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {TIPOS.map(t => (
                  <div
                    key={t.value}
                    style={{
                      padding: '4px 3px', borderRadius: 6, textAlign: 'center',
                      border: `1px solid ${pagamento === t.value ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: pagamento === t.value ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                      transition: 'all 300ms ease',
                    }}
                  >
                    <span style={{ color: pagamento === t.value ? '#4ade80' : 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: pagamento === t.value ? 700 : 400 }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Toggle Venda Rápida */}
            <div style={{ padding: '5px 8px', borderRadius: 8, background: vendaRapida ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${vendaRapida ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 300ms ease', flexShrink: 0 }}>
              <div>
                <p style={{ color: vendaRapida ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', fontWeight: 600, margin: 0 }}>Venda Rápida</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{vendaRapida ? 'Registra direto como pago' : 'Vai abrir terminal TEF'}</p>
              </div>
              <div style={{ width: 28, height: 16, borderRadius: 8, background: vendaRapida ? '#f59e0b' : 'rgba(255,255,255,0.15)', transition: 'background 300ms ease', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: vendaRapida ? 14 : 2, transition: 'left 300ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
            {/* Botão */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 'auto' }}>
              <div style={{ flex: 1, padding: '4px', borderRadius: 7, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>Cancelar</span>
              </div>
              <div style={{ flex: 2, padding: '4px', borderRadius: 7, background: phase === 'saving' ? 'rgba(22,163,74,0.5)' : '#16a34a', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {phase === 'saving' && <div style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>{phase === 'saving' ? 'Salvando...' : 'Registrar Venda'}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#4ade80', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Venda registrada!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>R$ 12,50 · Débito</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Modal 2: Validar Cupom ──────────────────────────────────────────────────

function ModalValidarCupom() {
  const [phase, setPhase] = useState<'camera' | 'extracting' | 'validating' | 'result'>('camera')
  const [code, setCode] = useState('')
  const CODE = 'CAFE2024'

  useEffect(() => {
    setPhase('camera'); setCode('')
    const t1 = setTimeout(() => setPhase('extracting'), 1500)
    const t2 = setTimeout(() => { setPhase('validating'); setCode(CODE) }, 2600)
    const t3 = setTimeout(() => setPhase('result'), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>CUP</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Validar Cupom</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Fotografe o cupom ou voucher</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {phase === 'camera' && (
          <div style={{ width: '100%', flex: 1, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(245,158,11,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>📷</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0, textAlign: 'center' }}>Fotografe o cupom</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Celular','Webcam','Arquivo'].map(t => (
                <div key={t} style={{ padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'extracting' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Lendo o código do cupom...</p>
          </div>
        )}

        {phase === 'validating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'white', fontWeight: 700, fontFamily: 'monospace', fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)', letterSpacing: 2, margin: 0 }}>{code}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>Verificando no sistema...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <p style={{ color: 'white', fontWeight: 700, fontFamily: 'monospace', fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', letterSpacing: 2, margin: 0 }}>{CODE}</p>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <p style={{ color: '#4ade80', fontWeight: 600, fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>Cupom válido!</p>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 'clamp(0.65rem, 1.5vw, 0.85rem)', margin: 0 }}>10% de desconto</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>Usos: 3 / 50 · Sem expiração</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Novo cupom</span>
              </div>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: '#2563eb', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Enviar email</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 3: NFC Débito ─────────────────────────────────────────────────────

function ModalNfcDebito() {
  const [phase, setPhase] = useState<'generating' | 'awaiting' | 'confirmed'>('generating')

  useEffect(() => {
    setPhase('generating')
    const t1 = setTimeout(() => setPhase('awaiting'), 1000)
    const t2 = setTimeout(() => setPhase('confirmed'), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>NFC</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>NFC Débito</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>R$ 57,50 · InfinitePay</p>
          </div>
        </div>
        {phase === 'confirmed' && (
          <div style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span style={{ color: '#34d399', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Confirmado</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
        {phase === 'generating' && (
          <>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Gerando cobrança...</p>
          </>
        )}

        {phase === 'awaiting' && (
          <>
            <div style={{ padding: '5px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#4ade80', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Ouvindo... diga CONFIRMAR PAGAMENTO</span>
            </div>
            {/* Aviso NFC */}
            <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', width: '100%' }}>
              <p style={{ color: '#fbbf24', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0, lineHeight: 1.5 }}>
                Requer aparelho Android com NFC e app InfinitePay instalado.
              </p>
            </div>
            {/* Ícone central */}
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1.2rem)' }}>💳</span>
            </div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: 0 }}>App InfinitePay aberto!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, textAlign: 'center' }}>
              Aproxime o cartão de débito do cliente
            </p>
            <div style={{ width: '100%', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Reabrir app InfinitePay</span>
            </div>
            {/* Botão confirmar */}
            <div style={{ width: '100%', padding: '4px', borderRadius: 7, background: '#059669', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>Confirmar pagamento recebido</span>
            </div>
          </>
        )}

        {phase === 'confirmed' && (
          <>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Pagamento confirmado!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>R$ 57,50 · NFC Débito</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Fechando automaticamente...</p>
            <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#10b981', animation: 'shrink 3s linear forwards', borderRadius: 2 }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Modal 4: Link de Pagamento ──────────────────────────────────────────────

function ModalLinkPagamento() {
  const [phase, setPhase] = useState<'generating' | 'awaiting' | 'confirming' | 'confirmed'>('generating')

  useEffect(() => {
    setPhase('generating')
    const t1 = setTimeout(() => setPhase('awaiting'), 1000)
    const t2 = setTimeout(() => setPhase('confirming'), 3200)
    const t3 = setTimeout(() => setPhase('confirmed'), 4200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>LINK</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Link de Pagamento</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>R$ 89,90 · InfinitePay</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase === 'generating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Gerando cobrança...</p>
          </div>
        )}

        {(phase === 'awaiting' || phase === 'confirming') && (
          <>
            <div style={{ padding: '5px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#4ade80', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>Ouvindo... diga CONFIRMAR PAGAMENTO ou FECHAR</span>
            </div>
            {/* Aviso */}
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <p style={{ color: '#a78bfa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0, lineHeight: 1.5 }}>
                O cliente preenche o telefone na tela da InfinitePay para receber o código.
              </p>
            </div>
            {/* Link */}
            <div style={{ padding: '5px 8px', borderRadius: 7, background: '#7c3aed', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>Abrir link no browser</span>
            </div>
            <div style={{ padding: '3px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>minhai.app/pay/cafeexemplo</span>
            </div>
            {/* Confirmar */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', textAlign: 'center', margin: '0 0 4px' }}>Após o pagamento:</p>
              <div style={{ padding: '4px', borderRadius: 7, background: phase === 'confirming' ? 'rgba(5,150,105,0.5)' : '#059669', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {phase === 'confirming' && <div style={{ width: 8, height: 8, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>{phase === 'confirming' ? 'Verificando...' : 'Confirmar pagamento recebido'}</span>
              </div>
            </div>
          </>
        )}

        {phase === 'confirmed' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Pagamento confirmado!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>R$ 89,90 · Link InfinitePay</p>
            <div style={{ width: 'clamp(60px, 20%, 80px)', height: 3, borderRadius: 2, background: '#10b981', animation: 'shrink 3s linear forwards' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'venda',    component: ModalRegistrarVenda  },
  { key: 'cupom',    component: ModalValidarCupom    },
  { key: 'nfc',      component: ModalNfcDebito       },
  { key: 'link',     component: ModalLinkPagamento   },
]

export default function SceneFuncoesComercial() {
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
          <span className="font-bold" style={{ color: CAT1_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            {CAT1_NOME}
          </span>
        </div>
        <NamesCarousel names={CAT1_FUNCOES} color={CAT1_COLOR} reverse={false} />
      </div>

      {/* Modal em loop */}
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
          <span className="font-bold" style={{ color: CAT2_COLOR, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            {CAT2_NOME}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes shrink { from { width: 100% } to { width: 0% } }
      `}</style>
    </div>
  )
}
