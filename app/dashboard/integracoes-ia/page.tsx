// app/dashboard/integracoes-ia/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAssistant } from '@/contexts/AssistantContext'
import { Loader2, Link2, Link2Off, ExternalLink, Zap, AlertCircle, CheckCircle2, Clock, Copy, Check, Smartphone, ToggleLeft, ToggleRight } from 'lucide-react'

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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 1.5L21.5 8.5L12.5 11.5L9.5 20.5L4.5 1.5Z" />
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

function ManusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd">
      <g transform="scale(32)">
        <clipPath id="manus-clip">
          <path d="M0 0h16v16H0z"/>
        </clipPath>
        <g clipPath="url(#manus-clip)">
          <path d="M5.365.775a.627.627 0 01.604-.782c.287 0 .54.2.606.48.042.17.088.338.134.506l.003.011c.105.387.21.773.277 1.18a.628.628 0 01-.615.726.626.626 0 01-.616-.522c-.057-.345-.135-.633-.23-.982v-.001c-.05-.183-.105-.382-.163-.616zm-2.918 1.06a.627.627 0 00.285.835c.445.218.83.433 1.212.863a.624.624 0 00.933-.828c-.544-.613-1.104-.914-1.596-1.155a.627.627 0 00-.834.285zM10.448 14.19c-.113-.025-.237-.05-.364-.079-.467-.101-1.1-.243-1.398-.342l-.022-.007-.021-.008a6.875 6.875 0 00-.727-.189l-.069-.015c-.32-.073-.713-.163-1.086-.275-.386-.118-.863-.292-1.269-.575-.425-.297-.91-.821-.936-1.608a3.215 3.215 0 01.006-.34 1.814 1.814 0 01-.433-.827 1.755 1.755 0 01.02-.85c.055-.211.14-.396.21-.533.024-.047.049-.093.074-.137a8.607 8.607 0 01-.756-.275c-.335-.143-.812-.38-1.168-.76a1.867 1.867 0 01-.473-.885 1.7 1.7 0 01.15-1.12c.403-.806 1.172-1.09 1.855-1.115.618-.022 1.275.15 1.864.357.536.188 1.303.538 1.955.843.215-.353.498-.75.766-1.072l.053-.063.062-.056a2.285 2.285 0 011.373-.592c.237-.017.475.001.706.054l.024.005.015.005h.004l-.318 1.191.319-1.19.139.038.126.068c.643.344.826.937.874 1.25.03.2.028.403-.006.603l-.002.012v.003l-1.238-.247 1.238.248-.007.036-.2.793a1.649 1.649 0 00-.041.365.186.186 0 00.01.071c.009.02.029.064.103.176l.096.143.039.056c.053.078.116.171.182.274.416.647.456 1.268.454 1.666v.018l.158.052.069.021.102.033c.05.016.115.037.178.06.073-.135.271-.424.63-.424.468 0 .66.658.66.658.183 1.225-.653 5.342-1.863 6.109-.924.587-1.608-.285-2.117-1.625zM5.813 8.578c.079-.08.314-.247.758-.297a2.893 2.893 0 011.485.243c.415.184.702.606.822 1.112.059.247.07.487.044.683-.027.207-.085.31-.113.34-.033.04-.152.105-.48.036a2.262 2.262 0 01-.51-.177l-.004-.002a.627.627 0 00-.903.559c0 .229.127.44.33.549l.002.001.021.01a3.547 3.547 0 00.804.28c.41.087 1.167.153 1.68-.435.247-.282.366-.653.41-1a3.199 3.199 0 00-.066-1.132c-.179-.752-.651-1.574-1.532-1.965a4.145 4.145 0 00-2.13-.342 3.11 3.11 0 00-1.126.336l-.014-.004H5.29C4.5 7.149 2.93 6.701 3.318 5.927c.293-.586 1.095-.538 2.183-.156.442.155 1.056.432 1.636.701.18.083.356.167.522.245l.65.302c.462-.554.641-.86.8-1.13.108-.185.208-.353.382-.574l.016-.022.098-.12.013-.011c.428-.378.926-.24.926-.24.285.152.212.537.212.537l-.197.786c-.19.924.02 1.23.364 1.733.06.089.126.183.194.289.274.428.261.84.251 1.176-.007.216-.013.402.06.54.15.283.707.46 1.073.574.088.028.165.052.222.074l.04.015c-.052.16-.099.326-.146.491-.208.736-.415 1.468-1.033 1.687-.421.15-.842.143-1.14.104-.524-.113-1.144-.253-1.377-.33-.242-.09-.581-.167-.95-.251-.877-.2-1.922-.438-2.22-.975a.65.65 0 01-.084-.298c-.017-.493.156-.936.156-.936s-.268.001-.456-.18a.567.567 0 01-.159-.287.892.892 0 01-.017-.294c.006 0 .008-.005.008-.018 0-.156.156-.468.468-.78zM9.385.403a.627.627 0 01.21.856c-.237.39-.374.788-.524 1.388a.626.626 0 01-.607.479.627.627 0 01-.604-.782c.162-.647.336-1.185.668-1.732a.627.627 0 01.857-.21z"/>
        </g>
      </g>
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

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
  if (name.includes('manus')) return 'Manus'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function ClientIcon({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
  const label = clientLabel(name)
  if (label === 'Claude') return <ClaudeIcon className={`${sz} text-[#c96a2d]`} />
  if (label === 'ChatGPT') return <ChatGPTIcon className={`${sz} text-[#10a37f]`} />
  if (label === 'Cursor') return <CursorIcon className={`${sz} text-slate-700 dark:text-slate-200`} />
  if (label === 'Manus') return <ManusIcon className={`${sz} text-slate-900`} />
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

  // ── Estado WhatsApp MCP ─────────────────────────────────────────────────────
  const [mcpWaPhone,     setMcpWaPhone]     = useState('')
  const [mcpWaEnabled,   setMcpWaEnabled]   = useState(false)
  const [mcpWaCompanyId, setMcpWaCompanyId] = useState('')
  const [mcpWaCompanies, setMcpWaCompanies] = useState<{ id: string; name: string }[]>([])
  const [mcpWaSaving,    setMcpWaSaving]    = useState(false)
  const [mcpWaSaved,     setMcpWaSaved]     = useState(false)
  const [mcpWaUserId,    setMcpWaUserId]    = useState<string | null>(null)

  // ── Estado Mercado Livre ────────────────────────────────────────────────────
  const [mlConnection,    setMlConnection]    = useState<any>(null)
  const [mlLoading,       setMlLoading]       = useState(false)
  const [mlDisconnecting, setMlDisconnecting] = useState(false)
  const [mlSaving,        setMlSaving]        = useState(false)
  const [mlSaved,         setMlSaved]         = useState(false)
  const [mlReplyEnabled,  setMlReplyEnabled]  = useState(false)
  const [mlAutoReply,     setMlAutoReply]     = useState(false)
  const [mlPendingCount,  setMlPendingCount]  = useState(0)

  const MCP_URL = 'https://mcp.minhai.app'

  useEffect(() => { if (companyId) load() }, [companyId])
  useEffect(() => { if (companyId) loadMlConnection() }, [companyId])
  useEffect(() => { if (companyId && mlConnection) loadMlQuestions() }, [companyId, mlConnection])

  async function load() {
    setLoading(true)
    try {
      const [{ data: conns }, { data: { user } }] = await Promise.all([
        supabase.from('mcp_connections').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.auth.getUser(),
      ])
      setConnections(conns ?? [])

      if (user) {
        setMcpWaUserId(user.id)

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('mcp_whatsapp, mcp_whatsapp_enabled, mcp_whatsapp_company_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (profile) {
          setMcpWaPhone(profile.mcp_whatsapp ?? '')
          setMcpWaEnabled(profile.mcp_whatsapp_enabled ?? false)
          setMcpWaCompanyId(profile.mcp_whatsapp_company_id ?? '')
        }

        const { data: comps } = await supabase
          .from('companies')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('assistant_type', 'smart')
          .order('created_at', { ascending: true })
        setMcpWaCompanies(comps ?? [])
        if (!mcpWaCompanyId && comps && comps.length > 0) {
          setMcpWaCompanyId(comps[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function saveMcpWa() {
    if (!mcpWaUserId) return
    setMcpWaSaving(true)
    try {
      const normalized = mcpWaPhone.replace(/\D/g, '')
      await supabase
        .from('user_profiles')
        .update({
          mcp_whatsapp:            normalized || null,
          mcp_whatsapp_enabled:    !!normalized,
          mcp_whatsapp_company_id: mcpWaCompanyId || null,
        })
        .eq('user_id', mcpWaUserId)
      setMcpWaPhone(normalized)
      setMcpWaSaved(true)
      setTimeout(() => setMcpWaSaved(false), 3000)
    } finally {
      setMcpWaSaving(false)
    }
  }

  async function loadMlConnection() {
    if (!companyId) return
    setMlLoading(true)
    try {
      const { data } = await supabase
        .from('ml_connections')
        .select('seller_id, seller_nickname, seller_email, is_active, expires_at, last_token_refresh, ml_reply_enabled, ml_auto_reply')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()
      setMlConnection(data ?? null)
      if (data) {
        setMlReplyEnabled(data.ml_reply_enabled ?? false)
        setMlAutoReply(data.ml_auto_reply ?? false)
      }
      const { count } = await supabase
        .from('ml_questions')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')
      setMlPendingCount(count ?? 0)
    } finally {
      setMlLoading(false)
    }
  }

const [mlQuestions,        setMlQuestions]        = useState<any[]>([])
  const [mlQuestionsLoading, setMlQuestionsLoading] = useState(false)
  const [mlSendingId,        setMlSendingId]        = useState<string | null>(null)
  const [mlIgnoringId,       setMlIgnoringId]       = useState<string | null>(null)

  async function loadMlQuestions() {
    if (!companyId) return
    setMlQuestionsLoading(true)
    try {
      const { data } = await supabase
        .from('ml_questions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20)
      setMlQuestions(data ?? [])
    } finally {
      setMlQuestionsLoading(false)
    }
  }

  async function handleSendAnswer(q: any) {
    setMlSendingId(q.id)
    try {
      const res = await fetch('/api/ml/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          question_id: q.ml_question_id,
          resposta: q.resposta_gerada,
        }),
      })
      if (res.ok) {
        setMlQuestions(prev => prev.map(item =>
          item.id === q.id ? { ...item, status: 'sent', sent_at: new Date().toISOString() } : item
        ))
        setMlPendingCount(c => Math.max(0, c - 1))
      }
    } finally {
      setMlSendingId(null)
    }
  }

  async function handleIgnoreQuestion(q: any) {
    setMlIgnoringId(q.id)
    try {
      await supabase
        .from('ml_questions')
        .update({ status: 'ignored' })
        .eq('id', q.id)
      setMlQuestions(prev => prev.map(item =>
        item.id === q.id ? { ...item, status: 'ignored' } : item
      ))
      setMlPendingCount(c => Math.max(0, c - 1))
    } finally {
      setMlIgnoringId(null)
    }
  }

  async function disconnectMl() {
    if (!companyId) return
    setMlDisconnecting(true)
    try {
      await fetch('/api/ml/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      })
      setMlConnection(null)
    } finally {
      setMlDisconnecting(false)
    }
  }

  async function saveMlConfig() {
    if (!companyId) return
    setMlSaving(true)
    try {
      await supabase
        .from('ml_connections')
        .update({ ml_reply_enabled: mlReplyEnabled, ml_auto_reply: mlAutoReply })
        .eq('company_id', companyId)
      setMlSaved(true)
      setTimeout(() => setMlSaved(false), 3000)
    } finally {
      setMlSaving(false)
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

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">

{/* Header */}
<div>
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
    Integrações IA
  </h1>

  <p className="text-gray-500 dark:text-gray-400 mt-1">
    Conecte o
    {selectedAssistantName ? (
      <>
        {" "}
        assistente{" "}
        <span className="font-medium text-gray-900 dark:text-white">
          {selectedAssistantName}
        </span>
      </>
    ) : (
      " assistente"
    )}{" "}
    ao Claude, ChatGPT e outros via MCP para usar as funções da minhAi diretamente nos principais aplicativos de IA.
  </p>
</div>

          {/* URL do servidor MCP */}
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-400/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-2">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Zap className="w-4 h-4 flex-shrink-0" />
                URL do servidor MCP
              </p>
              <button
                onClick={copyUrl}
                title="Copiar URL"
                className="inline-flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {copied ? 'Copiado!' : 'Copiar URL'}
                </span>
              </button>
            </div>
            <div>
              <code className="text-lg sm:text-xl font-mono font-bold text-blue-900 dark:text-blue-100 break-all">
                {MCP_URL}
              </code>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Cole essa URL no campo de connector de qualquer plataforma compatível com MCP
              </p>
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
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                        <ClientIcon name={conn.client_name} />
                      </div>
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

          {/* Plataformas — único grid unificado */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Plataformas disponíveis
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ChatGPT */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-emerald-50 dark:bg-emerald-500/10">
                  <div className="w-12 h-12 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <ChatGPTIcon className="w-8 h-8 text-[#10a37f]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">ChatGPT</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Disponível</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Requer plano Plus ou superior</p>
                  </div>
                  <a href="https://chatgpt.com/settings" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Como conectar</p>
                  <ol className="space-y-2">
                    {['Ative o Developer Mode nas configurações', 'Acesse Settings → Connectors → Add', `Cole a URL: ${MCP_URL}`, 'Faça login com sua conta minhAi'].map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Planos: Plus, Pro, Team, Enterprise</p>
                </div>
              </div>

              {/* Claude */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-amber-50 dark:bg-amber-500/10">
                  <div className="w-12 h-12 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <ClaudeIcon className="w-8 h-8 text-[#d97706]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Claude</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Disponível</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">1 connector no plano gratuito</p>
                  </div>
                  <a href="https://claude.ai/settings" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Como conectar</p>
                  <ol className="space-y-2">
                    {['Acesse Settings → Connectors → Add custom connector', `Cole a URL: ${MCP_URL}`, 'Faça login com sua conta minhAi', 'Selecione o assistente e autorize'].map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Planos: Free, Pro, Max, Team, Enterprise</p>
                </div>
              </div>

              {/* Manus */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-slate-500/10">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-500/20 bg-white flex items-center justify-center flex-shrink-0">
                    <ManusIcon className="w-8 h-8 text-slate-900" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Manus</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Disponível</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Agente autônomo com suporte a MCP</p>
                  </div>
                  <a href="https://manus.im" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Como conectar</p>
                  <ol className="space-y-2">
                    {['Acesse Settings → Integrations → MCP', `Cole a URL: ${MCP_URL}`, 'Faça login com sua conta minhAi', 'Selecione o assistente e autorize'].map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Planos: Todos os planos</p>
                </div>
              </div>

              {/* Cursor */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-slate-50 dark:bg-slate-500/10">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-500/20 bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <CursorIcon className="w-8 h-8 text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Cursor</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Disponível</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Editor de código — para devs</p>
                  </div>
                  <a href="https://cursor.sh" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Como conectar</p>
                  <ol className="space-y-2">
                    {['Abra Settings → MCP Servers', 'Adicione um novo servidor com a URL', `URL: ${MCP_URL}`].map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Planos: Todos os planos</p>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-green-50 dark:bg-green-500/10">
                  <div className="w-12 h-12 rounded-xl border border-green-200 dark:border-green-500/20 bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-7 h-7 text-[#25d366]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">WhatsApp MCP</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Novo</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie seu assistente pelo WhatsApp pessoal</p>
                  </div>
                  <button onClick={() => setMcpWaEnabled(v => !v)} className="flex-shrink-0" title={mcpWaEnabled ? 'Desativar' : 'Ativar'}>
                    {mcpWaEnabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                  </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Seu número pessoal</label>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="tel"
                          placeholder="5511987654321"
                          value={mcpWaPhone}
                          onChange={e => setMcpWaPhone(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Com DDI + DDD, sem + ou espaços</p>
                    </div>
                    {mcpWaCompanies.length > 0 && (
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Assistente Smart</label>
                        <select
                          value={mcpWaCompanyId}
                          onChange={e => setMcpWaCompanyId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        >
                          {mcpWaCompanies.map(c => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Como usar após salvar:</p>
                    <p>1. Cadastre seu número e ative o toggle</p>
                    <p>2. Envie qualquer mensagem para o WhatsApp minhAi:</p>
                    <p className="font-mono font-bold text-gray-800 dark:text-gray-200">wa.me/5511926828418</p>
                    <p>3. O assistente responderá como seu MCP pessoal</p>
                  </div>
                  <button
                    onClick={saveMcpWa}
                    disabled={mcpWaSaving || !mcpWaPhone}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#25d366] hover:bg-[#1ebe5d] disabled:opacity-50 text-white transition flex items-center justify-center gap-2"
                  >
                    {mcpWaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : mcpWaSaved ? <><Check className="w-4 h-4" /> Salvo!</> : 'Salvar configuração'}
                  </button>
                </div>
              </div>

              {/* Mercado Livre */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-yellow-50 dark:bg-yellow-500/5">
                  <div className="w-12 h-12 rounded-xl border border-yellow-200 dark:border-yellow-500/20 bg-white dark:bg-slate-900 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                    <img src="https://companieslogo.com/img/orig/MELI-ec0c0e4f.png?t=1648156112" alt="Mercado Livre" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-white">Mercado Livre</h3>
                      {mlConnection ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />Conectado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">Não conectado</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Publique produtos do minhAi direto no seu perfil do ML</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                  {mlLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                    </div>
                  ) : mlConnection ? (
                    <>
                      {/* Seller info compacto */}
                      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                            {mlConnection.seller_nickname || `Seller ${mlConnection.seller_id}`}
                            {mlConnection.seller_email && (
                              <span className="font-normal text-emerald-600 dark:text-emerald-400"> · {mlConnection.seller_email}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                            Token renovado {timeAgo(mlConnection.last_token_refresh)}
                          </p>
                        </div>
                      </div>

                      {/* Toggle: Responder perguntas */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            Responder perguntas com IA
                            {mlPendingCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                {mlPendingCount} pendente{mlPendingCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Mesma configuração do assistente · 2 créditos por resposta</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMlReplyEnabled(v => !v)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                            mlReplyEnabled ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-slate-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            mlReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>

                      {/* Toggle: Envio automático */}
                      {mlReplyEnabled && (
                        <div className="flex items-center justify-between gap-3 pl-3 border-l-2 border-yellow-300 dark:border-yellow-500/40">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Envio automático</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {mlAutoReply ? 'Responde sem aprovação' : 'Aguarda sua aprovação no painel'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMlAutoReply(v => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                              mlAutoReply ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-slate-600'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              mlAutoReply ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      )}

                      {/* Funcionalidades ativas */}
                      <div className="space-y-1.5">
                        {[
                          { label: 'Publicar produtos', sub: 'em Vendas → Produtos' },
                          { label: 'Preço e estoque sincronizados', sub: 'atualiza ao editar o produto' },
                          { label: 'Respostas com IA', sub: mlReplyEnabled ? (mlAutoReply ? 'modo automático ativo' : 'aguardando aprovação manual') : 'ativar toggle acima' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0 mt-1.5" />
                            <div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500"> · {item.sub}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botões */}
                      <div className="flex gap-2">
                        <button
                          onClick={saveMlConfig}
                          disabled={mlSaving || mlSaved}
                          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#FFE600] hover:bg-yellow-400 text-gray-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {mlSaving
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : mlSaved
                              ? <><Check className="w-4 h-4" /> Salvo!</>
                              : 'Salvar'
                          }
                        </button>
                        <button
                          onClick={disconnectMl}
                          disabled={mlDisconnecting}
                          className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition border border-red-200 dark:border-red-500/20 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {mlDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Conecte sua conta do Mercado Livre para publicar produtos automaticamente a partir do seu catálogo minhAi.
                        </p>
                      </div>
                      {/* Funcionalidades disponíveis */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">O que você poderá fazer:</p>
                        {[
                          'Publicar produtos do catálogo minhAi no ML',
                          'Sincronizar preço e estoque automaticamente',
                          'Responder perguntas dos anúncios com IA',
                          'Modo automático ou com aprovação manual',
                        ].map((item, i) => (
                          <p key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                            <span>{item}</span>
                          </p>
                        ))}
                      </div>
                      {companyId && (
                        <a
                          href={`/api/ml/authorize?company_id=${companyId}`}
                          className="w-full py-2.5 bg-[#FFE600] hover:bg-yellow-400 text-gray-900 text-sm font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Conectar conta do Mercado Livre
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </section>

{/* Painel de perguntas ML */}
          {companyId && mlConnection && mlReplyEnabled && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <img
                  src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.5/mercadolibre/logo__large_plus.png"
                  alt="ML"
                  className="h-5 object-contain"
                />
                Perguntas do Mercado Livre
                {mlPendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                    {mlPendingCount} pendente{mlPendingCount !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={loadMlQuestions}
                  disabled={mlQuestionsLoading}
                  className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400"
                >
                  <svg className={`w-4 h-4 ${mlQuestionsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </h2>

              {mlQuestionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                </div>
              ) : mlQuestions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 p-8 text-center">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Nenhuma pergunta ainda</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    As perguntas dos seus anúncios aparecerão aqui assim que chegarem
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mlQuestions.map(q => (
                    <div key={q.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">

                      {/* Header da pergunta */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                            {q.produto_nome ?? `Anúncio ${q.ml_item_id}`}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {new Date(q.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                          q.status === 'sent'    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          q.status === 'ignored' ? 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' :
                          q.status === 'error'   ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                                                   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {q.status === 'sent'    ? '✓ Enviada' :
                           q.status === 'ignored' ? 'Ignorada'  :
                           q.status === 'error'   ? 'Erro'      : 'Pendente'}
                        </span>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Pergunta */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Pergunta</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{q.texto_pergunta}</p>
                        </div>

                        {/* Resposta gerada */}
                        {q.resposta_gerada && (
                          <div className={`rounded-xl p-3 ${
                            q.status === 'sent'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20'
                          }`}>
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                              Resposta {q.status === 'sent' ? 'enviada' : 'sugerida pela IA'}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{q.resposta_gerada}</p>
                          </div>
                        )}

                        {/* Ações — só para pendentes */}
                        {q.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendAnswer(q)}
                              disabled={mlSendingId === q.id}
                              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#FFE600] hover:bg-yellow-400 text-gray-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {mlSendingId === q.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : 'Enviar resposta'
                              }
                            </button>
                            <button
                              onClick={() => handleIgnoreQuestion(q)}
                              disabled={mlIgnoringId === q.id}
                              className="px-4 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition border border-gray-200 dark:border-white/10 disabled:opacity-50"
                            >
                              {mlIgnoringId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ignorar'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Nota sobre DCR */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Registro automático:</strong> O minhAi suporta Dynamic Client Registration (RFC 7591).
              Ao colar a URL no Claude ou ChatGPT, o connector se registra automaticamente — em breve os aplicativos estarão disponíveis diretamente nos apps, nem necessidade de conexão manual.
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
