'use client'
// components/tour/scenes/SceneMercadoLivre.tsx

function MercadoLivreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 35">
      <rect width="52" height="35" rx="4" fill="#FFE600"/>
      <path d="M19.5 25c-.3 0-.5-.1-.7-.3l-5.3-5.3c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l4.6 4.6 11-11c.4-.4 1-.4 1.4 0s.4 1 0 1.4L20.2 24.7c-.2.2-.4.3-.7.3z" fill="#2D3277"/>
      <path d="M13.8 22.5c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l5.3-5.3c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-5.3 5.3c-.2.2-.4.3-.7.3z" fill="#2D3277"/>
      <path d="M30.7 25.5c-.3 0-.5-.1-.7-.3l-3.2-3.2c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l3.2 3.2c.4.4.4 1 0 1.4-.2.2-.4.3-.7.3z" fill="#2D3277"/>
      <path d="M37.5 19c-.3 0-.5-.1-.7-.3l-5.3-5.3c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l5.3 5.3c.4.4.4 1 0 1.4-.2.2-.4.3-.7.3z" fill="#2D3277"/>
    </svg>
  )
}

const QA = [
  {
    question: 'O produto acompanha nota fiscal?',
    answer: 'Sim! Todos os produtos acompanham nota fiscal eletrônica.',
  },
  {
    question: 'Qual o prazo de entrega para São Paulo?',
    answer: 'Para SP capital o prazo é de 2 dias úteis via Mercado Envios. Posso verificar seu CEP específico!',
  },
]

export default function SceneMercadoLivre() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none bg-white">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ background: '#FFE600', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
      >
        <MercadoLivreIcon className="h-5 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-800 flex-1">Perguntas e respostas</span>
      </div>

      {/* Produto */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0 bg-gray-50"
        style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <div className="rounded-md flex-shrink-0" style={{ width: 44, height: 44, background: '#e8e8e8' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">Kit Café Especial Premium 250g</p>
          <p className="text-xs text-gray-400 mt-0.5">R$ 89,90 · 47 vendidos</p>
        </div>
      </div>

      {/* Q&A list */}
      <div className="flex-1 flex flex-col overflow-hidden divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {QA.map((item, i) => (
          <div key={i} className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#3483fa' }}>P:</span>
              <p className="text-xs text-gray-700 leading-relaxed">{item.question}</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: '#f0f7ff' }}>
              <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#00a650' }}>R:</span>
              <div className="flex-1">
                <p className="text-xs text-gray-700 leading-relaxed mb-1.5">{item.answer}</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ width: 14, height: 14, background: '#00a650' }}
                  >
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#00a650', fontSize: '0.6rem' }}>
                    Respondido por minhAi
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
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
