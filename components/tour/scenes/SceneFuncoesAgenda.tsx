'use client'
// components/tour/scenes/SceneFuncoesAgenda.tsx

import { useEffect, useState, useRef } from 'react'

const CAT1_NOME = 'Agendamento'
const CAT1_COLOR = '#10b981'
const CAT1_FUNCOES = [
  'Marcar Evento', 'Ver Agenda', 'Reagendamento', 'Cancelar Agendamento',
  'Confirmar Presença', 'Horários Disponíveis',
]

const CAT2_NOME = 'Identificação'
const CAT2_COLOR = '#a855f7'
const CAT2_FUNCOES = [
  'Fazer Login', 'Novo Cadastro', 'Gerar Senha', 'Modo Fila',
  'Pré-Atendimento', 'Pesquisas e Avaliações',
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

// ─── Modal 1: Ver Agenda ─────────────────────────────────────────────────────

const AGENDA_EVENTS = [
  { title: 'Reunião de equipe',    time: '09:00', end: '10:00', day: 3,  color: '#3b82f6' },
  { title: 'Consulta Dr. Silva',   time: '11:30', end: '12:00', day: 5,  color: '#10b981' },
  { title: 'Entrega do projeto',   time: '14:00', end: '15:30', day: 8,  color: '#f59e0b' },
  { title: 'Revisão mensal',       time: '16:00', end: '17:00', day: 12, color: '#8b5cf6' },
  { title: 'Workshop de vendas',   time: '09:00', end: '12:00', day: 15, color: '#ef4444' },
  { title: 'Almoço com cliente',   time: '12:30', end: '13:30', day: 18, color: '#06b6d4' },
]

function ModalVerAgenda() {
  const [view, setView] = useState<'month' | 'day'>('month')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    setView('month'); setSelectedDay(null)
    const t1 = setTimeout(() => setSelectedDay(8), 2000)
    const t2 = setTimeout(() => setView('day'), 2800)
    const t3 = setTimeout(() => { setView('month'); setSelectedDay(null) }, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const todayEvents = AGENDA_EVENTS.filter(e => e.day === (selectedDay ?? 8))

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.4rem', color: 'white', fontWeight: 700 }}>CAL</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Minha Agenda</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>6 eventos encontrados</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['month','day'] as const).map(v => (
            <div key={v} style={{ padding: '2px 6px', borderRadius: 5, background: view === v ? '#2563eb' : 'rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 300ms ease' }}>
              <span style={{ color: view === v ? 'white' : 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>{v === 'month' ? 'Mês' : 'Dia'}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '6px 10px' }}>
        {view === 'month' && (
          <>
            {/* Dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>{d}</div>
              ))}
            </div>
            {/* Grid de dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {days.map(d => {
                const evts = AGENDA_EVENTS.filter(e => e.day === d)
                const isSelected = d === selectedDay
                return (
                  <div key={d} style={{ aspectRatio: '1/1', borderRadius: 4, background: isSelected ? 'rgba(59,130,246,0.3)' : evts.length ? 'rgba(255,255,255,0.04)' : 'transparent', border: isSelected ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 300ms ease', position: 'relative', padding: 1 }}>
                    <span style={{ color: isSelected ? '#60a5fa' : 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: isSelected ? 700 : 400 }}>{d}</span>
                    {evts.length > 0 && (
                      <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                        {evts.slice(0, 2).map((e, i) => (
                          <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: e.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {view === 'day' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, fontWeight: 600 }}>Dia 8 — Terça-feira</p>
            {todayEvents.length > 0 ? todayEvents.map((e, i) => (
              <div key={i} style={{ padding: '5px 8px', borderRadius: 7, background: `${e.color}15`, border: `1px solid ${e.color}35`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 24, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>{e.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{e.time} – {e.end}</p>
                </div>
              </div>
            )) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', textAlign: 'center', marginTop: 16 }}>Sem eventos</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 2: Confirmar Presença ─────────────────────────────────────────────

function ModalConfirmarPresenca() {
  const [phase, setPhase] = useState<'search' | 'loading' | 'select' | 'confirmed'>('search')

  useEffect(() => {
    setPhase('search')
    const t1 = setTimeout(() => setPhase('loading'), 1400)
    const t2 = setTimeout(() => setPhase('select'), 2400)
    const t3 = setTimeout(() => setPhase('confirmed'), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>PRES</span>
        </div>
        <div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Confirmar Presença</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>Confirme seu agendamento</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {phase === 'search' && (
          <>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '0 0 3px' }}>Data *</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(16,185,129,0.4)' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', fontWeight: 600 }}>08/06/2025</span>
              </div>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: '0 0 3px' }}>Horário (opcional)</p>
              <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)' }}>14:00</span>
              </div>
            </div>
            <div style={{ marginTop: 'auto', padding: '4px', borderRadius: 7, background: '#059669', textAlign: 'center' }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>Buscar Agendamento</span>
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Buscando...</p>
          </div>
        )}

        {phase === 'select' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
            <div style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: 0 }}>Entrega do projeto</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: '2px 0 0' }}>08 de junho · 14:00</p>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              <div style={{ flex: 1, padding: '3px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 600 }}>Voltar</span>
              </div>
              <div style={{ flex: 2, padding: '3px 6px', borderRadius: 6, background: '#059669', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700 }}>Confirmar Presença</span>
              </div>
            </div>
          </div>
        )}

        {phase === 'confirmed' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#34d399', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Presença Confirmada!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0, textAlign: 'center' }}>Entrega do projeto · 08/06 · 14:00</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 3: Gerar Senha ────────────────────────────────────────────────────

function ModalGerarSenha() {
  const [phase, setPhase] = useState<'generating' | 'result'>('generating')

  useEffect(() => {
    setPhase('generating')
    const t = setTimeout(() => setPhase('result'), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(0,0,128,0.5)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#000080', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>FILA</span>
          </div>
          <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Sua Senha da Fila</p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', overflow: 'hidden' }}>
        {phase === 'generating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid rgba(0,0,128,0.3)', borderTopColor: '#4040ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)', margin: 0 }}>Gerando senha...</p>
          </div>
        )}

        {phase === 'result' && (
          <div style={{ flex: 1, display: 'flex', gap: 10, overflow: 'hidden' }}>
            {/* Esquerda */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Senha */}
              <div style={{ padding: '16px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(0,0,128,0.5)', textAlign: 'center' }}>
                <p style={{ color: '#6060ff', fontWeight: 800, fontSize: 'clamp(1.2rem, 3.5vw, 2rem)', margin: 0, letterSpacing: 2 }}>A042</p>
              </div>
              {/* Infos */}
              {[
                ['Posição na fila', '3ª na fila'],
                ['Tempo estimado', '15 minutos'],
                ['Última chamada', 'A039'],
              ].map(([l, v]) => (
                <div key={l} style={{ padding: '4px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{l}</span>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                <div style={{ flex: 1, padding: '3px 4px', borderRadius: 6, border: '1px solid rgba(0,0,128,0.4)', textAlign: 'center' }}>
                  <span style={{ color: '#6060ff', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>Atualizar</span>
                </div>
                <div style={{ flex: 1, padding: '3px 4px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', textAlign: 'center' }}>
                  <span style={{ color: '#ef4444', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', fontWeight: 600 }}>Cancelar</span>
                </div>
              </div>
            </div>
            {/* Direita — QR */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, width: 'clamp(50px, 25%, 70px)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', textAlign: 'center', margin: 0 }}>Acompanhar</p>
              <div style={{ background: 'white', padding: 4, borderRadius: 6, width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/qrcode.png" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '3px 6px', borderRadius: 5, background: '#000080', textAlign: 'center', width: '100%' }}>
                <span style={{ color: 'white', fontSize: 'clamp(0.22rem, 0.55vw, 0.3rem)', fontWeight: 600 }}>Abrir</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal 4: Cadastro ───────────────────────────────────────────────────────

function ModalCadastro() {
  const [field, setField] = useState(0)
  const [values, setValues] = useState<string[]>(['', '', ''])
  const [phase, setPhase] = useState<'collecting' | 'confirming' | 'success'>('collecting')

  const FIELDS = [
    { label: 'Nome', question: 'Qual o seu nome?', value: 'Maria Silva' },
    { label: 'Telefone', question: 'Qual o telefone?', value: '(11) 98765-4321' },
    { label: 'E-mail', question: 'Qual o e-mail?', value: 'maria@email.com' },
  ]

  useEffect(() => {
    setField(0); setValues(['', '', '']); setPhase('collecting')
    let step = 0
    const advance = () => {
      step++
      if (step < FIELDS.length) {
        setValues(v => { const n = [...v]; n[step - 1] = FIELDS[step - 1].value; return n })
        setField(step)
        setTimeout(advance, 900)
      } else {
        setValues(FIELDS.map(f => f.value))
        setTimeout(() => setPhase('confirming'), 900)
        setTimeout(() => setPhase('success'), 2400)
      }
    }
    const t = setTimeout(advance, 900)
    return () => clearTimeout(t)
  }, [])

  const progress = (field / FIELDS.length) * 100

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#0f172a', borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.38rem', color: 'white', fontWeight: 700 }}>CAD</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', fontWeight: 700, margin: 0 }}>Cadastro</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0 }}>
              {phase === 'collecting' ? `Campo ${field + 1} de ${FIELDS.length}` : phase === 'confirming' ? 'Confirme os dados' : 'Cadastro realizado'}
            </p>
          </div>
        </div>
        {phase === 'collecting' && (
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(59,130,246,0.2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 500ms ease' }} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {phase === 'collecting' && (
          <>
            <div style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', margin: 0 }}>Ouvindo</p>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 'clamp(0.38rem, 0.9vw, 0.5rem)', margin: '2px 0 0' }}>{FIELDS[field].question}</p>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {FIELDS.map((f, i) => (
                <div key={f.label} style={{ padding: '4px 8px', borderRadius: 7, background: i === field ? 'rgba(59,130,246,0.1)' : values[i] ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === field ? 'rgba(59,130,246,0.4)' : values[i] ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 300ms ease' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: values[i] ? '#10b981' : i === field ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {values[i] && <span style={{ color: 'white', fontSize: '0.35rem', fontWeight: 700 }}>✓</span>}
                    {!values[i] && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.28rem', fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.25rem, 0.6vw, 0.32rem)', margin: 0 }}>{f.label}</p>
                    {values[i] && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', margin: 0, fontWeight: 600 }}>{values[i]}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'confirming' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>Confirme os dados:</p>
            {FIELDS.map((f, i) => (
              <div key={f.label} style={{ padding: '4px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)' }}>{f.label}</span>
                <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 600 }}>{values[i]}</span>
              </div>
            ))}
            <div style={{ marginTop: 'auto', padding: '4px', borderRadius: 7, background: '#2563eb', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: 'white', fontSize: 'clamp(0.3rem, 0.7vw, 0.38rem)', fontWeight: 700 }}>Confirmar e Salvar</span>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#34d399', fontSize: 'clamp(0.75rem, 2vw, 1rem)', fontWeight: 700 }}>✓</span>
            </div>
            <p style={{ color: '#34d399', fontWeight: 700, fontSize: 'clamp(0.42rem, 1vw, 0.55rem)', margin: 0 }}>Cadastro Realizado!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)', margin: 0 }}>Dados salvos com sucesso.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const MODALS = [
  { key: 'agenda',   component: ModalVerAgenda          },
  { key: 'presenca', component: ModalConfirmarPresenca  },
  { key: 'senha',    component: ModalGerarSenha         },
  { key: 'cadastro', component: ModalCadastro           },
]

export default function SceneFuncoesAgenda() {
  const [activeModal, setActiveModal] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveModal(v => (v + 1) % MODALS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const Modal = MODALS[activeModal].component

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ background: BG, maxWidth: 320, margin: '0 auto' }}>
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
        <div className="flex-1 min-h-0" key={activeModal} style={{ animation: 'fadeIn 300ms ease', maxWidth: 240, width: '100%', margin: '0 auto' }}>
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
      `}</style>
    </div>
  )
}
