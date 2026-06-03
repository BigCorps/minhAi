'use client'
// components/tour/scenes/SceneMercadoLivre.tsx
// Mock visual da interface de mensagens do Mercado Livre.

const MESSAGES = [
  { from: 'user', text: 'O produto acompanha nota fiscal?', time: '09:30' },
  { from: 'bot', text: 'Olá! Sim, todos os produtos acompanham nota fiscal eletrônica. ✅', time: '09:30' },
  { from: 'user', text: 'Qual o prazo de entrega para São Paulo?', time: '09:31' },
  {
    from: 'bot',
    text: 'Para São Paulo capital o prazo é de 2 dias úteis via Mercado Envios. 🚚 Posso verificar o CEP específico se quiser!',
    time: '09:31',
  },
]

export default function SceneMercadoLivre() {
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#fff' }}
    >
      {/* ── Header ML ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#fff159', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
      >
        {/* Logo ML simplificado */}
        <svg viewBox="0 0 80 24" className="h-5 flex-shrink-0">
          <text
            x="0"
            y="18"
            fontFamily="Arial"
            fontWeight="bold"
            fontSize="14"
            fill="#333"
          >
            mercadolivre
          </text>
        </svg>
        <div className="flex-1" />
        <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>

      {/* ── Sub-header conversa ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={2} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: '#3483fa' }}
        >
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 text-xs font-semibold leading-none truncate">Café Exemplo Oficial</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs" style={{ color: '#00a650' }}>● MercadoLíder</span>
          </div>
        </div>
      </div>

      {/* ── Produto referência ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-b"
        style={{ background: '#f5f5f5', borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div
          className="rounded flex-shrink-0"
          style={{ width: 40, height: 40, background: '#e8e8e8' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-gray-700 text-xs font-medium leading-snug truncate">
            Kit Café Especial Premium 250g
          </p>
          <p className="text-gray-500 text-xs">R$ 89,90</p>
        </div>
      </div>

      {/* ── Mensagens ── */}
      <div className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden bg-white">
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="rounded-2xl px-3 py-2 max-w-[78%]"
              style={{
                fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
                background: msg.from === 'user' ? '#3483fa' : '#f0f0f0',
                color: msg.from === 'user' ? 'white' : '#333',
              }}
            >
              <p className="leading-snug">{msg.text}</p>
              <p
                className="mt-0.5 text-right"
                style={{ fontSize: '0.6rem', opacity: 0.6 }}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
        <div
          className="flex-1 rounded-full border px-4 py-2 text-xs text-gray-400"
          style={{ borderColor: '#ddd' }}
        >
          Escreva uma mensagem...
        </div>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 36, height: 36, background: '#3483fa' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
