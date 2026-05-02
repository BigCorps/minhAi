// app/components/landing/TecnologiaSection.tsx — Server Component

interface TecnologiaSectionProps {
  theme?: 'dark' | 'light';
}

// ── Bloco 1: Stack de IA ──────────────────────────────────────
const AI_STACK = [
  { label: 'GPT-4o', sub: 'LLM principal',        color: 'blue'  as const },
  { label: 'Claude',  sub: 'LLM alternativo',      color: 'blue'  as const },
  { label: 'Whisper', sub: 'STT — voz para texto', color: 'green' as const },
  { label: 'Google Speech', sub: 'STT alternativo',color: 'green' as const },
  { label: 'ElevenLabs',   sub: 'TTS — voz natural', color: 'blue' as const },
  { label: 'GPT-4 Vision', sub: 'OCR & visão',     color: 'green' as const },
  { label: 'Embeddings',   sub: 'text-embedding-3', color: 'blue' as const },
  { label: 'RAG Pipeline', sub: 'busca semântica',  color: 'green' as const },
  { label: 'pgvector',     sub: 'Vector DB',        color: 'blue'  as const },
];

// ── Bloco 2: Infra & Stack ────────────────────────────────────
const INFRA_STACK = [
  { label: 'Next.js 15',        category: 'Frontend'   },
  { label: 'TypeScript',        category: 'Frontend'   },
  { label: 'Tailwind CSS',      category: 'Frontend'   },
  { label: 'PWA / Service Worker', category: 'Frontend' },
  { label: 'Supabase',          category: 'Backend'    },
  { label: 'AWS',               category: 'Backend'    },
  { label: 'PostgreSQL',        category: 'Backend'    },
  { label: 'Edge Functions',    category: 'Backend'    },
  { label: 'Vercel',            category: 'Deploy'     },
  { label: 'WhatsApp Cloud API',category: 'Integração' },
  { label: 'Instagram API',     category: 'Integração' },
  { label: 'Mercado Pago',      category: 'Pagamentos' },
  { label: 'InfinitePay NFC',   category: 'Pagamentos' },
  { label: 'Google Calendar',   category: 'Google'     },
  { label: 'Gmail API',         category: 'Google'     },
  { label: 'Google Maps',       category: 'Google'     },
];

// ── Bloco 3: Browser APIs nativas ─────────────────────────────
const BROWSER_APIS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    label: 'Câmera',
    sub: 'QR Code, OCR, biometria',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: 'Geolocalização',
    sub: 'Rota, CEP, trânsito',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    label: 'Microfone',
    sub: 'Voz para texto em tempo real',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    label: 'Notificações Push',
    sub: 'Alertas e lembretes nativos',
    color: 'green' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    label: 'Modo Offline',
    sub: 'PWA com cache inteligente',
    color: 'blue' as const,
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
    label: 'NFC / Bluetooth',
    sub: 'Tap to Pay, IoT',
    color: 'green' as const,
  },
];

// ── Métricas ──────────────────────────────────────────────────
const METRICAS = [
  { valor: '<800ms', label: 'latência média de resposta', color: 'blue'  as const },
  { valor: '99.9%',  label: 'uptime garantido',           color: 'green' as const },
  { valor: '128',    label: 'bits de criptografia E2E',   color: 'blue'  as const },
  { valor: 'LGPD',   label: 'conforme lei brasileira',    color: 'green' as const },
];

