// app/dashboard/integracoes-ia/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAssistant } from '@/contexts/AssistantContext'
import { Loader2, Link2, Link2Off, ExternalLink, Zap, AlertCircle, CheckCircle2, Clock, Copy, Check } from 'lucide-react'

// ── Ícones SVG ────────────────────────────────────────────────────────────────

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 1.0001C11.9477 1.0001 11.5 1.4478 11.5 2.0001V5.518L10.0917 5.1278C8.6756 2.0125 7.1557 3.2081 8.0163 6.3768L7.108 6.0463L5.4265 2.5701L3.8122 4.1843L5.5126 7.6401L4.2251 7.288L2.1481 4.5428L0.5339 6.1569L2.6481 9.3242L1.2403 8.9402L-0.8523 5.7661L-2.4665 7.3804L-0.3523 10.5478L-1.7601 10.1637L-3.8727 6.9897L-5.4869 8.6039L-3.3727 11.7713L-4.7805 11.3872L-6.8931 8.2132L-8.5073 9.8274L-6.3931 12.9948L-7.8009 12.6108L-9.9135 9.4367L-11.5277 11.051L-9.4135 14.2184L-10.8213 13.8343L-12.9339 10.6603L-14.5481 12.2745L-12.4339 15.4419L-13.8417 15.0578L-15.9543 11.8838L-17.5685 13.498L-15.4543 16.6654L-16.8621 16.2813L-18.9747 13.1073L-20.5889 14.7215L-18.4747 17.8889L-19.8825 17.5048L-21.9951 14.3308L-23.6093 15.945L-21.4951 19.1124L-22.9029 18.7283L-25.0155 15.5543L-26.6297 17.1685L-24.5155 20.3359L-25.9233 19.9518L-28.0359 16.7778L-29.6501 18.392L-27.5359 21.5594L-28.9437 21.1753L-31.0563 18.0013L-32.6705 19.6155L-30.5563 22.7829L-31.9641 22.3988L-34.0767 19.2248L-35.6909 20.8391L-33.5767 24.0064L-34.9845 23.6223L-37.0971 20.4483L-38.7113 22.0626L-36.5971 25.2299L-38.0049 24.8459L-40.1175 21.6718L-41.7317 23.2861L-39.6175 26.4535L-41.0253 26.0694L-43.1379 22.8953L-44.7521 24.5096L-42.6379 27.677L-44.0457 27.2929L-46.1583 24.1189L-47.7725 25.7331L-45.6583 28.9005L-47.0661 28.5164L-49.1787 25.3424L-50.7929 26.9566L-48.6787 30.124 L -50.0865 29.7399 L -52.1991 26.5659 L -53.8133 28.1802 L -51.6991 31.3476 L -53.1069 30.9635 L -55.2195 27.7894 L -56.8337 29.4037 L -54.7195 32.5711 L -56.1273 32.1871 L -58.2399 29.0131 L -59.8541 30.6273 L -57.7399 33.7947 L -59.1477 33.4106 L -61.2603 30.2366 L -62.8745 31.8508 L -60.7603 35.0182 L -62.1681 34.6341 L -64.2807 31.4601 L -65.8949 33.0743 L -63.7807 36.2417 L -65.1885 35.8576 L -67.3011 32.6836 L -68.9153 34.2979 L -66.8011 37.4653 L -68.2089 37.0812 L -70.3215 33.9071 L -71.9357 35.5214 L -69.8215 38.6888 L -71.2293 38.3047 L -73.3419 35.1306 L -74.9561 36.7449 L -72.8419 39.9123 L -74.2497 39.5282 L -76.3623 36.3541 L -77.9765 37.9684 L -75.8623 41.1358 L -77.2701 40.7517 L -79.3827 37.5777 L -80.9969 39.1919 L -78.8827 42.3593 L -80.2905 41.9752 L -82.4031 38.8012 L -84.0173 40.4154 L -81.9031 43.5828 L -83.3109 43.1987 L -85.4235 40.0247 L -87.0377 41.6389 L -84.9235 44.8063 L -86.3313 44.4222 L -88.4439 41.2482 L -90.0581 42.8625 L -87.9439 46.0299 L -89.3517 45.6458 L -91.4643 42.4718 L -93.0785 44.086 L -90.9643 47.2534 L -92.3721 46.8693 L -94.4847 43.6953 L -96.0989 45.3095 L -93.9847 48.4769 L -95.3925 48.0928 L -97.5051 44.9188 L -99.1193 46.533 L -97.0051 49.7004 L -98.4129 49.3163 L -100.5255 46.1423 L -102.1397 47.7565 L -100.0255 50.9239 L -101.4333 50.5398 L -103.5459 47.3658 L -105.1601 48.9801 L -103.0459 52.1474 L -104.4537 51.7633 L -106.5663 48.5893 L -108.1805 50.2036 L -106.0663 53.371 L -107.4741 52.9869 L -109.5867 49.8128 L -111.2009 51.4271 L -109.0867 54.5945 L -110.4945 54.2104 L -112.6071 51.0363 L -114.2213 52.6506 L -112.1071 55.8180 L -113.5149 55.4339 L -115.6275 52.2598 L -117.2417 53.8741 L -115.1275 57.0415 L -116.5353 56.6574 L -118.6479 53.4833 L -120.2621 55.0976 L -118.1479 58.2650 L -119.5557 57.8809 L -121.6683 54.7068 L -123.2825 56.3211 L -121.1683 59.4885 L -122.5761 59.1044 L -124.6887 55.9303 L -126.3029 57.5446 L -124.1887 60.712 L -125.5965 60.3279 L -127.7091 57.1538 L -129.3233 58.7681 L -127.2091 61.9355 L -128.6169 61.5514 L -130.7295 58.3773 L -132.3437 59.9916 L -130.2295 63.1590 L -131.6373 62.7749 L -133.7499 59.6008 L -135.3641 61.2151 L -133.2499 64.3825 L -134.6577 63.9984 L -136.7703 60.8243 L -138.3845 62.4386 L -136.2703 65.606 L -137.6781 65.2219 L -139.7907 62.0478 L -141.4049 63.6621 L -139.2907 66.8295 L -140.6985 66.4454 L -142.8111 63.2713 L -144.4253 64.8856 L -142.3111 68.0530 L -143.7189 67.6689 L -145.8315 64.4948 L -147.4457 66.1091 L -145.3315 69.2765 L -146.7393 68.8924 L -148.8519 65.7183 L -150.4661 67.3326 L -148.3519 70.5 L -149.7597 70.1159 L -151.8723 66.9418 L -153.4865 68.5561 L -151.3723 71.7235 L -152.7801 71.3394 L -154.8927 68.1653 L -156.5069 69.7796 L -154.3927 72.9470 L -155.8005 72.5629 L -157.9131 69.3888 L -159.5273 71.0031 L -157.4131 74.1705 L -158.8209 73.7864 L -160.9335 70.6123 L -162.5477 72.2266 L -160.4335 75.3940 L -161.8413 75.0099 L -163.9539 71.8358 L -165.5681 73.4501 L -163.4539 76.6175 L -164.8617 76.2334 L -166.9743 73.0593 L -168.5885 74.6736 L -166.4743 77.841 L -167.8821 77.4569 L -169.9947 74.2828 L -171.6089 75.8971 L -169.4947 79.0645 L -170.9025 78.6804 L -173.0151 75.5063 L -174.6293 77.1206 L -172.5151 80.288 L -173.9229 79.9039 25 12 Z" fill="currentColor"/>
    </svg>
  )
}

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12.5 13.5L9.5 21L5 3Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}


