// app/mcp/authorize/page.tsx
// Tela OAuth do MCP — login com email/senha ou Google
// Mesma identidade visual do login principal do minhAi

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams }               from 'next/navigation'
import { createBrowserClient }           from '@supabase/ssr'
import Image                             from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

function AuthorizeContent() {
  const searchParams = useSearchParams()

  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const state       = searchParams.get('state') ?? ''
  const clientId    = searchParams.get('client_id') ?? ''
  const clientName  = clientId.toLowerCase().includes('openai') ? 'ChatGPT' : 'Claude'

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

    // Voltou do Google OAuth já autenticado — pular direto para confirmação
    const googleDone = searchParams.get('google_done')
    if (googleDone === '1') {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) loadCompanies(data.user.id)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login com email/senha ────────────────────────────────────────────────────
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

  // ── Login com Google ─────────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      // Salva os params MCP em cookie (sobrevive ao redirect do Google)
      // sessionStorage não funciona pois o Google redireciona para outra origem
      const mcpParams = encodeURIComponent(JSON.stringify({
        redirect_uri: redirectUri,
        state:        state,
        client_id:    clientId,
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

  // ── Carregar empresas após autenticação ──────────────────────────────────────
  async function loadCompanies(userId: string) {
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setCompanies(comps ?? [])
    if (comps && comps.length > 0) setSelectedCompany(comps[0].id)
    setStep('confirm')
  }

  // ── Autorizar acesso ao assistente selecionado ───────────────────────────────
  async function handleAuthorize() {
    if (!selectedCompany || !user) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mcp/oauth/code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:     user.id,
          company_id:  selectedCompany,
          client_name: clientName.toLowerCase(),
          scopes:      ['tools'],
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

  // ── Estilos reutilizáveis ────────────────────────────────────────────────────
  const isDark   = theme === 'dark'
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

          {/* Header — logo centralizado */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3">
              <Image
                src="/logo.png"
                alt="minhAi"
                width={160}
                height={82}
                className="rounded-xl"
                priority
              />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {step === 'login' ? `Conectar ao ${clientName}` : `Autorizar ${clientName}`}
            </h1>
            <p className={isDark ? 'text-white/60 text-sm' : 'text-gray-500 text-sm'}>
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
              {/* Botão Google */}
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

              {/* Divisor */}
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

              {/* Formulário email/senha */}
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
              {/* Permissões */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-700/50 border border-white/10' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-sm mb-3 font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  O <strong className={isDark ? 'text-white' : 'text-gray-900'}>{clientName}</strong> terá acesso a:
                </p>
                {[
                  '💰 Gerar PIX e Link de Pagamento',
                  '📅 Agendar e ver compromissos',
                  '🔍 Consultas (CNPJ, CPF, CEP, Placa)',
                  '📧 Enviar emails e notas fiscais',
                  '🔗 QR Codes, câmbio e rastreios',
                ].map((item, i) => (
                  <p key={i} className={`text-sm py-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{item}</p>
                ))}
              </div>

              {/* Seleção de empresa */}
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

          {/* Rodapé */}
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