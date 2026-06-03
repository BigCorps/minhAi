'use client'
// components/tour/scenes/SceneWhatsApp.tsx
// Mock visual de uma conversa no WhatsApp Web.

const MESSAGES = [
  { from: 'user', text: 'Oi, vocês abrem amanhã?', time: '14:02' },
  {
    from: 'bot',
    text: 'Olá! 😊 Sim, amanhã abrimos às 8h. Posso te ajudar a fazer uma reserva ou pedido antecipado?',
    time: '14:02',
  },
  { from: 'user', text: 'Quero reservar uma mesa para 2 pessoas às 19h', time: '14:03' },
  {
    from: 'bot',
    text: '✅ Reserva confirmada! Mesa para 2 pessoas, amanhã às 19h. Seu código é *RES-4821*. Até lá! 🎉',
    time: '14:03',
  },
]

export default function SceneWhatsApp() {
  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col select-none"
      style={{ background: '#111b21' }}
    >
      {/* ── Header WhatsApp ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        {/* Seta voltar */}
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
        {/* Avatar */}
        <div
          className="rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ width: 40, height: 40, background: '#3b82f6' }}
        >
          <span className="text-white text-sm font-bold">C</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-none truncate">Café Exemplo</p>
          <p className="text-xs mt-0.5" style={{ color: '#8696a0' }}>
            online
          </p>
        </div>
        {/* Ícones direita */}
        <div className="flex gap-4 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" className="w-5 h-5">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>
      </div>

      {/* ── Fundo wallpaper ── */}
      <div
        className="flex-1 flex flex-col justify-end gap-1 px-3 py-3 overflow-hidden"
        style={{ background: '#0b141a' }}
      >
        {MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="rounded-lg px-3 py-1.5 max-w-[78%] relative"
              style={{
                background: msg.from === 'user' ? '#005c4b' : '#202c33',
                fontSize: 'clamp(0.7rem, 1.8vw, 0.82rem)',
                color: '#e9edef',
              }}
            >
              <p className="leading-snug">{msg.text}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span style={{ fontSize: '0.6rem', color: '#8696a0' }}>{msg.time}</span>
                {msg.from === 'bot' && (
                  <svg viewBox="0 0 16 11" fill="#53bdeb" className="w-3 h-2">
                    <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L4.955 7.43 1.6 4.255a.503.503 0 0 0-.36-.14.493.493 0 0 0-.373.166L.172 5.007a.47.47 0 0 0-.115.34c.01.127.063.242.153.328l4.34 4.05a.504.504 0 0 0 .359.14c.14 0 .275-.055.381-.156l6.89-7.523a.46.46 0 0 0 .115-.345.47.47 0 0 0-.153-.328l-.071.14zm3.5 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L7.955 7.43a.47.47 0 0 0-.038.05l.38.355 6.275-6.854a.46.46 0 0 0 .115-.345.47.47 0 0 0-.153-.328l.037.345z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: '#202c33' }}
      >
        <div
          className="flex-1 rounded-full px-4 py-2 text-xs"
          style={{ background: '#2a3942', color: '#8696a0' }}
        >
          Mensagem
        </div>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, background: '#00a884' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zM12 2a1 1 0 00-1 1v1.07A8.002 8.002 0 004.07 11H3a1 1 0 000 2h1.07A8.002 8.002 0 0011 19.93V21a1 1 0 002 0v-1.07A8.002 8.002 0 0019.93 13H21a1 1 0 000-2h-1.07A8.002 8.002 0 0013 4.07V3a1 1 0 00-1-1z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
