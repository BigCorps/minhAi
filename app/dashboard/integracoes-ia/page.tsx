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
      <path d="M17.304 1.273a.31.31 0 0 0-.31.086L4.922 13.43a.31.31 0 0 0 .22.529h3.978l-2.68 8.358a.31.31 0 0 0 .537.272L19.056 10.54a.31.31 0 0 0-.222-.529h-3.825l2.607-8.184a.31.31 0 0 0-.312-.554Z"/>
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

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.925 24l-5.975-5.975L.975 24 0 23.025l5.95-5.95L0 11.1l.975-.975 5.95 5.95L12.9.975 13.875 0l5.95 5.95L24 .975 24 2.2l-5.175 5.175 5.175 5.175V13.8l-5.95-5.95-5.95 5.95 5.95 5.95V21L11.925 24z"/>
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
  if (label === 'Claude') return <ClaudeIcon className={`${sz} text-[#d97706]`} />
  if (label === 'ChatGPT') return <ChatGPTIcon className={`${sz} text-[#10a37f]`} />
  if (label === 'Cursor') return <CursorIcon className={`${sz} text-white`} />
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
              Conecte o minhAi ao Claude, ChatGPT e outros assistentes de IA via MCP
              {selectedAssistantName && (
                <> — assistente <span className="font-medium text-gray-900 dark:text-white">{selectedAssistantName}</span></>
              )}
            </p>
          </div>

          {/* URL do servidor MCP */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  URL do servidor MCP
                </p>
                <code className="text-lg font-mono font-bold text-indigo-900 dark:text-indigo-100">
                  {MCP_URL}
                </code>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Cole essa URL no campo de connector de qualquer plataforma compatível com MCP
                </p>
              </div>
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition shadow-sm flex-shrink-0"
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
              <Zap className="w-5 h-5 text-indigo-500" />
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
