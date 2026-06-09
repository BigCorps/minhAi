'use client'
// components/tour/scenes/SceneWizard.tsx
// Wizard conversacional de criação do assistente

import { useEffect, useState } from 'react'

const BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'

const CHAT = [
  { from: 'bot',  text: 'Qual o nome do seu negócio?' },
  { from: 'user', text: 'Café Exemplo' },
  { from: 'bot',  text: 'Que tipo de negócio é o Café Exemplo?' },
  { from: 'user', text: 'Cafeteria e lanchonete' },
  { from: 'bot',  text: 'Como prefere que o assistente se comunique?' },
  { from: 'user', text: 'Simpático e informal' },
  { from: 'bot',  text: 'Quais funções são mais importantes para você?' },
  { from: 'user', text: 'Vendas, cardápio, reservas e PIX' },
]

const FUNCOES_GERADAS = [
  { nome: 'Modo Vendas',   color: '#84cc16' },
  { nome: 'Cardápio',      color: '#3b82f6' },
  { nome: 'Agendamento',   color: '#84cc16' },
  { nome: 'Gerar PIX',     color: '#32bcad' },
  { nome: 'WhatsApp QR',   color: '#25D366' },
  { nome: 'Modo Fila',     color: '#3b82f6' },
]

export default function SceneWizard() {
  const [chatCount, setChatCount] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [funcaoCount, setFuncaoCount] = useState(0)
  const [done, setDone] = useState(false)

  // Avança chat
  useEffect(() => {
    if (chatCount >= CHAT.length) return
    const delay = chatCount === 0 ? 400 : chatCount % 2 === 0 ? 900 : 1300
    const t = setTimeout(() => setChatCount(v => v + 1), delay)
    return () => clearTimeout(t)
  }, [chatCount])

  // Após chat completo, gera funções
  useEffect(() => {
    if (chatCount < CHAT.length) return
    const t = setTimeout(() => setGenerating(true), 600)
    return () => clearTimeout(t)
  }, [chatCount])

  useEffect(() => {
    if (!generating) return
    if (funcaoCount >= FUNCOES_GERADAS.length) {
      const t = setTimeout(() => setDone(true), 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setFuncaoCount(v => v + 1), 300)
    return () => clearTimeout(t)
  }, [generating, funcaoCount])

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.8)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinecap="round" className="w-2.5 h-2.5">
              <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M19 10a7 7 0 0 1-14 0"/>
            </svg>
          </div>
          <span className="text-white/60 font-semibold" style={{ fontSize: 'clamp(0.48rem, 1.1vw, 0.62rem)' }}>
            Criar Assistente com IA
          </span>
        </div>
        {done && (
          <span
            className="rounded-full px-2 py-0.5 font-semibold"
            style={{ background: 'rgba(132,204,22,0.15)', color: '#84cc16', border: '1px solid rgba(132,204,22,0.3)', fontSize: 'clamp(0.35rem, 0.8vw, 0.44rem)' }}
          >
            ✓ Assistente criado
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 flex gap-2 px-3 py-2 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col justify-end gap-1.5 overflow-hidden flex-1">
          {CHAT.slice(0, chatCount).map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-xl px-2.5 py-1.5 max-w-[85%]"
                style={{
                  fontSize: 'clamp(0.46rem, 1vw, 0.58rem)',
                  background: msg.from === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  lineHeight: 1.4,
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Painel de funções geradas */}
        {generating && (
          <div
            className="flex-shrink-0 flex flex-col gap-1.5 rounded-xl p-2"
            style={{ width: '42%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/40 font-semibold uppercase tracking-wider flex-shrink-0" style={{ fontSize: 'clamp(0.32rem, 0.75vw, 0.42rem)' }}>
              Funções selecionadas
            </p>
            <div className="flex flex-col gap-1 flex-1 overflow-hidden">
              {FUNCOES_GERADAS.slice(0, funcaoCount).map((f, i) => (
                <div
                  key={f.nome}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                  style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth={2.5} strokeLinecap="round" className="w-2.5 h-2.5 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.35rem, 0.8vw, 0.46rem)' }}>{f.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', fontSize: 'clamp(0.42rem, 1vw, 0.54rem)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {done ? 'Assistente criado com sucesso!' : 'Responda as perguntas...'}
          </div>
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, background: done ? '#84cc16' : '#3b82f6' }}
          >
            {done
              ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            }
          </div>
        </div>
      </div>
    </div>
  )
}