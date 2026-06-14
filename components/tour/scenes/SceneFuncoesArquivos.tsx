'use client'
// components/tour/scenes/SceneFuncoesArquivos.tsx

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Arquivos'
const CAT1_COLOR = '#06b6d4'
const CAT1_FUNCOES = [
  'Relatório de Arquivos', 'Remover Fundo', 'Converter Arquivos',
  'Duplicar Imagem', 'Editar Imagem', 'Juntar PDFs',
]

const CAT2_NOME = 'Câmera'
const CAT2_COLOR = '#84cc16'
const CAT2_FUNCOES = [
  'Ler QR Code', 'Ler Código de Barras', 'Identificar Fraude',
  'Imagem em Texto', 'Tabela em Texto', 'Contrato em Texto', 'Enviar Arquivo', 'Gerar QR Code',
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

// ─── Modal 1: Editar Imagem ──────────────────────────────────────────────────

function ModalEditarImagem() {
  const [phase, setPhase] = useState<'upload' | 'editing' | 'result'>('upload')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    setPhase('upload'); setBrightness(100); setContrast(100); setRotation(0)
    const t1 = setTimeout(() => setPhase('editing'), 1000)
    // Anima os sliders
    let b = 100, c = 100, r = 0
    const anim = setInterval(() => {
      b = Math.min(b + 3, 130); c = Math.min(c + 4, 150); r = Math.min(r + 9, 45)
      setBrightness(b); setContrast(c); setRotation(r)
      if (b >= 130 && c >= 150 && r >= 45) clearInterval(anim)
    }, 80)
    const t2 = setTimeout(() => { clearInterval(anim); setPhase('result') }, 3500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(anim) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>EDIT</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Editar Imagem</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Brilho · Contraste · Corte · Rotação</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', gap: 8, overflow: 'hidden' }}>
        {phase === 'upload' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: '100%', flex: 1, border: '2px dashed rgba(6,182,212,0.3)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(6,182,212,0.04)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', fontWeight: 600 }}>Clique ou arraste a imagem</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>JPG, PNG, WEBP</p>
            </div>
          </div>
        )}

        {phase === 'editing' && (
          <>
            {/* Preview da imagem */}
            <div style={{ flex: 1, borderRadius: 8, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: '80%', height: '80%', borderRadius: 6,
                background: `linear-gradient(135deg, #334155, #1e293b)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transform: `rotate(${rotation}deg)`,
                transition: 'all 100ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>foto.jpg</span>
              </div>
              {/* Grade de crop */}
              <div style={{ position: 'absolute', inset: '10%', border: '1px dashed rgba(6,182,212,0.5)', borderRadius: 4, pointerEvents: 'none' }} />
            </div>

            {/* Controles */}
            <div style={{ width: 'clamp(70px, 28%, 100px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Transformações */}
              <div style={{ padding: '5px 6px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transformar</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {['-90°', '+90°', 'Flip H', 'Flip V'].map(l => (
                    <div key={l} style={{ padding: '3px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Ajustes */}
              <div style={{ padding: '5px 6px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ajustes</p>
                {[
                  { label: 'Brilho', value: brightness, color: '#f59e0b' },
                  { label: 'Contraste', value: contrast, color: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)' }}>{s.label}</span>
                      <span style={{ color: s.color, fontWeight: 700, fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)' }}>{s.value}%</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${((s.value - 50) / 150) * 100}%`, background: s.color, borderRadius: 2, transition: 'width 100ms linear' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Botões */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ padding: '3px 6px', borderRadius: 6, background: '#0891b2', textAlign: 'center' }}>
                  <span style={{ color: 'white', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 700 }}>Salvar Edições</span>
                </div>
                <div style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>Reset</span>
                </div>
              </div>
            </div>
          </>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', fontWeight: 600 }}>Imagem editada com sucesso!</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>284 KB</span>
            </div>
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Arquivo: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>editada_1234.png</strong></p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '2px 0 0' }}>Formato: PNG</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Escaneie para baixar</p>
              <div style={{ background: 'white', padding: 4, borderRadius: 6, width: 'clamp(48px, 18%, 64px)', aspectRatio: '1/1' }}>
                <img src="/qrcode.png" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: '#0891b2', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Baixar</span>
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

// ─── Modal 2: Enviar Arquivo ─────────────────────────────────────────────────

