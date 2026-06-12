'use client'
// components/tour/scenes/SceneFuncoesMidia.tsx

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Multimídia'
const CAT1_COLOR = '#ec4899'
const CAT1_FUNCOES = [
  'Tocar Música', 'Tocar Vídeo', 'Playlist', 'Sequência de Vídeos',
  'Painel de Ofertas', 'Porta Retrato', 'Vídeo de Instruções', 'Canal do YouTube', 'Vídeo Chamada',
]

const CAT2_NOME = 'Utilitários'
const CAT2_COLOR = '#f97316'
const CAT2_FUNCOES = [
  'Emitir Nota Fiscal', 'Criar Lembrete', 'Alarme', 'Cronômetro',
  'Temporizador', 'Lembrete de Remédios', 'Segunda Via Boleto', 'Criar Anotação', 'Relógio Mundial',
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

// ─── Modal 1: Tocar Vídeo (YouTube) ─────────────────────────────────────────

function ModalTocarVideo() {
  const [phase, setPhase] = useState<'searching' | 'playing'>('searching')
  const [headerVisible, setHeaderVisible] = useState(true)

  useEffect(() => {
    setPhase('searching'); setHeaderVisible(true)
    const t1 = setTimeout(() => setPhase('playing'), 1500)
    const t2 = setTimeout(() => setHeaderVisible(false), 3500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#000', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', overflow: 'hidden', position: 'relative' }}>
      {/* Header auto-hide */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
        padding: '8px 12px',
        opacity: headerVisible ? 1 : 0,
        transform: headerVisible ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'all 400ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Buscar...</span>
            <div style={{ marginLeft: 'auto', padding: '2px 6px', background: '#dc2626', borderRadius: 8 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 700 }}>Buscar</span>
            </div>
          </div>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>✕</span>
          </div>
        </div>
        {phase === 'playing' && (
          <div style={{ marginTop: 4, paddingLeft: 2 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Como fazer café espresso perfeito</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>Barista Pro Brasil</p>
          </div>
        )}
      </div>

      {/* Player */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        {phase === 'searching' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(239,68,68,0.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>Buscando vídeo...</p>
          </div>
        )}

        {phase === 'playing' && (
          <>
            {/* Thumbnail mockada */}
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {/* Ícone de play central */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '12px solid #111', marginLeft: 2 }} />
              </div>
              {/* Label YouTube mockado */}
              <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.7)' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 700 }}>YouTube</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Modal 2: Porta Retrato ──────────────────────────────────────────────────

const FOTO_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
]

function ModalPortaRetrato() {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setCurrent(v => (v + 1) % FOTO_GRADIENTS.length); setFade(true) }, 300)
    }, 1800)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    const t = setTimeout(() => setControlsVisible(true), 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#000', borderRadius: 12, border: '1px solid rgba(236,72,153,0.3)', overflow: 'hidden', position: 'relative' }}>
      {/* Foto */}
      <div style={{ flex: 1, background: FOTO_GRADIENTS[current], opacity: fade ? 1 : 0, transition: 'opacity 300ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.55rem, 1.3vw, 0.72rem)' }}>Foto {current + 1} / {FOTO_GRADIENTS.length}</span>
      </div>

      {/* Controles centrais */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        opacity: controlsVisible ? 1 : 0, transition: 'opacity 300ms ease',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 'clamp(0.4rem, 1vw, 0.55rem)' }}>‹</span>
        </div>
        <div
          onClick={() => setPlaying(p => !p)}
          style={{ width: 34, height: 34, borderRadius: '50%', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(236,72,153,0.5)' }}
        >
          {playing
            ? <span style={{ color: 'white', fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>⏸</span>
            : <span style={{ color: 'white', fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)', marginLeft: 2 }}>▶</span>
          }
        </div>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 'clamp(0.4rem, 1vw, 0.55rem)' }}>›</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', marginLeft: 4 }}>{current + 1} / {FOTO_GRADIENTS.length}</span>
      </div>

      {/* Barra de progresso */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#ec4899', width: `${((current + 1) / FOTO_GRADIENTS.length) * 100}%`, transition: 'width 300ms ease' }} />
      </div>

      {/* Hint de voz */}
      <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>pausar · próximo · fechar</span>
      </div>
    </div>
  )
}

// ─── Modal 3: Lembrete de Remédios ───────────────────────────────────────────

function ModalLembreteRemedios() {
  const [phase, setPhase] = useState<'form' | 'preview' | 'saved'>('form')
  const [interval, setIntervalVal] = useState('')
  const [hora, setHora] = useState('')

  useEffect(() => {
    setPhase('form'); setIntervalVal(''); setHora('')
    const t1 = setTimeout(() => { setIntervalVal('8'); setHora('08:00') }, 1200)
    const t2 = setTimeout(() => setPhase('preview'), 2400)
    const t3 = setTimeout(() => setPhase('saved'), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(251,146,60,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(251,146,60,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>REM</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Lembrete de Remédios</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Configure os horários do tratamento</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase !== 'saved' ? (
          <>
            {/* Ouvindo */}
            <div style={{ padding: '4px 8px', borderRadius: 20, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fb923c', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#fb923c', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Ouvindo... diga "salvar" para confirmar</span>
            </div>
            {/* Nome */}
            <div style={{ flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Nome do Remédio *</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,146,60,0.4)' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>Amoxicilina 500mg</span>
              </div>
            </div>
            {/* Intervalo + Horário */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flexShrink: 0 }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Intervalo (h) *</p>
                <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${interval ? 'rgba(251,146,60,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>{interval || '—'}</span>
                </div>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>1ª Dose *</p>
                <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${hora ? 'rgba(251,146,60,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>{hora || '—'}</span>
                </div>
              </div>
            </div>
            {/* Duração */}
            <div style={{ flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: '0 0 3px' }}>Duração</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {['Total de dias', 'Qtd. comprimidos'].map((t, i) => (
                  <div key={t} style={{ padding: '3px 6px', borderRadius: 7, background: i === 0 ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(251,146,60,0.4)' : 'rgba(255,255,255,0.1)'}`, textAlign: 'center' }}>
                    <span style={{ color: i === 0 ? '#fb923c' : 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: i === 0 ? 600 : 400 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview calculado */}
            {phase === 'preview' && interval && hora && (
              <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumo do tratamento</p>
                {[
                  ['Horários diários', '08:00, 16:00, 00:00'],
                  ['Doses por dia', '3x'],
                  ['Duração', '7 dias'],
                  ['Total de doses', '21 comprimidos'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{l}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'auto', padding: '3px 8px', borderRadius: 6, background: '#ea580c', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Salvar Lembrete</span>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#4ade80', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Lembretes salvos!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, textAlign: 'center' }}>Amoxicilina 500mg · 08:00, 16:00, 00:00</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 4: Segunda Via Boleto ─────────────────────────────────────────────

function ModalSegundaViaBoleto() {
  const [tab, setTab] = useState<'digitar' | 'celular'>('digitar')
  const [phase, setPhase] = useState<'input' | 'processing' | 'result'>('input')
  const [linha, setLinha] = useState('')
  const LINHA = '00190.00009 02699.505043 00237.801029 5 93270000026990'

  useEffect(() => {
    setTab('digitar'); setPhase('input'); setLinha('')
    let i = 0
    const typing = setInterval(() => {
      i++; setLinha(LINHA.slice(0, i))
      if (i >= LINHA.length) { clearInterval(typing); setTimeout(() => setPhase('processing'), 400) }
    }, 45)
    const t2 = setTimeout(() => setPhase('result'), LINHA.length * 45 + 1200)
    return () => { clearInterval(typing); clearTimeout(t2) }
  }, [])

  const digits = linha.replace(/\D/g, '').length

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>BOL</span>
        </div>
        <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Segunda Via de Boleto</p>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {['digitar', 'celular'].map((t, i) => (
            <div key={t} style={{ flex: 1, padding: '3px 6px', borderRadius: 7, background: tab === t ? '#4f46e5' : 'rgba(255,255,255,0.06)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: tab === t ? 'white' : 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>{i === 0 ? 'Digitar' : 'Celular'}</span>
            </div>
          ))}
        </div>

        {phase === 'input' && (
          <>
            <div style={{ padding: '4px 8px', borderRadius: 7, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', flexShrink: 0 }}>
              <span style={{ color: '#fbbf24', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Digite a linha digitável do boleto (47 ou 48 números)</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0, fontWeight: 600 }}>Linha Digitável</p>
              <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.4)', flex: 1, display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', lineHeight: 1.6, wordBreak: 'break-all' }}>{linha}<span style={{ opacity: 0.6 }}>|</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)' }}>{digits} dígitos{digits > 0 && digits < 47 ? ` (faltam ${47 - digits})` : ''}{digits >= 47 ? ' ✓' : ''}</span>
              </div>
            </div>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: digits >= 47 ? '#4f46e5' : 'rgba(255,255,255,0.08)', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ color: digits >= 47 ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Gerar Segunda Via</span>
            </div>
          </>
        )}

        {phase === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Gerando segunda via...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
            <div style={{ padding: '4px 8px', borderRadius: 7, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)' }}>Segunda via gerada!</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>Banco do Brasil (001)</span>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              {[
                ['Valor', 'R$ 269,90'],
                ['Vencimento', '30/06/2025'],
                ['Banco', 'Banco do Brasil (001)'],
                ['Moeda', 'Real (R$)'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{l}</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <div style={{ flex: 2, padding: '3px 6px', borderRadius: 6, background: '#4f46e5', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Baixar PDF</span>
              </div>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Novo</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'video',    component: ModalTocarVideo         },
  { key: 'porta',    component: ModalPortaRetrato       },
  { key: 'remedio',  component: ModalLembreteRemedios   },
  { key: 'boleto',   component: ModalSegundaViaBoleto   },
]

export default function SceneFuncoesMidia() {
  const [activeModal, setActiveModal] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveModal(v => (v + 1) % MODALS.length), 5500)
    return () => clearInterval(t)
  }, [])

  const Modal = MODALS[activeModal].component

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG }}>
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
