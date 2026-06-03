'use client'
// components/tour/scenes/SceneMercadoLivre.tsx

import { useEffect, useState } from 'react'

const QA = [
  {
    question: 'O produto acompanha nota fiscal?',
    answer: 'Sim! Todos os produtos acompanham nota fiscal eletrônica.',
  },
  {
    question: 'Qual o prazo de entrega para São Paulo?',
    answer: 'Para SP capital o prazo é de 2 dias úteis via Mercado Envios.',
  },
]

// Cada "passo" da animação:
// 0 = nada visível
// 1 = pergunta 1
// 2 = resposta 1
// 3 = pergunta 2
// 4 = resposta 2
const STEP_DELAY = 900 // ms entre cada passo

export default function SceneMercadoLivre() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i <= QA.length * 2; i++) {
      timers.push(setTimeout(() => setStep(i), i * STEP_DELAY))
    }
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none bg-white">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ background: '#FFE600', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
      >
        <div className="h-6 w-28 flex-shrink-0">
          <img
            src="https://companieslogo.com/img/orig/MELI-ec0c0e4f.png?t=1648156112"
            alt="Mercado Livre"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xs font-semibold text-gray-800 flex-1">Perguntas e respostas</span>
      </div>

      {/* Produto */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0 bg-gray-50"
        style={{ borderColor: 'rgba(0,0,0,0.07)' }}
      >
        <img
          src="/cafe.jpg"
          alt="Kit Café Especial Premium"
          className="rounded-md flex-shrink-0 object-cover"
          style={{ width: 44, height: 44 }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">Kit Café Especial Premium 250g</p>
          <p className="text-xs text-gray-400 mt-0.5">R$ 89,90 · 47 vendidos</p>
        </div>
      </div>

      {/* Q&A animado */}
      <div className="flex-1 flex flex-col overflow-hidden divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {QA.map((item, i) => {
          const questionStep = i * 2 + 1
          const answerStep = i * 2 + 2
          const showQuestion = step >= questionStep
          const showAnswer = step >= answerStep

          return (
            <div key={i} className="px-4 py-3 flex flex-col gap-2">

              {/* Pergunta */}
              <div
                className="flex items-start gap-2"
                style={{
                  opacity: showQuestion ? 1 : 0,
                  transform: showQuestion ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                }}
              >
                <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#3483fa' }}>P:</span>
                <p className="text-xs text-gray-700 leading-relaxed">{item.question}</p>
              </div>

              {/* Resposta */}
              <div
                className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                style={{
                  background: '#f0f7ff',
                  opacity: showAnswer ? 1 : 0,
                  transform: showAnswer ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                }}
              >
                <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#00a650' }}>R:</span>
                <p className="text-xs text-gray-700 leading-relaxed">{item.answer}</p>
              </div>

            </div>
          )
        })}
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="flex-1 rounded-full border px-4 py-2 text-xs text-gray-400"
          style={{ borderColor: '#ddd', background: '#f5f5f5' }}
        >
          Faça uma pergunta sobre o produto...
        </div>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: '#3483fa' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </div>
      </div>

    </div>
  )
}
