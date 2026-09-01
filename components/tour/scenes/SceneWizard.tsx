'use client'
// components/tour/scenes/SceneWizard.tsx
// Simula o fluxo real do AssistantOnboarding em loop automático

import { useEffect, useRef, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const STEP_LABELS = ['Tipo', 'Nome', 'Segmento', 'Empresa', 'Tom', 'Regras', 'Revisão']
const TOTAL_STEPS = STEP_LABELS.length


// ── Paleta inline (sem Tailwind dinâmico) ─────────────────────
const C = {
  border:     'rgba(255,255,255,0.08)',
  bg0:        'rgba(255,255,255,0.04)',
  textMuted:  'rgba(255,255,255,0.35)',
  textSub:    'rgba(255,255,255,0.55)',
  textMain:   'rgba(255,255,255,0.85)',
  blue:       '#3b82f6',
  blueBg:     'rgba(59,130,246,0.12)',
  blueBorder: 'rgba(59,130,246,0.3)',
  green:      '#22c55e',
  greenBg:    'rgba(34,197,94,0.12)',
  greenBorder:'rgba(34,197,94,0.3)',
  purple:     '#a855f7',
  purpleBg:   'rgba(168,85,247,0.12)',
  purpleBrd:  'rgba(168,85,247,0.3)',
  lime:       '#84cc16',
}

// ── Helpers ────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
      {children}
    </p>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'clamp(0.46rem, 1.05vw, 0.6rem)', color: C.textMain, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
      {children}
    </p>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', color: C.textSub, lineHeight: 1.5, marginBottom: 8 }}>
      {children}
    </p>
  )
}

interface CardProps {
  selected?: boolean
  accent?: 'blue' | 'purple'
  children: React.ReactNode
  style?: React.CSSProperties
}
function Card({ selected, accent = 'blue', children, style }: CardProps) {
  const color  = accent === 'blue' ? C.blue   : C.purple
  const bg     = accent === 'blue' ? C.blueBg : C.purpleBg
  const border = accent === 'blue' ? C.blueBorder : C.purpleBrd
  return (
    <div style={{
      borderRadius: 8,
      padding: '6px 8px',
      border: `1.5px solid ${selected ? border : C.border}`,
      background: selected ? bg : C.bg0,
      transition: 'all 0.25s',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Pill({ children, color = C.blue, bg = C.blueBg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)',
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 99,
      background: bg,
      color,
      border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  )
}

function CheckDot({ color = C.blue }: { color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
    }}>
      <svg viewBox="0 0 10 10" width={6} height={6}><polyline points="2,5 4.5,7.5 8,3" stroke="white" strokeWidth={1.8} fill="none" strokeLinecap="round"/></svg>
    </span>
  )
}

function FakeInput({ value, placeholder }: { value?: string; placeholder: string }) {
  return (
    <div style={{
      borderRadius: 8,
      border: `2px solid ${value ? C.blueBorder : C.border}`,
      background: 'rgba(255,255,255,0.03)',
      padding: '5px 8px',
      fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)',
      color: value ? C.textMain : C.textMuted,
    }}>
      {value || placeholder}
    </div>
  )
}

// ── PHASE: Formulário inicial (create/page.tsx) ────────────────

