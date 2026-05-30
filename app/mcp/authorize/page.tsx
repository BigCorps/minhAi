// app/mcp/authorize/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams }               from 'next/navigation'
import { createBrowserClient }           from '@supabase/ssr'
import Image                             from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle, Coins, CalendarDays, Search, Mail, Link, Zap } from 'lucide-react'

// ── Ícones SVG dos apps ───────────────────────────────────────────────────────
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
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
      <path d="M4.5 1.5L21.5 8.5L12.5 11.5L9.5 20.5L4.5 1.5Z" />
    </svg>
  )
}

function ManusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd">
      <g transform="scale(32)">
        <clipPath id="manus-clip-auth">
          <path d="M0 0h16v16H0z"/>
        </clipPath>
        <g clipPath="url(#manus-clip-auth)">
          <path d="M5.365.775a.627.627 0 01.604-.782c.287 0 .54.2.606.48.042.17.088.338.134.506l.003.011c.105.387.21.773.277 1.18a.628.628 0 01-.615.726.626.626 0 01-.616-.522c-.057-.345-.135-.633-.23-.982v-.001c-.05-.183-.105-.382-.163-.616zm-2.918 1.06a.627.627 0 00.285.835c.445.218.83.433 1.212.863a.624.624 0 00.933-.828c-.544-.613-1.104-.914-1.596-1.155a.627.627 0 00-.834.285zM10.448 14.19c-.113-.025-.237-.05-.364-.079-.467-.101-1.1-.243-1.398-.342l-.022-.007-.021-.008a6.875 6.875 0 00-.727-.189l-.069-.015c-.32-.073-.713-.163-1.086-.275-.386-.118-.863-.292-1.269-.575-.425-.297-.91-.821-.936-1.608a3.215 3.215 0 01.006-.34 1.814 1.814 0 01-.433-.827 1.755 1.755 0 01.02-.85c.055-.211.14-.396.21-.533.024-.047.049-.093.074-.137a8.607 8.607 0 01-.756-.275c-.335-.143-.812-.38-1.168-.76a1.867 1.867 0 01-.473-.885 1.7 1.7 0 01.15-1.12c.403-.806 1.172-1.09 1.855-1.115.618-.022 1.275.15 1.864.357.536.188 1.303.538 1.955.843.215-.353.498-.75.766-1.072l.053-.063.062-.056a2.285 2.285 0 011.373-.592c.237-.017.475.001.706.054l.024.005.015.005h.004l-.318 1.191.319-1.19.139.038.126.068c.643.344.826.937.874 1.25.03.2.028.403-.006.603l-.002.012v.003l-1.238-.247 1.238.248-.007.036-.2.793a1.649 1.649 0 00-.041.365.186.186 0 00.01.071c.009.02.029.064.103.176l.096.143.039.056c.053.078.116.171.182.274.416.647.456 1.268.454 1.666v.018l.158.052.069.021.102.033c.05.016.115.037.178.06.073-.135.271-.424.63-.424.468 0 .66.658.66.658.183 1.225-.653 5.342-1.863 6.109-.924.587-1.608-.285-2.117-1.625zM5.813 8.578c.079-.08.314-.247.758-.297a2.893 2.893 0 011.485.243c.415.184.702.606.822 1.112.059.247.07.487.044.683-.027.207-.085.31-.113.34-.033.04-.152.105-.48.036a2.262 2.262 0 01-.51-.177l-.004-.002a.627.627 0 00-.903.559c0 .229.127.44.33.549l.002.001.021.01a3.547 3.547 0 00.804.28c.41.087 1.167.153 1.68-.435.247-.282.366-.653.41-1a3.199 3.199 0 00-.066-1.132c-.179-.752-.651-1.574-1.532-1.965a4.145 4.145 0 00-2.13-.342 3.11 3.11 0 00-1.126.336l-.014-.004H5.29C4.5 7.149 2.93 6.701 3.318 5.927c.293-.586 1.095-.538 2.183-.156.442.155 1.056.432 1.636.701.18.083.356.167.522.245l.65.302c.462-.554.641-.86.8-1.13.108-.185.208-.353.382-.574l.016-.022.098-.12.013-.011c.428-.378.926-.24.926-.24.285.152.212.537.212.537l-.197.786c-.19.924.02 1.23.364 1.733.06.089.126.183.194.289.274.428.261.84.251 1.176-.007.216-.013.402.06.54.15.283.707.46 1.073.574.088.028.165.052.222.074l.04.015c-.052.16-.099.326-.146.491-.208.736-.415 1.468-1.033 1.687-.421.15-.842.143-1.14.104-.524-.113-1.144-.253-1.377-.33-.242-.09-.581-.167-.95-.251-.877-.2-1.922-.438-2.22-.975a.65.65 0 01-.084-.298c-.017-.493.156-.936.156-.936s-.268.001-.456-.18a.567.567 0 01-.159-.287.892.892 0 01-.017-.294c.006 0 .008-.005.008-.018 0-.156.156-.468.468-.78zM9.385.403a.627.627 0 01.21.856c-.237.39-.374.788-.524 1.388a.626.626 0 01-.607.479.627.627 0 01-.604-.782c.162-.647.336-1.185.668-1.732a.627.627 0 01.857-.21z"/>
        </g>
      </g>
    </svg>
  )
}