const categoryColor: Record<string, string> = {
  Frontend:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Backend:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Deploy:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Integração: 'bg-green-500/10 text-green-400 border-green-500/20',
  Pagamentos: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Google:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const categoryColorLight: Record<string, string> = {
  Frontend:   'bg-blue-50 text-blue-700 border-blue-200',
  Backend:    'bg-purple-50 text-purple-700 border-purple-200',
  Deploy:     'bg-gray-100 text-gray-600 border-gray-200',
  Integração: 'bg-green-50 text-green-700 border-green-200',
  Pagamentos: 'bg-amber-50 text-amber-700 border-amber-200',
  Google:     'bg-red-50 text-red-700 border-red-200',
};

export default function TecnologiaSection({ theme = 'dark' }: TecnologiaSectionProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        h-full w-full overflow-hidden
        transition-colors duration-500
        ${isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
          : 'bg-gradient-to-br from-white via-blue-50/20 to-white'
        }
      `}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[55%] h-[40%] rounded-full blur-[130px] ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/20'}`} />
      </div>

      <div
        className={`
          relative z-10 w-full max-w-5xl mx-auto
          flex flex-col items-center
          px-5 sm:px-8 lg:px-12
          pt-[68px] pb-[52px]
          [@media(max-height:700px)_and_(max-width:767px)]:pt-[64px]
          [@media(max-height:700px)_and_(max-width:767px)]:pb-[44px]
          md:pt-4 md:pb-4
          gap-3
          [@media(min-height:700px)_and_(max-width:767px)]:gap-4
          sm:gap-5 md:gap-6
        `}
      >

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
            Tecnologia
          </p>
          <h2 className={`font-bold leading-tight text-lg sm:text-2xl md:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Construído com o que há de{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>mais avançado em IA</span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 hidden sm:block ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Stack moderno, seguro e escalável — da camada de linguagem até o hardware do cliente.
          </p>
        </div>

        {/* ── MOBILE: abas compactas ──────────────────────────── */}
        {/*
          Mobile mostra as 3 seções num layout vertical compacto:
          1. IA chips em grid 3 colunas
          2. Infra pills em wrap
          3. Browser APIs em grid 3 colunas
        */}
        <div className="flex flex-col gap-2.5 w-full sm:hidden">

          {/* IA Stack */}
          <div className={`rounded-xl border p-3 ${isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
              Stack de IA
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {AI_STACK.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center text-center px-1.5 py-2 rounded-lg border ${
                    item.color === 'blue'
                      ? isDark ? 'bg-blue-500/8 border-blue-500/15 ' : 'bg-blue-50 border-blue-100'
                      : isDark ? 'bg-green-500/8 border-green-500/15' : 'bg-green-50 border-green-100'
                  }`}
                >
                  <span className={`text-[11px] font-bold leading-tight ${
                    item.color === 'blue'
                      ? isDark ? 'text-blue-300' : 'text-blue-700'
                      : isDark ? 'text-green-300' : 'text-green-700'
                  }`}>
                    {item.label}
                  </span>
                  <span className={`text-[9px] mt-0.5 leading-tight ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    {item.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Browser APIs */}
          <div className={`rounded-xl border p-3 ${isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-green-400/60' : 'text-green-600/60'}`}>
              APIs do Dispositivo
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {BROWSER_APIS.map((api) => (
                <div
                  key={api.label}
                  className={`flex flex-col items-center text-center px-1.5 py-2 rounded-lg border ${
                    api.color === 'blue'
                      ? isDark ? 'bg-blue-500/8 border-blue-500/15' : 'bg-blue-50 border-blue-100'
                      : isDark ? 'bg-green-500/8 border-green-500/15' : 'bg-green-50 border-green-100'
                  }`}
                >
                  <div className={`mb-1 ${api.color === 'blue' ? isDark ? 'text-blue-400' : 'text-blue-600' : isDark ? 'text-green-400' : 'text-green-600'} [&>svg]:w-4 [&>svg]:h-4`}>
                    {api.icon}
                  </div>
                  <span className={`text-[11px] font-bold leading-tight ${isDark ? 'text-white/80' : 'text-gray-800'}`}>
                    {api.label}
                  </span>
                  <span className={`text-[9px] mt-0.5 leading-tight ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    {api.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-4 gap-1.5">
            {METRICAS.map((m) => (
              <div
                key={m.label}
                className={`flex flex-col items-center text-center px-2 py-2 rounded-xl border ${
                  m.color === 'blue'
                    ? isDark ? 'bg-blue-500/5 border-blue-500/15' : 'bg-blue-50 border-blue-100'
                    : isDark ? 'bg-green-500/5 border-green-500/15' : 'bg-green-50 border-green-100'
                }`}
              >
                <span className={`text-sm font-black ${m.color === 'blue' ? isDark ? 'text-blue-400' : 'text-blue-600' : isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {m.valor}
                </span>
                <span className={`text-[9px] mt-0.5 leading-tight text-center ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* ── DESKTOP: 3 colunas ─────────────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4 w-full">

          {/* Coluna 1: IA Stack */}
          <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-blue-400/60' : 'text-blue-600/60'}`}>
              Stack de IA
            </p>
            <div className="flex flex-col gap-2">
              {AI_STACK.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/80' : 'text-gray-800'}`}>
                    {item.label}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    item.color === 'blue'
                      ? isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'
                      : isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {item.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Infra + Métricas */}
          <div className="flex flex-col gap-3">
            <div className={`rounded-2xl border p-4 flex-1 ${isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-purple-400/60' : 'text-purple-600/60'}`}>
                Infra & Stack
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INFRA_STACK.map((item) => (
                  <span
                    key={item.label}
                    className={`text-[10px] font-medium px-2 py-1 rounded-lg border ${
                      isDark ? categoryColor[item.category] : categoryColorLight[item.category]
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2">
              {METRICAS.map((m) => (
                <div
                  key={m.label}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border ${
                    m.color === 'blue'
                      ? isDark ? 'bg-blue-500/5 border-blue-500/15' : 'bg-blue-50 border-blue-100'
                      : isDark ? 'bg-green-500/5 border-green-500/15' : 'bg-green-50 border-green-100'
                  }`}
                >
                  <span className={`text-lg font-black ${m.color === 'blue' ? isDark ? 'text-blue-400' : 'text-blue-600' : isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {m.valor}
                  </span>
                  <span className={`text-[10px] mt-0.5 leading-tight ${isDark ? 'text-white/35' : 'text-gray-400'}`}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 3: Browser APIs */}
          <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-white/[0.02] border-white/6' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-green-400/60' : 'text-green-600/60'}`}>
              APIs do Dispositivo
            </p>
            <div className="flex flex-col gap-2.5">
              {BROWSER_APIS.map((api) => (
                <div key={api.label} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    api.color === 'blue'
                      ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'
                      : isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-600'
                  } [&>svg]:w-5 [&>svg]:h-5`}>
                    {api.icon}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{api.label}</p>
                    <p className={`text-[10px] ${isDark ? 'text-white/35' : 'text-gray-400'}`}>{api.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
