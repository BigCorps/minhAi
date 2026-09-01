'use client'
// components/tour/scenes/SceneAgenda.tsx
// Gestor de Agenda — padrão visual unificado com GestorAgendaDisplay
// Cicla: agendamento (chat + painel) → confirmar_data (calendário + slots) → pagamento (QR → confirmado)

import { useEffect, useState, useRef } from 'react'
import {
  Calendar, Send, Mic,
  Zap, Smartphone, CreditCard, Banknote, ExternalLink,
  ChevronLeft, ChevronRight, Check, Mail,
} from 'lucide-react'

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BG_SEC    = '#1e293b'
const BG_SEC2   = '#334155'
const BG_CHAT   = '#0f172a'
const TXT       = '#f1f5f9'
const TXT_MUTED = '#94a3b8'
const BORDER    = '#475569'
const ACCENT    = '#10b981'
const ACCENT_B  = '#3b82f6'
const USER_BUB  = '#10b981'
const BOT_BUB   = '#334155'

type Step = 'agendamento' | 'confirmar_data' | 'pagamento'
const STEPS: Step[] = ['agendamento', 'confirmar_data', 'pagamento']

interface Msg { from: 'user' | 'bot'; text: string }
const MSGS: Msg[] = [
  { from: 'user', text: 'Quero agendar um corte de cabelo' },
  { from: 'bot',  text: 'Ótimo! Temos "Corte Masculino" por R$ 45,00. Qual data prefere?' },
  { from: 'user', text: 'Amanhã às 14h' },
  { from: 'bot',  text: 'Perfeito! Vou confirmar o horário das 14h. Deseja pagar agora?' },
]

// ─── Métodos de pagamento — espelho exato do CheckoutFlow ─────────────────────
const METODOS = [
  { key: 'pix',         label: 'PIX',          Icon: Zap,          cor: ACCENT    },
  { key: 'link',        label: 'Link',         Icon: ExternalLink, cor: '#7c3aed' },
  { key: 'nfc_debito',  label: 'NFC Débito',   Icon: Smartphone,   cor: ACCENT_B  },
  { key: 'nfc_credito', label: 'NFC Crédito',  Icon: Smartphone,   cor: '#8b5cf6' },
  { key: 'tef_debito',  label: 'TEF Débito',   Icon: CreditCard,   cor: ACCENT_B  },
  { key: 'tef_credito', label: 'TEF Crédito',  Icon: CreditCard,   cor: '#8b5cf6' },
  { key: 'dinheiro',    label: 'Dinheiro',     Icon: Banknote,     cor: '#f59e0b' },
]

const R = (n: number, w: number) => Math.round((n * w) / 360)