// ── Detecção do cliente ───────────────────────────────────────────────────────
function detectClient(clientId: string, clientNameHint: string): { key: string; label: string } {
  const id   = clientId.toLowerCase()
  const hint = clientNameHint.toLowerCase()

  if (id.includes('openai') || id.includes('chatgpt') || id.includes('gpt') ||
      hint.includes('openai') || hint.includes('chatgpt') || hint.includes('gpt')) {
    return { key: 'chatgpt', label: 'ChatGPT' }
  }
  if (id.includes('cursor') || hint.includes('cursor')) {
    return { key: 'cursor', label: 'Cursor' }
  }
  if (id.includes('manus') || hint.includes('manus')) {
    return { key: 'manus', label: 'Manus' }
  }
  if (id.includes('claude') || id.includes('anthropic') ||
      hint.includes('claude') || hint.includes('anthropic')) {
    return { key: 'claude', label: 'Claude' }
  }


const fallbackLabel = clientNameHint?.trim()
  ? clientNameHint.charAt(0).toUpperCase() + clientNameHint.slice(1).toLowerCase()
  : clientIdParam?.trim()
  ? clientIdParam.charAt(0).toUpperCase() + clientIdParam.slice(1).toLowerCase()
  : 'Claude'

return { key: 'unknown', label: fallbackLabel }
}

const CLIENT_META: Record<string, { icon: React.ReactNode }> = {
  claude:  { icon: <ClaudeIcon className="w-7 h-7 text-[#c96a2d]" /> },
  chatgpt: { icon: <ChatGPTIcon className="w-7 h-7 text-[#10a37f]" /> },
  cursor:  { icon: <CursorIcon className="w-7 h-7 text-slate-700 dark:text-slate-200" /> },
  manus:   {
    icon: (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-white">
        <ManusIcon className="w-5 h-5 text-slate-900" />
      </span>
    ),
  },
  unknown: { icon: <Zap className="w-7 h-7 text-blue-400" /> },
}

