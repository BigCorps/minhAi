// app/dashboard/integracoes-ia/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAssistant } from '@/contexts/AssistantContext'
import { Loader2, Link2, Link2Off, ExternalLink, Zap, AlertCircle, CheckCircle2, Clock, Copy, Check } from 'lucide-react'

// ── Ícones SVG ────────────────────────────────────────────────────────────────
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
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