function PhaseCreate() {
  const [nameVal,  setNameVal]  = useState(false)
  const [slugVal,  setSlugVal]  = useState(false)
  const [typeSet,  setTypeSet]  = useState(false)
  const [btnShow,  setBtnShow]  = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setTypeSet(true),  300)
    const t2 = setTimeout(() => setNameVal(true),  800)
    const t3 = setTimeout(() => setSlugVal(true),  1100)
    const t4 = setTimeout(() => setBtnShow(true),  1600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Tipo do assistente */}
      <div>
        <p style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Modelo do Assistente
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {/* Vendas */}
          <div style={{
            borderRadius: 8, padding: '6px 8px',
            border: `1.5px solid ${typeSet ? C.purpleBrd : C.border}`,
            background: typeSet ? C.purpleBg : C.bg0,
            transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke={typeSet ? C.purple : C.textMuted} strokeWidth={2} strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', fontWeight: 700, color: typeSet ? C.purple : C.textSub }}>minhAi Vendas</span>
            </div>
            <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>Sem mensalidade · 10% por venda</p>
          </div>
          {/* Smart */}
          <div style={{
            borderRadius: 8, padding: '6px 8px',
            border: `1.5px solid ${C.border}`,
            background: C.bg0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27z"/></svg>
              <span style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', fontWeight: 700, color: C.textSub }}>minhAi Smart</span>
            </div>
            <p style={{ fontSize: 'clamp(0.28rem, 0.63vw, 0.36rem)', color: C.textMuted }}>+100 funções · Pago por créditos</p>
          </div>
        </div>
      </div>

      {/* Nome + Slug */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <div>
          <p style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Nome do Assistente
          </p>
          <div style={{
            borderRadius: 7,
            border: `1.5px solid ${nameVal ? C.blueBorder : C.border}`,
            background: 'rgba(255,255,255,0.03)',
            padding: '4px 7px',
            fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)',
            color: nameVal ? C.textMain : C.textMuted,
            transition: 'border-color 0.3s, color 0.3s',
          }}>
            {nameVal ? 'Café Exemplo' : 'Ex: Café Exemplo...'}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Slug (URL)
          </p>
          <div style={{
            borderRadius: 7,
            border: `1.5px solid ${slugVal ? C.greenBorder : C.border}`,
            background: 'rgba(255,255,255,0.03)',
            padding: '4px 7px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
            transition: 'border-color 0.3s',
          }}>
            <span style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', color: slugVal ? C.textMain : C.textMuted, fontFamily: 'monospace', transition: 'color 0.3s' }}>
              {slugVal ? 'cafe-exemplo' : 'cafe-...'}
            </span>
            {slugVal && (
              <svg viewBox="0 0 10 10" width={8} height={8}><circle cx={5} cy={5} r={4.5} fill={C.green}/><polyline points="2.5,5 4.2,7 7.5,3" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>
            )}
          </div>
          {slugVal && (
            <p style={{ fontSize: 'clamp(0.24rem, 0.55vw, 0.31rem)', color: C.green, marginTop: 2 }}>
              minhai.app/ia/cafe-exemplo
            </p>
          )}
        </div>
      </div>

      {/* Visibilidade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        <div style={{
          borderRadius: 7, padding: '4px 7px',
          border: `1.5px solid ${C.greenBorder}`,
          background: C.greenBg,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg viewBox="0 0 24 24" width={8} height={8} fill="none" stroke={C.green} strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={10}/><line x1={2} y1={12} x2={22} y2={12}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', fontWeight: 700, color: C.green }}>Público</span>
        </div>
        <div style={{
          borderRadius: 7, padding: '4px 7px',
          border: `1.5px solid ${C.border}`,
          background: C.bg0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <svg viewBox="0 0 24 24" width={8} height={8} fill="none" stroke={C.textMuted} strokeWidth={2} strokeLinecap="round"><rect x={3} y={11} width={18} height={11} rx={2}/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', color: C.textMuted }}>Privado</span>
        </div>
      </div>

      {/* Botão CTA */}
      <div style={{
        borderRadius: 8,
        background: btnShow ? 'linear-gradient(90deg, #7c3aed, #3b82f6)' : C.bg0,
        border: `1.5px solid ${btnShow ? 'transparent' : C.border}`,
        padding: '6px 0',
        textAlign: 'center',
        fontSize: 'clamp(0.34rem, 0.78vw, 0.44rem)',
        fontWeight: 700,
        color: btnShow ? 'white' : C.textMuted,
        transition: 'all 0.4s',
      }}>
        {btnShow ? 'Criar com IA (Configuração Guiada)' : 'Preencha os campos acima...'}
      </div>
    </div>
  )
}

// ── STEP VIEWS (wizard novo/page.tsx) ──────────────────────────

function StepType() {
  return (
    <div>
      <Heading>Para que vai usar seu assistente?</Heading>
      <Sub>Você pode ter vários com propósitos diferentes.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Card selected accent="blue">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke={C.blue} strokeWidth={2} strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"/></svg>
              <span style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)', fontWeight: 700, color: C.blue }}>minhAi Smart</span>
            </div>
            <Pill>Mais completo</Pill>
          </div>
          <p style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', color: C.textSub }}>+100 funções · Pago por créditos · Totem, WhatsApp, PIX...</p>
        </Card>
        <Card accent="purple">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke={C.purple} strokeWidth={2} strokeLinecap="round"><path d="M6 2 3 6l9 14 9-14-3-4z"/><path d="M3 6h18M12 2l4 4H8z"/></svg>
              <span style={{ fontSize: 'clamp(0.4rem, 0.9vw, 0.52rem)', fontWeight: 700, color: C.textSub }}>minhAi Vendas</span>
            </div>
            <Pill color={C.purple} bg={C.purpleBg}>Sem mensalidade</Pill>
          </div>
          <p style={{ fontSize: 'clamp(0.33rem, 0.75vw, 0.42rem)', color: C.textSub }}>Gratuito · 10% comissão por venda confirmada</p>
        </Card>
      </div>
    </div>
  )
}

function StepName() {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 500); return () => clearTimeout(t) }, [])
  const suggestions = ['Alexa', 'Minha IA', 'Gerente', 'Assistente']
  return (
    <div>
      <Heading>Como vai se chamar seu assistente?</Heading>
      <Sub>O nome com que ele se apresenta aos clientes.</Sub>
      <FakeInput value={show ? 'Alexa' : undefined} placeholder="Ex: Alexa, Gerente, Assistente..." />
      {show && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => (
            <span key={s} style={{
              fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)', padding: '2px 7px', borderRadius: 99,
              border: `1px solid ${i === 0 ? C.blueBorder : C.border}`,
              background: i === 0 ? C.blueBg : 'transparent',
              color: i === 0 ? C.blue : C.textMuted,
              fontWeight: i === 0 ? 700 : 400,
            }}>{s}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const SEGMENTS = ['Restaurante', 'Clínica', 'Academia', 'Pet Shop', 'Advocacia', 'Farmácia', 'Salão', 'E-commerce', 'Loja física']

function StepSegment() {
  const [sel, setSel] = useState(-1)
  useEffect(() => {
    const t = setTimeout(() => setSel(0), 600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div>
      <Heading>O que melhor descreve seu negócio?</Heading>
      <Sub>Funções relevantes serão ativadas automaticamente.</Sub>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {SEGMENTS.map((s, i) => (
          <div key={s} style={{
            borderRadius: 7,
            border: `1.5px solid ${i === sel ? C.blueBorder : C.border}`,
            background: i === sel ? C.blueBg : C.bg0,
            padding: '4px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3,
            transition: 'all 0.25s',
          }}>
            <span style={{ fontSize: 'clamp(0.32rem, 0.72vw, 0.41rem)', color: i === sel ? C.blue : C.textSub, fontWeight: i === sel ? 700 : 400 }}>{s}</span>
            {i === sel && <CheckDot />}
          </div>
        ))}
      </div>
    </div>
  )
}

const QUESTIONS_PREVIEW = [
  { q: 'Nome da empresa?',      a: 'Café Exemplo' },
  { q: 'O que oferece?',        a: 'Café, lanches e brunch' },
  { q: 'Endereço?',             a: 'Pinheiros, São Paulo' },
]

function StepEmpresa() {
  const [qIdx, setQIdx] = useState(0)
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setTyping(true), 400)
    const t2 = setTimeout(() => { setTyping(false); setDone(true) }, 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [qIdx])

  useEffect(() => {
    if (!done) return
    if (qIdx >= QUESTIONS_PREVIEW.length - 1) return
    const t = setTimeout(() => { setQIdx(i => i + 1); setTyping(false); setDone(false) }, 200)
    return () => clearTimeout(t)
  }, [done, qIdx])

  const current = QUESTIONS_PREVIEW[qIdx]

  return (
    <div>
      <Heading>Conte sobre sua empresa</Heading>
      <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
        {QUESTIONS_PREVIEW.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < qIdx ? C.green : i === qIdx ? C.blue : C.border }} />
        ))}
      </div>
      <p style={{ fontSize: 'clamp(0.42rem, 0.95vw, 0.54rem)', color: C.textMain, fontWeight: 600, marginBottom: 5 }}>
        {current.q}
      </p>
      <FakeInput value={done ? current.a : typing ? current.a.slice(0, Math.ceil(current.a.length * 0.5)) : undefined} placeholder="Digite aqui..." />
      {qIdx > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {QUESTIONS_PREVIEW.slice(0, qIdx).map((p) => (
            <div key={p.q} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckDot color={C.green} />
              <span style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textSub }}><strong style={{ color: C.textMain }}>{p.a}</strong></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TONES = [
  { label: 'Formal e Profissional',    ex: '"Bom dia. Estou à disposição."' },
  { label: 'Amigável e Acolhedor',     ex: '"Olá! Tudo bem? Posso te ajudar?"' },
  { label: 'Descontraído e Divertido', ex: '"Ei! Que bom te ver! 😄"' },
]

function StepTom() {
  const [sel, setSel] = useState(-1)
  useEffect(() => { const t = setTimeout(() => setSel(1), 500); return () => clearTimeout(t) }, [])
  return (
    <div>
      <Heading>Como seu assistente vai se comunicar?</Heading>
      <Sub>Define a personalidade nas respostas.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TONES.map((t, i) => (
          <div key={t.label} style={{
            borderRadius: 8,
            border: `1.5px solid ${i === sel ? C.blueBorder : C.border}`,
            background: i === sel ? C.blueBg : C.bg0,
            padding: '5px 8px',
            transition: 'all 0.25s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 'clamp(0.38rem, 0.85vw, 0.48rem)', fontWeight: 700, color: i === sel ? C.blue : C.textSub }}>{t.label}</span>
              {i === sel && <Pill>Selecionado</Pill>}
            </div>
            <p style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMuted, fontStyle: 'italic' }}>{t.ex}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const RULES = [
  { label: 'Não falar sobre concorrentes' },
  { label: 'Não informar preços diretamente' },
]

function StepRegras() {
  const [checked, setChecked] = useState<number[]>([])
  useEffect(() => {
    const t1 = setTimeout(() => setChecked([0]), 400)
    const t2 = setTimeout(() => setChecked([0, 1]), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return (
    <div>
      <Heading>Alguma regra especial?</Heading>
      <Sub>Opcional — o que o assistente <em>não</em> deve fazer.</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        {RULES.map((r, i) => (
          <div key={r.label} style={{
            borderRadius: 8,
            border: `1.5px solid ${checked.includes(i) ? C.blueBorder : C.border}`,
            background: checked.includes(i) ? C.blueBg : C.bg0,
            padding: '5px 8px',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.25s',
          }}>
            <div style={{
              width: 11, height: 11, borderRadius: 3, border: `1.5px solid ${checked.includes(i) ? C.blue : C.border}`,
              background: checked.includes(i) ? C.blue : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {checked.includes(i) && <svg viewBox="0 0 10 10" width={7} height={7}><polyline points="2,5 4.5,7.5 8,3" stroke="white" strokeWidth={2} fill="none" strokeLinecap="round"/></svg>}
            </div>
            <span style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', color: checked.includes(i) ? C.textMain : C.textSub, fontWeight: checked.includes(i) ? 600 : 400 }}>{r.label}</span>
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg0, padding: '5px 8px' }}>
        <span style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMuted }}>Regra personalizada (opcional)</span>
      </div>
    </div>
  )
}

function StepRevisao() {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t) }, [])
  const items = [
    { label: 'Tipo',       value: 'minhAi Smart',        hi: false },
    { label: 'Nome',       value: 'Alexa',               hi: false },
    { label: 'Segmento',   value: 'Restaurante',         hi: false },
    { label: 'Empresa',    value: 'Café Exemplo',        hi: false },
    { label: 'Tom',        value: 'Amigável e Acolhedor',hi: false },
    { label: 'Funções',    value: '14 funções ativadas', hi: true  },
  ]
  return (
    <div>
      <Heading>Tudo pronto! Revise antes de criar.</Heading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((item, i) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            borderRadius: 8,
            border: `1px solid ${item.hi ? C.greenBorder : C.border}`,
            background: item.hi ? C.greenBg : C.bg0,
            padding: '4px 8px',
            opacity: show ? 1 : 0,
            transform: show ? 'none' : 'translateY(4px)',
            transition: `opacity 0.2s ${i * 60}ms, transform 0.2s ${i * 60}ms`,
          }}>
            <span style={{ fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', color: item.hi ? C.green : C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', width: '22%', flexShrink: 0 }}>{item.label}</span>
            <span style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', color: item.hi ? C.green : C.textMain, fontWeight: item.hi ? 700 : 500 }}>{item.value}</span>
          </div>
        ))}
      </div>
      {show && (
        <div style={{
          marginTop: 8,
          borderRadius: 9,
          background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
          padding: '6px 0',
          textAlign: 'center',
          fontSize: 'clamp(0.38rem, 0.88vw, 0.5rem)',
          fontWeight: 700,
          color: 'white',
        }}>
          Criar Assistente
        </div>
      )}
    </div>
  )
}

function StepConclusao() {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 200); return () => clearTimeout(t) }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 8 }}>
      {/* Ícone de check */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: C.greenBg,
        border: `2px solid ${C.greenBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.7)',
        transition: 'opacity 0.3s, transform 0.3s',
      }}>
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div style={{
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(4px)',
        transition: 'opacity 0.3s 0.1s, transform 0.3s 0.1s',
      }}>
        <p style={{ fontSize: 'clamp(0.52rem, 1.15vw, 0.68rem)', color: C.textMain, fontWeight: 700, marginBottom: 4 }}>
          Alexa está pronta!
        </p>
        <p style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', color: C.textSub, lineHeight: 1.5, marginBottom: 10 }}>
          Seu assistente foi criado e já está disponível para atender.
        </p>
        <div style={{
          background: C.bg0,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          padding: '4px 10px',
          display: 'inline-block',
          fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)',
          color: C.textMuted,
          fontFamily: 'monospace',
          letterSpacing: '0.03em',
        }}>
          minhai.app/ia/cafe-exemplo
        </div>
      </div>

      <div style={{
        width: '80%',
        borderRadius: 9,
        background: 'linear-gradient(90deg, #16a34a, #22c55e)',
        padding: '6px 0',
        textAlign: 'center',
        fontSize: 'clamp(0.32rem, 0.72vw, 0.42rem)',
        fontWeight: 700,
        color: 'white',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s 0.25s',
      }}>
        Ir para o Dashboard
      </div>
    </div>
  )
}

// Phase 0 = formulário create; phases 1–7 = wizard steps; phase 8 = conclusão
const PHASE_VIEWS = [PhaseCreate, StepType, StepName, StepSegment, StepEmpresa, StepTom, StepRegras, StepRevisao, StepConclusao]
const TOTAL_PHASES = PHASE_VIEWS.length
const PHASE_DURATIONS = [2800, 1800, 1600, 1600, 2000, 1800, 1600, 2000, 2200]

// ── Componente principal ───────────────────────────────────────
export default function SceneWizard() {
  const [phase, setPhase]   = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setFading(true)
      setTimeout(() => {
        setPhase(p => (p + 1) % TOTAL_PHASES)
        setFading(false)
      }, 200)
    }, PHASE_DURATIONS[phase])
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase])

  const PhaseView    = PHASE_VIEWS[phase]
  const isCreate     = phase === 0
  const isConclusao  = phase === TOTAL_PHASES - 1
  const isWizard     = !isCreate && !isConclusao
  // dentro do wizard: phase 1 = step 0, phase 7 = step 6
  const wizardStep   = isWizard ? phase - 1 : isConclusao ? TOTAL_STEPS : 0
  const progress     = isCreate ? 0 : isConclusao ? 100 : ((wizardStep + 1) / TOTAL_STEPS) * 100

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(15,23,42,0.8)', padding: '6px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCreate ? 0 : 4 }}>
          <span style={{ fontSize: 'clamp(0.36rem, 0.82vw, 0.46rem)', color: C.textSub, fontWeight: 600 }}>
            {isCreate ? 'Novo Assistente' : isConclusao ? 'Assistente criado' : 'Criar novo assistente'}
          </span>
          {isConclusao && (
            <span style={{
              fontSize: 'clamp(0.28rem, 0.65vw, 0.36rem)', fontWeight: 700,
              padding: '1px 7px', borderRadius: 99,
              background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`,
            }}>
              Concluído
            </span>
          )}
          {isWizard && (
            <span style={{ fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMuted }}>
              Passo {wizardStep + 1} de {TOTAL_STEPS}
            </span>
          )}
        </div>

        {/* Labels e barra de progresso — apenas no wizard e conclusão */}
        {!isCreate && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, marginTop: 4 }}>
              {STEP_LABELS.map((label, i) => (
                <span key={label} style={{
                  fontSize: 'clamp(0.24rem, 0.55vw, 0.31rem)',
                  color: isConclusao ? C.green : i < wizardStep ? C.green : i === wizardStep ? C.blue : C.textMuted,
                  fontWeight: isConclusao ? 600 : i === wizardStep ? 700 : i < wizardStep ? 600 : 400,
                  flex: 1, textAlign: 'center',
                }}>
                  {label}
                </span>
              ))}
            </div>
            <div style={{ height: 3, borderRadius: 99, background: C.border, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: isConclusao ? C.green : 'linear-gradient(90deg, #3b82f6, #a855f7)',
                borderRadius: 99,
                transition: 'width 0.4s ease, background 0.4s ease',
              }} />
            </div>
          </>
        )}
      </div>

      {/* Conteúdo da fase */}
      <div style={{
        flex: 1, overflow: 'hidden', padding: '8px 10px',
        opacity: fading ? 0 : 1,
        transform: fading ? 'translateY(3px)' : 'none',
        transition: 'opacity 0.2s, transform 0.2s',
      }}>
        <PhaseView />
      </div>

      {/* Footer nav — oculto na fase create e na conclusão */}
      {isWizard && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '5px 10px', display: 'flex', gap: 5, flexShrink: 0 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
            fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: C.textMuted, fontWeight: 500,
          }}>
            ← Voltar
          </div>
          <div style={{
            flex: 1, padding: '4px 0', borderRadius: 7,
            background: wizardStep === TOTAL_STEPS - 1
              ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
              : 'linear-gradient(90deg,#2563eb,#3b82f6)',
            textAlign: 'center',
            fontSize: 'clamp(0.3rem, 0.68vw, 0.38rem)', color: 'white', fontWeight: 700,
          }}>
            {wizardStep === TOTAL_STEPS - 1 ? 'Criar Assistente' : 'Continuar →'}
          </div>
        </div>
      )}
    </div>
  )
}