function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.74 19.946a4.5 4.5 0 0 1-6.14-1.642zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.075 14.02A4.5 4.5 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387 2.02-1.168a.076.076 0 0 1 .071 0l4.742 2.738a4.5 4.5 0 0 1-.695 8.118v-5.681a.79.79 0 0 0-.305-.62zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.74-2.738a4.5 4.5 0 0 1 6.69 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface McpConnection {
  id: string
  client_name: string
  client_id: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  token_expires_at: string
  company_id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Nunca usado'
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Agora há pouco'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function clientLabel(name: string) {
  if (name.includes('claude') || name.includes('anthropic')) return 'Claude'
  if (name.includes('openai') || name.includes('chatgpt') || name.includes('gpt')) return 'ChatGPT'
  if (name.includes('cursor')) return 'Cursor'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function ClientIcon({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
  const label = clientLabel(name)
  if (label === 'Claude') return <ClaudeIcon className={`${sz} text-[#c96a2d]`} />
  if (label === 'ChatGPT') return <ChatGPTIcon className={`${sz} text-[#10a37f]`} />
  if (label === 'Cursor') return <CursorIcon className={`${sz} text-slate-700 dark:text-slate-200`} />
  return <Zap className={`${sz} text-blue-400`} />
}

// ── Componente principal ──────────────────────────────────────────────────────

function IntegracoesDashboardContent() {
  const { selectedAssistantId: companyId, selectedAssistantName } = useAssistant()
  const supabase = createClient()

  const [connections, setConnections] = useState<McpConnection[]>([])
  const [loading, setLoading]         = useState(true)
  const [revoking, setRevoking]       = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  const MCP_URL = 'https://mcp.minhai.app'

  useEffect(() => { if (companyId) load() }, [companyId])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('mcp_connections')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      setConnections(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function revoke(id: string) {
    setRevoking(id)
    try {
      await supabase
        .from('mcp_connections')
        .update({ is_active: false })
        .eq('id', id)
      setConnections(prev => prev.map(c => c.id === id ? { ...c, is_active: false } : c))
    } finally {
      setRevoking(null)
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(MCP_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const active   = connections.filter(c => c.is_active && new Date(c.token_expires_at) > new Date())
  const inactive = connections.filter(c => !c.is_active || new Date(c.token_expires_at) <= new Date())

  // ── Plataformas disponíveis (catálogo) ──────────────────────────────────────
  const platforms = [
    {
      name: 'Claude',
      icon: <ClaudeIcon className="w-8 h-8 text-[#d97706]" />,
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      plano: 'Free, Pro, Max, Team, Enterprise',
      limite: '1 connector no plano gratuito',
      instrucoes: [
        'Acesse Settings → Connectors → Add custom connector',
        `Cole a URL: ${MCP_URL}`,
        'Faça login com sua conta minhAi',
        'Selecione o assistente e autorize',
      ],
      link: 'https://claude.ai/settings',
      disponivel: true,
    },
    {
      name: 'ChatGPT',
      icon: <ChatGPTIcon className="w-8 h-8 text-[#10a37f]" />,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      plano: 'Plus, Pro, Team, Enterprise',
      limite: 'Requer plano Plus ou superior',
      instrucoes: [
        'Ative o Developer Mode nas configurações',
        'Acesse Settings → Connectors → Add',
        `Cole a URL: ${MCP_URL}`,
        'Faça login com sua conta minhAi',
      ],
      link: 'https://chatgpt.com/settings',
      disponivel: true,
    },
    {
      name: 'Cursor',
      icon: <CursorIcon className="w-8 h-8 text-slate-700 dark:text-slate-200" />,
      bg: 'bg-slate-50 dark:bg-slate-500/10',
      border: 'border-slate-200 dark:border-slate-500/20',
      plano: 'Todos os planos',
      limite: 'Editor de código — para devs',
      instrucoes: [
        'Abra Settings → MCP Servers',
        'Adicione um novo servidor com a URL',
        `URL: ${MCP_URL}`,
      ],
      link: 'https://cursor.sh',
      disponivel: true,
    },
    {
      name: 'Gemini',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12z" fill="url(#gemini-grad)"/>
          <defs>
            <linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4285F4"/>
              <stop offset="1" stopColor="#9B72CB"/>
            </linearGradient>
          </defs>
        </svg>
      ),
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      plano: 'Sem diretório público ainda',
      limite: 'Em breve — via SDK/CLI apenas',
      instrucoes: ['Disponível em breve via diretório público do Gemini'],
      link: null,
      disponivel: false,
    },
  ]

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrações IA</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Conecte o minhAi ao Claude, ChatGPT e outros assistentes de IA via MCP e execute funções diretamente nos principais aplicativos de IA
              {selectedAssistantName && (
                <> — assistente <span className="font-medium text-gray-900 dark:text-white">{selectedAssistantName}</span></>
              )}
            </p>
          </div>

          {/* URL do servidor MCP */}
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-400/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  URL do servidor MCP
                </p>
                <code className="text-lg font-mono font-bold text-blue-900 dark:text-blue-100">
                  {MCP_URL}
                </code>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Cole essa URL no campo de connector de qualquer plataforma compatível com MCP
                </p>
              </div>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar URL'}
              </button>
            </div>
          </div>

          {/* Conexões ativas */}
          {companyId && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-500" />
                Conexões ativas
                {active.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {active.length}
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : active.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 p-8 text-center">
                  <Link2Off className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Nenhuma conexão ativa</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use as instruções abaixo para conectar o Claude ou ChatGPT
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map(conn => (
                    <div key={conn.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm p-4 flex items-center gap-4">
                      {/* Ícone do cliente */}
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                        <ClientIcon name={conn.client_name} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {clientLabel(conn.client_name)}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Conectado
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Último uso: {timeAgo(conn.last_used_at)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Conectado em {new Date(conn.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Revogar */}
                      <button
                        onClick={() => revoke(conn.id)}
                        disabled={revoking === conn.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition border border-red-200 dark:border-red-500/20 disabled:opacity-50"
                      >
                        {revoking === conn.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Link2Off className="w-4 h-4" />}
                        Desconectar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Histório de conexões inativas */}
              {inactive.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition">
                    Ver {inactive.length} conexão{inactive.length !== 1 ? 'ões' : ''} inativa{inactive.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {inactive.map(conn => (
                      <div key={conn.id}
                        className="bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/5 p-3 flex items-center gap-3 opacity-60">
                        <ClientIcon name={conn.client_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{clientLabel(conn.client_name)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {conn.is_active ? 'Token expirado' : 'Desconectado'} — {new Date(conn.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}

          {/* Catálogo de plataformas */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Plataformas disponíveis
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map(p => (
                <div key={p.name}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden ${
                    p.disponivel ? 'border-gray-100 dark:border-white/5' : 'border-gray-100 dark:border-white/5 opacity-60'
                  }`}
                >
                  {/* Header da plataforma */}
                  <div className={`flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 ${p.bg}`}>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center bg-white dark:bg-slate-900 ${p.border}`}>
                      {p.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                        {!p.disponivel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                            Em breve
                          </span>
                        )}
                        {p.disponivel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Disponível
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.limite}</p>
                    </div>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Instruções */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Como conectar
                    </p>
                    <ol className="space-y-2">
                      {p.instrucoes.map((inst, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {inst}
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                      Planos: {p.plano}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Nota sobre DCR */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Registro automático:</strong> O minhAi suporta Dynamic Client Registration (RFC 7591).
              Ao colar a URL no Claude ou ChatGPT, o connector se registra automaticamente — sem necessidade de
              configurar manualmente um Client ID.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function IntegracoesIAPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <IntegracoesDashboardContent />
    </Suspense>
  )
}