// ── Componente principal ──────────────────────────────────────────────────────
function AuthorizeContent() {
  const searchParams = useSearchParams()

  const redirectUri         = searchParams.get('redirect_uri') ?? ''
  const state               = searchParams.get('state') ?? ''
  const clientIdParam       = searchParams.get('client_id') ?? ''
  const clientNameParam     = searchParams.get('client_name') ?? ''
  const codeChallenge       = searchParams.get('code_challenge') ?? ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? 'S256'

  const { key: clientKey, label: clientName } = detectClient(clientIdParam, clientNameParam)
  const clientMeta = CLIENT_META[clientKey]

  const [step,            setStep]            = useState<'login' | 'confirm'>('login')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [theme,           setTheme]           = useState<'dark' | 'light'>('dark')
  const [user,            setUser]            = useState<any>(null)
  const [companies,       setCompanies]       = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(isDark ? 'dark' : 'light')

    const googleDone = searchParams.get('google_done')
    if (googleDone === '1') {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) loadCompanies(data.user.id)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const formData = new FormData(e.currentTarget)
      const email    = formData.get('email') as string
      const password = formData.get('password') as string

      const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) throw loginErr

      await loadCompanies(data.user!.id)
    } catch (err: any) {
      setError(err.message ?? 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      const mcpParams = encodeURIComponent(JSON.stringify({
        redirect_uri: redirectUri,
        state:        state,
        client_id:    clientIdParam,
      }))
      document.cookie = `mcp_oauth_params=${mcpParams}; path=/; max-age=300; SameSite=Lax; Secure`

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (oauthErr) throw oauthErr
    } catch (err: any) {
      setError(err.message ?? 'Erro ao fazer login com Google')
      setLoading(false)
    }
  }

  async function loadCompanies(userId: string) {
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name, slug, assistant_type')
      .eq('user_id', userId)
      .eq('assistant_type', 'smart')
      .order('created_at', { ascending: true })

    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setCompanies(comps ?? [])
    if (comps && comps.length > 0) setSelectedCompany(comps[0].id)
    setStep('confirm')
  }

  async function handleAuthorize() {
    if (!selectedCompany || !user) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mcp/oauth/code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:               user.id,
          company_id:            selectedCompany,
          client_name: clientName.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'claude',
          scopes:                ['tools'],
          code_challenge:        codeChallenge || undefined,
          code_challenge_method: codeChallengeMethod || 'S256',
        }),
      })

      const { code } = await res.json()
      if (!code) throw new Error('Falha ao gerar código de autorização')

      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('code', code)
      callbackUrl.searchParams.set('state', state)
      window.location.href = callbackUrl.toString()

    } catch (err: any) {
      setError(err.message ?? 'Erro ao autorizar')
      setLoading(false)
    }
  }

  const selectedComp = companies.find(c => c.id === selectedCompany)
  const isDark       = theme === 'dark'

  const inputCls = `w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
    isDark
      ? 'bg-slate-700/50 border border-white/10 text-white placeholder-white/40'
      : 'bg-white border border-gray-300 text-gray-900'
  }`
  const labelCls = `block text-sm font-medium mb-2 ${isDark ? 'text-white/90' : 'text-gray-700'}`

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-6 transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>

      {/* Toggle de tema */}
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl border transition-all hover:scale-110 ${
          isDark
            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
        }`}
      >
        {isDark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="max-w-md w-full">
        <div className={`rounded-2xl shadow-xl p-6 sm:p-8 transition-colors ${
          isDark
            ? 'bg-slate-800/50 backdrop-blur-xl border border-white/10'
            : 'bg-white'
        }`}>

          {/* Header — logo minhAi | ícone do app */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="minhAi"
                width={120}
                height={62}
                className="rounded-xl"
                priority
              />
              <span className={`text-2xl font-thin select-none ${isDark ? 'text-white/20' : 'text-gray-300'}`}>|</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-white/10' : 'bg-gray-100'
              }`}>
                {clientMeta.icon}
              </div>
            </div>
            <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {step === 'login' ? `Conectar ao ${clientName}` : `Autorizar ${clientName}`}
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              {step === 'login'
                ? 'Entre com sua conta minhAi para continuar'
                : 'Selecione qual assistente conectar'}
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ── STEP: Login ─────────────────────────────────────────────────────── */}
          {step === 'login' && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full px-6 py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-3 mb-4 ${
                  isDark
                    ? 'bg-slate-700/50 border border-white/10 hover:bg-slate-700/70'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className={`font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
                  Continuar com Google
                </span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`px-2 ${isDark ? 'bg-slate-800/50 text-white/40' : 'bg-white text-gray-500'}`}>
                    ou use seu e-mail
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="seu@email.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="••••••••"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP: Confirmar empresa ──────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div>
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-700/50 border border-white/10' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-sm mb-3 font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  O <strong className={isDark ? 'text-white' : 'text-gray-900'}>{clientName}</strong> terá acesso a:
                </p>
                {[
                  { icon: <Coins className="w-4 h-4 shrink-0" />,       label: 'Gerar PIX e Link de Pagamento' },
                  { icon: <CalendarDays className="w-4 h-4 shrink-0" />, label: 'Agendar e ver compromissos' },
                  { icon: <Search className="w-4 h-4 shrink-0" />,       label: 'Consultas (CNPJ, CPF, CEP, Placa)' },
                  { icon: <Mail className="w-4 h-4 shrink-0" />,         label: 'Enviar emails e notas fiscais' },
                  { icon: <Link className="w-4 h-4 shrink-0" />,         label: 'QR Codes, câmbio e rastreios' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 py-1 text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-white/40' : 'text-gray-400'}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              {companies.length === 0 && (
                <div className={`rounded-xl p-4 mb-5 text-sm ${isDark ? 'bg-amber-900/20 border border-amber-500/30 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                  <p className="font-semibold mb-1">⚠️ Nenhum assistente Smart encontrado</p>
                  <p>O MCP cobra créditos por uso e funciona apenas com assistentes na versão <strong>Smart</strong>.</p>
                  <p className="mt-2">
                    <a href="https://minhai.app/dashboard/assistentes" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Criar um assistente Smart →
                    </a>
                  </p>
                </div>
              )}

              {companies.length > 1 && (
                <div className="mb-4">
                  <label className={labelCls}>Qual assistente conectar?</label>
                  <select
                    value={selectedCompany}
                    onChange={e => setSelectedCompany(e.target.value)}
                    className={inputCls}
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    Apenas assistentes Smart são exibidos. Assistentes na versão Vendas não consomem créditos e não são compatíveis com MCP.
                  </p>
                </div>
              )}

              {selectedComp && (
                <p className={`text-xs text-center mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Conectando: <strong className={isDark ? 'text-white/60' : 'text-gray-600'}>{selectedComp.name}</strong>
                </p>
              )}

              <button
                onClick={handleAuthorize}
                disabled={loading || !selectedCompany}
                className="w-full px-6 py-3 bg-[#b0cb1f] hover:bg-[#8ca214] text-white rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Autorizar ${clientName}`}
              </button>

              <button
                onClick={() => { setStep('login'); setUser(null); setCompanies([]) }}
                className={`w-full py-2.5 text-sm rounded-lg border transition ${
                  isDark
                    ? 'border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5'
                    : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Voltar
              </button>
            </div>
          )}

          <p className={`text-xs text-center mt-6 leading-relaxed ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Seus créditos serão consumidos normalmente por cada ação executada.
            <br />
            Você pode revogar o acesso a qualquer momento no dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function McpAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <AuthorizeContent />
    </Suspense>
  )
}