function ModalEnviarArquivo() {
  const [phase, setPhase] = useState<'qr' | 'received'>('qr')
  const [timeLeft, setTimeLeft] = useState(600)

  useEffect(() => {
    setPhase('qr'); setTimeLeft(600)
    const countdown = setInterval(() => setTimeLeft(v => Math.max(v - 10, 0)), 100)
    const t = setTimeout(() => { setPhase('received'); clearInterval(countdown) }, 3200)
    return () => { clearTimeout(t); clearInterval(countdown) }
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>ARQ</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Enviar Arquivo</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Imagens · PDF · TXT · CSV · DOC</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' }}>
        {phase === 'qr' && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, width: '100%', flexShrink: 0 }}>
              {['Celular', 'Upload Local'].map((t, i) => (
                <div key={t} style={{ flex: 1, padding: '3px 6px', borderRadius: 7, background: i === 0 ? '#4f46e5' : 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <span style={{ color: i === 0 ? 'white' : 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', padding: 'clamp(5px, 1.5vw, 10px)', borderRadius: 10, width: 'clamp(70px, 35%, 100px)', aspectRatio: '1/1', flexShrink: 0 }}>
              <img src="/qrcode.png" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Expira em</span>
              <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{fmt(timeLeft)}</span>
            </div>
            <div style={{ width: '100%', height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ height: '100%', background: '#4f46e5', width: `${(timeLeft / 600) * 100}%`, transition: 'width 100ms linear', borderRadius: 1 }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0, textAlign: 'center' }}>
              Escaneie com o celular e envie o arquivo
            </p>
          </>
        )}

        {phase === 'received' && (
          <>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#34d399', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Arquivo recebido!</p>
            <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.38rem', color: '#818cf8', fontWeight: 700 }}>PDF</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>contrato-final.pdf</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>2,4 MB</p>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Fechando automaticamente...</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Modal 3: Identificar Fraude ─────────────────────────────────────────────

function ModalIdentificarFraude() {
  const [phase, setPhase] = useState<'input' | 'processing' | 'result'>('input')
  const [mode, setMode] = useState<'image' | 'url'>('url')
  const [url, setUrl] = useState('')
  const URL_TEXT = 'http://bancobradesc0.net/login'

  useEffect(() => {
    setPhase('input'); setMode('url'); setUrl('')
    let i = 0
    const typing = setInterval(() => {
      i++; setUrl(URL_TEXT.slice(0, i))
      if (i >= URL_TEXT.length) { clearInterval(typing); setTimeout(() => setPhase('processing'), 500) }
    }, 60)
    const t2 = setTimeout(() => setPhase('result'), URL_TEXT.length * 60 + 1400)
    return () => { clearInterval(typing); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>FRAUD</span>
        </div>
        <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Identificar Fraude</p>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase !== 'result' && (
          <>
            {/* Toggle */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {['Imagem / Boleto', 'Link / URL'].map((t, i) => (
                <div key={t} style={{ flex: 1, padding: '3px 6px', borderRadius: 7, background: (i === 0) === (mode === 'image') ? '#4f46e5' : 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <span style={{ color: (i === 0) === (mode === 'image') ? 'white' : 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'input' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Cole o link suspeito ou linha digitável:</p>
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>{url}<span style={{ opacity: 0.7 }}>|</span></span>
            </div>
            <div style={{ marginTop: 'auto', padding: '3px 8px', borderRadius: 6, background: '#4f46e5', textAlign: 'center' }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Analisar link</span>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Analisando o link...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
            {/* Semáforo FRAUDE */}
            <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)', lineHeight: 1 }}>🚨</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#ef4444', fontWeight: 800, fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)', margin: 0 }}>FRAUDE</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Phishing / Site Falso</p>
              </div>
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', margin: 0, textAlign: 'right' }}>92/100</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>score</p>
              </div>
            </div>
            {/* Barra de score */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '92%', background: '#ef4444', borderRadius: 3 }} />
              </div>
            </div>
            {/* Indícios */}
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Indícios</p>
              {['Domínio com erros tipográficos', 'Certificado SSL ausente', 'Simula portal bancário'].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                  <span style={{ color: '#ef4444', flexShrink: 0, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>•</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', lineHeight: 1.4 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: '#4f46e5', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Nova análise</span>
              </div>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Fechar</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 4: Analisar Planilha ──────────────────────────────────────────────

function ModalAnalisarPlanilha() {
  const [phase, setPhase] = useState<'upload' | 'processing' | 'dashboard'>('upload')
  const [kpis, setKpis] = useState([
    { label: 'Receita Total', value: 'R$ 48.900', color: '#22c55e' },
    { label: 'Ticket Médio', value: 'R$ 187,30', color: '#3b82f6' },
    { label: 'Conversão', value: '23,4%', color: '#f59e0b' },
    { label: 'Clientes', value: '261', color: '#8b5cf6' },
  ])
  const [barData] = useState([60, 85, 45, 90, 70, 55])

  useEffect(() => {
    setPhase('upload')
    const t1 = setTimeout(() => setPhase('processing'), 1000)
    const t2 = setTimeout(() => setPhase('dashboard'), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>DATA</span>
          </div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Relatório de Arquivos</p>
        </div>
        {phase === 'dashboard' && (
          <span style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 600, border: '1px solid rgba(34,197,94,0.25)' }}>✓ Pronto</span>
        )}
      </div>

      <div style={{ flex: 1, padding: '6px 10px', display: 'flex', gap: 8, overflow: 'hidden' }}>

        {/* Coluna esquerda — chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
          {phase === 'upload' && (
            <div style={{ flex: 1, border: '2px dashed rgba(59,130,246,0.3)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(59,130,246,0.04)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', fontWeight: 600 }}>Enviar arquivo</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', textAlign: 'center' }}>XLSX, CSV · PDF · DOCX · JPG, PNG</p>
            </div>
          )}

          {phase === 'processing' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { role: 'user', text: 'vendas-2025.xlsx' },
                { role: 'ai', text: 'Planilha lida: 261 linhas, 8 colunas. Iniciando análise...' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '80%', padding: '4px 7px', borderRadius: 8, background: m.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', lineHeight: 1.4 }}>{m.text}</div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ color: '#60a5fa', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Analisando...</span>
              </div>
            </div>
          )}

          {phase === 'dashboard' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
              {[
                { role: 'user', text: 'vendas-2025.xlsx' },
                { role: 'ai', text: 'Dashboard pronto! 4 KPIs e 1 gráfico de tendência gerados. Use os chips para refinar.' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '4px 7px', borderRadius: 8, background: m.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', lineHeight: 1.4 }}>{m.text}</div>
                </div>
              ))}
              {/* Chips */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {['Análise profunda', 'Novo gráfico', 'Mais insights'].map(c => (
                  <div key={c} style={{ padding: '2px 6px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>{c}</span>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div style={{ marginTop: 'auto', padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Mude gráfico 1 para linha...</span>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita — painel */}
        {(phase === 'processing' || phase === 'dashboard') && (
          <div style={{ width: 'clamp(80px, 38%, 120px)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {['KPIs', 'Gráficos', 'Insights'].map((t, i) => (
                <div key={t} style={{ flex: 1, padding: '2px 3px', borderRadius: 4, background: i === 0 ? '#2563eb' : 'rgba(255,255,255,0.06)', textAlign: 'center', borderBottom: i === 0 ? '2px solid #3b82f6' : '2px solid transparent' }}>
                  <span style={{ color: i === 0 ? 'white' : 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
            {/* KPIs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, opacity: phase === 'dashboard' ? 1 : 0.4, transition: 'opacity 500ms ease' }}>
              {kpis.map((k, i) => (
                <div key={k.label} style={{ padding: '4px 5px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${k.color}25` }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', margin: 0 }}>{k.label}</p>
                  <p style={{ color: k.color, fontWeight: 700, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: '1px 0 0' }}>{k.value}</p>
                </div>
              ))}
            </div>
            {/* Mini gráfico */}
            {phase === 'dashboard' && (
              <div style={{ flex: 1, padding: '5px 6px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', margin: '0 0 4px', fontWeight: 600 }}>Vendas por mês</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 'calc(100% - 14px)' }}>
                  {barData.map((v, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#3b82f6', height: `${v}%`, opacity: 0.7 + (i / barData.length) * 0.3 }} />
                  ))}
                </div>
              </div>
            )}
            {/* Botão exportar */}
            {phase === 'dashboard' && (
              <div style={{ padding: '3px 6px', borderRadius: 6, background: '#2563eb', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', fontWeight: 700 }}>Exportar PDF</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'editar',   component: ModalEditarImagem     },
  { key: 'enviar',   component: ModalEnviarArquivo    },
  { key: 'fraude',   component: ModalIdentificarFraude },
  { key: 'planilha', component: ModalAnalisarPlanilha  },
]

export default function SceneFuncoesArquivos() {
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