// ─── Mini calendário mock ─────────────────────────────────────────────────────
function MiniCal({ selectedDay, w }: { selectedDay: number; w: number }) {
  const r = (n: number) => R(n, w)
  const diasSemana = ['D','S','T','Q','Q','S','S']
  // Junho 2026: começa domingo (0), 30 dias
  const primeiroDia = 0
  const diasNoMes   = 30
  const hoje        = 6
  const hasEvento   = [3, 10, 14, 21, 24]

  return (
    <div style={{ padding: `${r(8)}px ${r(10)}px ${r(4)}px` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r(8) }}>
        <ChevronLeft style={{ width: r(12), height: r(12), color: TXT_MUTED }} />
        <span style={{ fontSize: r(7), fontWeight: 600, color: TXT_MUTED }}>Junho 2026</span>
        <ChevronRight style={{ width: r(12), height: r(12), color: TXT_MUTED }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: r(1), marginBottom: r(3) }}>
        {diasSemana.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: r(5.5), fontWeight: 600, color: TXT_MUTED }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: r(2) }}>
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia    = i + 1
          const isHoje = dia === hoje
          const isSel  = dia === selectedDay
          const isPast = dia < hoje
          const hasDot = hasEvento.includes(dia)
          return (
            <div key={dia} style={{
              textAlign: 'center', padding: `${r(3)}px 0`, borderRadius: r(5),
              fontSize: r(7), fontWeight: isSel ? 700 : 400,
              backgroundColor: isSel ? ACCENT : isHoje ? `${ACCENT}30` : 'transparent',
              color: isSel ? '#fff' : isPast ? '#64748b' : TXT,
              opacity: isPast ? 0.4 : 1, position: 'relative',
            }}>
              {dia}
              {hasDot && !isSel && (
                <div style={{ width: r(3.5), height: r(3.5), borderRadius: '50%', backgroundColor: '#ef4444', position: 'absolute', bottom: r(1.5), left: '50%', transform: 'translateX(-50%)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Slots ────────────────────────────────────────────────────────────────────
const SLOTS = [
  { hora: '08:00', ocupado: false },
  { hora: '08:30', ocupado: false },
  { hora: '09:00', ocupado: true  },
  { hora: '09:30', ocupado: true  },
  { hora: '10:00', ocupado: false },
  { hora: '10:30', ocupado: false },
  { hora: '11:00', ocupado: false },
  { hora: '14:00', ocupado: false },
  { hora: '14:30', ocupado: false },
  { hora: '15:00', ocupado: true  },
  { hora: '16:00', ocupado: false },
  { hora: '16:30', ocupado: false },
]

function PainelSlots({ selectedSlot, w }: { selectedSlot: string; w: number }) {
  const r = (n: number) => R(n, w)
  return (
    <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: r(6) }}>
        Horários — 07/jun
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: r(5) }}>
        {SLOTS.map(s => (
          <div key={s.hora} style={{
            border: `1px solid ${s.hora === selectedSlot ? ACCENT : BORDER}`,
            borderRadius: r(6), padding: `${r(5)}px ${r(3)}px`,
            fontSize: r(6.5), textAlign: 'center', fontWeight: s.hora === selectedSlot ? 700 : 400,
            backgroundColor: s.hora === selectedSlot ? ACCENT : s.ocupado ? `${BORDER}33` : 'transparent',
            color: s.hora === selectedSlot ? '#fff' : s.ocupado ? TXT_MUTED : TXT,
            opacity: s.ocupado ? 0.5 : 1,
          }}>
            {s.hora}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step Agendamento ─────────────────────────────────────────────────────────
function StepAgendamento({ msgCount, w }: { msgCount: number; w: number }) {
  const r = (n: number) => R(n, w)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Coluna Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '85%', backgroundColor: BOT_BUB, color: TXT, borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(7), lineHeight: 1.4 }}>
              Olá! Sou o Gestor de Agenda. Me diga qual serviço deseja agendar.
            </div>
          </div>
          {MSGS.slice(0, msgCount).map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%', backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB, color: '#fff', borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(7), lineHeight: 1.4 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        {/* Input */}
        <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}`, backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER}`, padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
            Digite sua mensagem...
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div style={{ width: `${r(130)}px`, display: 'flex', flexDirection: 'column', backgroundColor: BG_SEC, flexShrink: 0, overflow: 'hidden' }}>
        {/* Data + Hora */}
        <div style={{ padding: `${r(8)}px`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: r(5) }}>
            {[
              { label: 'Data',  val: msgCount >= 3 ? '07/06' : 'dd/mm' },
              { label: 'Hora',  val: msgCount >= 3 ? '14:00' : '--:--' },
            ].map(f => (
              <div key={f.label} style={{ flex: 1 }}>
                <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', marginBottom: r(3) }}>{f.label}</div>
                <div style={{ backgroundColor: BG_SEC2, border: `1px solid ${msgCount >= 3 ? ACCENT : BORDER}`, borderRadius: r(7), padding: `${r(5)}px ${r(6)}px`, fontSize: r(6.5), color: msgCount >= 3 ? TXT : TXT_MUTED, transition: 'all 300ms' }}>
                  {f.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duração */}
        <div style={{ padding: `${r(7)}px ${r(8)}px`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', marginBottom: r(5) }}>Duração</div>
          <div style={{ display: 'flex', gap: r(4) }}>
            {[30, 60, 90, 120].map(m => (
              <div key={m} style={{ flex: 1, padding: `${r(5)}px 0`, borderRadius: r(6), border: `1px solid ${m === 60 ? ACCENT : BORDER}`, fontSize: r(6), textAlign: 'center', fontWeight: m === 60 ? 700 : 400, backgroundColor: m === 60 ? ACCENT : 'transparent', color: m === 60 ? '#fff' : TXT }}>
                {m < 60 ? `${m}m` : `${m/60}h`}
              </div>
            ))}
          </div>
        </div>

        {/* Serviço */}
        <div style={{ padding: `${r(7)}px ${r(8)}px`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', marginBottom: r(5) }}>Serviço</div>
          {msgCount >= 2 ? (
            <div style={{ padding: `${r(6)}px ${r(7)}px`, borderRadius: r(8), border: `1px solid ${ACCENT}40`, backgroundColor: `${ACCENT}08` }}>
              <div style={{ fontSize: r(7), fontWeight: 700, color: TXT }}>Corte Masculino</div>
              <div style={{ fontSize: r(6), color: ACCENT, marginTop: r(1) }}>R$ 45,00</div>
            </div>
          ) : (
            <div style={{ backgroundColor: BG_SEC2, border: `1px solid ${BORDER}`, borderRadius: r(7), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
              Diga no chat ou busque...
            </div>
          )}
        </div>

        {/* Botão */}
        <div style={{ padding: `${r(8)}px`, marginTop: 'auto' }}>
          <div style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: r(9), padding: `${r(8)}px`, fontSize: r(7), fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(4) }}>
            <Calendar style={{ width: r(11), height: r(11) }} />
            Confirmar Informações
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step Confirmar Data ──────────────────────────────────────────────────────
function StepConfirmarData({ calPhase, w }: { calPhase: number; w: number }) {
  const r = (n: number) => R(n, w)
  const selectedDay  = calPhase >= 1 ? 7 : 0
  const selectedSlot = calPhase >= 2 ? '14:00' : ''

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Chat lateral */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: r(6), padding: `${r(8)}px ${r(10)}px`, backgroundColor: BG_CHAT, overflow: 'hidden' }}>
          {MSGS.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%', backgroundColor: m.from === 'user' ? USER_BUB : BOT_BUB, color: '#fff', borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(7), lineHeight: 1.4 }}>
                {m.text}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '85%', backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, color: ACCENT, borderRadius: r(10), padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), lineHeight: 1.4, fontWeight: 600 }}>
              Selecione o dia e horário no calendário →
            </div>
          </div>
        </div>
        <div style={{ padding: `${r(6)}px ${r(10)}px`, borderTop: `1px solid ${BORDER}`, backgroundColor: BG_SEC, display: 'flex', gap: r(5), alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: BG_SEC2, borderRadius: r(8), border: `1px solid ${BORDER}`, padding: `${r(5)}px ${r(8)}px`, fontSize: r(6.5), color: TXT_MUTED }}>
            Digite sua mensagem...
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT_B, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
          <div style={{ width: r(22), height: r(22), backgroundColor: ACCENT, borderRadius: r(7), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: r(12), height: r(12), color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* Calendário + slots */}
      <div style={{ width: `${r(140)}px`, display: 'flex', flexDirection: 'column', backgroundColor: BG_SEC, flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: `${r(8)}px ${r(10)}px ${r(2)}px`, flexShrink: 0 }}>
          <div style={{ fontSize: r(8), fontWeight: 700, color: TXT }}>Confirme a data</div>
          <div style={{ fontSize: r(6), color: TXT_MUTED, marginTop: r(1) }}>Selecione o dia e horário</div>
        </div>
        <div style={{ flex: 1, overflowY: 'hidden' }}>
          <MiniCal selectedDay={selectedDay} w={w} />
          {calPhase >= 1 && <PainelSlots selectedSlot={selectedSlot} w={w} />}
        </div>
        {calPhase >= 2 && (
          <div style={{ padding: `${r(6)}px ${r(8)}px`, borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: r(9), padding: `${r(7)}px`, fontSize: r(7), fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r(4) }}>
              <Check style={{ width: r(11), height: r(11), strokeWidth: 2.5 }} />
              Confirmar Agendamento
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step Pagamento ───────────────────────────────────────────────────────────
function StepPagamento({ phase, w }: { phase: number; w: number }) {
  const r = (n: number) => R(n, w)
  const selectedKey = 'pix'

  return (
    <div style={{ padding: `${r(10)}px ${r(16)}px`, display: 'flex', flexDirection: 'column', gap: r(7), height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Banner agendamento criado */}
      <div style={{ padding: `${r(8)}px ${r(10)}px`, borderRadius: r(9), backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, flexShrink: 0 }}>
        <div style={{ fontSize: r(7.5), fontWeight: 700, color: ACCENT }}>Agendamento criado! Deseja cobrar agora?</div>
        <div style={{ fontSize: r(6.5), color: TXT_MUTED, marginTop: r(2) }}>Corte Masculino — R$ 45,00</div>
      </div>

      {/* Botão pular */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: r(8), padding: `${r(8)}px`, fontSize: r(7), textAlign: 'center', color: TXT_MUTED, flexShrink: 0 }}>
        Cobrar depois — apenas confirmar agendamento
      </div>

      {/* Label */}
      <div style={{ fontSize: r(6), fontWeight: 700, color: TXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        Forma de pagamento
      </div>

      {/* Grid métodos — espelho exato do CheckoutFlow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: r(5), flexShrink: 0 }}>
        {METODOS.map((m) => {
          const isActive = m.key === selectedKey && phase >= 1
          return (
            <div key={m.key} style={{
              border: `2px solid ${isActive ? m.cor : BORDER}`,
              backgroundColor: isActive ? `${m.cor}18` : BG_SEC2,
              borderRadius: r(9), padding: `${r(8)}px ${r(7)}px`,
              display: 'flex', flexDirection: 'column', gap: r(3),
              transition: 'all 300ms',
            }}>
              <m.Icon style={{ width: r(14), height: r(14), color: isActive ? m.cor : TXT_MUTED }} />
              <span style={{ fontSize: r(6.5), fontWeight: 700, color: isActive ? m.cor : TXT_MUTED }}>{m.label}</span>
            </div>
          )
        })}
      </div>

      {/* QR / Confirmação */}
      {phase >= 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(5), flex: 1, justifyContent: 'center' }}>
          {phase === 1 && (
            <>
              <img src="/qrcode.png" alt="QR Code PIX" style={{ width: r(70), height: r(70), borderRadius: r(8), objectFit: 'contain', backgroundColor: '#fff', padding: r(4) }} />
              <div style={{ fontSize: r(6.5), color: TXT_MUTED }}>Aguardando pagamento PIX...</div>
            </>
          )}
          {phase >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: r(6) }}>
              <div style={{ width: r(42), height: r(42), backgroundColor: `${ACCENT}20`, border: `2px solid ${ACCENT}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check style={{ width: r(22), height: r(22), color: ACCENT, strokeWidth: 2.5 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: r(9), fontWeight: 800, color: ACCENT }}>Pagamento confirmado!</div>
                <div style={{ fontSize: r(6.5), color: TXT_MUTED, marginTop: r(3) }}>Agendamento registrado com sucesso</div>
              </div>
              {/* Badge e-mail — igual ao SceneAgenda original */}
              <div style={{ display: 'flex', alignItems: 'center', gap: r(5), padding: `${r(6)}px ${r(10)}px`, borderRadius: r(8), backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <Mail style={{ width: r(12), height: r(12), color: '#60a5fa' }} />
                <span style={{ fontSize: r(6.5), color: '#93c5fd', fontWeight: 600 }}>E-mail de confirmação enviado</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SceneAgenda() {
  const [step, setStep]           = useState<Step>('agendamento')
  const [msgCount, setMsgCount]   = useState(0)
  const [calPhase, setCalPhase]   = useState(0)
  const [pagPhase, setPagPhase]   = useState(0)
  const containerRef              = useRef<HTMLDivElement>(null)
  const [w, setW]                 = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    if (step === 'agendamento') {
      if (msgCount < MSGS.length) {
        t = setTimeout(() => setMsgCount(c => c + 1), msgCount === 0 ? 700 : 1100)
      } else {
        t = setTimeout(() => { setStep('confirmar_data'); setCalPhase(0) }, 1200)
      }
    }
    if (step === 'confirmar_data') {
      if (calPhase === 0)      t = setTimeout(() => setCalPhase(1), 800)
      else if (calPhase === 1) t = setTimeout(() => setCalPhase(2), 900)
      else                     t = setTimeout(() => { setStep('pagamento'); setPagPhase(0) }, 1200)
    }
    if (step === 'pagamento') {
      if (pagPhase === 0)      t = setTimeout(() => setPagPhase(1), 700)
      else if (pagPhase === 1) t = setTimeout(() => setPagPhase(2), 2200)
      else                     t = setTimeout(() => { setStep('agendamento'); setMsgCount(0); setCalPhase(0); setPagPhase(0) }, 2500)
    }
    return () => clearTimeout(t)
  }, [step, msgCount, calPhase, pagPhase])

  const r = (n: number) => R(n, w)
  const stepIndex = STEPS.indexOf(step)

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none" style={{ backgroundColor: BG_SEC, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding: `${r(8)}px ${r(12)}px`, borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: r(8) }}>
          <div style={{ width: r(28), height: r(28), borderRadius: '50%', backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar style={{ width: r(14), height: r(14), color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: r(9), fontWeight: 800, color: TXT, lineHeight: 1.2 }}>Gestor de Agenda</div>
            <div style={{ fontSize: r(6), color: TXT_MUTED, marginTop: r(1) }}>
              {step === 'agendamento'    ? 'Agendamento guiado por IA'
                : step === 'confirmar_data' ? 'Confirme data e horário'
                : 'Cobrar agora ou depois'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: r(8) }}>
          <div style={{ fontSize: r(5.5), fontWeight: 700, color: ACCENT, padding: `${r(2)}px ${r(6)}px`, borderRadius: r(20), backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
            Google Agenda
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: r(3) }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: r(3) }}>
                <div style={{ width: r(6), height: r(6), borderRadius: '50%', backgroundColor: i <= stepIndex ? ACCENT : BORDER, transition: 'background-color 400ms' }} />
                {i < STEPS.length - 1 && <div style={{ width: r(10), height: r(1), backgroundColor: BORDER }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {step === 'agendamento'    && <StepAgendamento   msgCount={msgCount} w={w} />}
        {step === 'confirmar_data' && <StepConfirmarData calPhase={calPhase} w={w} />}
        {step === 'pagamento'      && <StepPagamento     phase={pagPhase}    w={w} />}
      </div>
    </div>
  )
}
