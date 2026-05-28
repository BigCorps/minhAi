// app/mcp/authorize/page.tsx
// Página que o usuário vê ao conectar o minhAi no Claude ou ChatGPT
// Exibe login + confirmação de autorização
// Após autenticar, gera um code e redireciona de volta para o cliente MCP

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter }     from 'next/navigation'
import { createBrowserClient }            from '@supabase/ssr'

const LOGO_URL = 'https://minhai.app/icons/icon-192x192.png'

function AuthorizeContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const state       = searchParams.get('state') ?? ''
  const clientId    = searchParams.get('client_id') ?? ''
  const clientName  = clientId.includes('openai') ? 'ChatGPT' : 'Claude'

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [step,      setStep]      = useState<'login' | 'confirm'>('login')
  const [user,      setUser]      = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) throw loginErr

      // Buscar empresas do usuário
      const { data: comps } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', data.user!.id)
        .order('created_at', { ascending: true })

      setUser(data.user)
      setCompanies(comps ?? [])
      if (comps && comps.length > 0) setSelectedCompany(comps[0].id)
      setStep('confirm')

    } catch (err: any) {
      setError(err.message ?? 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  async function handleAuthorize() {
    if (!selectedCompany) return
    setLoading(true)
    setError('')

    try {
      // Gerar authorization_code via API
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

      // Redirecionar de volta para o cliente MCP com o code
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

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={LOGO_URL} alt="minhAi" style={{ width: '64px', height: '64px', borderRadius: '16px' }} />
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '12px 0 4px' }}>
            minhAi
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            {step === 'login'
              ? `Conectar ao ${clientName}`
              : `Autorizar acesso do ${clientName}`}
          </p>
        </div>

        {/* STEP: Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px', background: '#0f172a',
                  border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9',
                  fontSize: '15px', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px', background: '#0f172a',
                  border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9',
                  fontSize: '15px', boxSizing: 'border-box',
                }}
              />
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* STEP: Confirmar autorização */}
        {step === 'confirm' && (
          <div>
            <div style={{
              background: '#0f172a', borderRadius: '10px', padding: '16px', marginBottom: '24px',
            }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px' }}>
                O <strong style={{ color: '#f1f5f9' }}>{clientName}</strong> terá acesso às seguintes funções:
              </p>
              {[
                '💰 Gerar PIX e Link de Pagamento',
                '📅 Agendar e ver compromissos',
                '🔍 Consultas (CNPJ, CPF, CEP, Placa)',
                '📧 Enviar emails',
                '🧾 Emitir notas fiscais',
                '🔗 Gerar QR Codes',
                '🌍 Cotação de câmbio e rastreios',
              ].map((item, i) => (
                <div key={i} style={{ color: '#e2e8f0', fontSize: '13px', padding: '4px 0' }}>
                  {item}
                </div>
              ))}
            </div>

            {/* Seleção de empresa (se tiver mais de uma) */}
            {companies.length > 1 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Qual empresa conectar?
                </label>
                <select
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: '#0f172a',
                    border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9',
                    fontSize: '14px', boxSizing: 'border-box',
                  }}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedComp && (
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px', textAlign: 'center' }}>
                Conectando: <strong style={{ color: '#94a3b8' }}>{selectedComp.name}</strong>
              </p>
            )}

            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
            )}

            <button
              onClick={handleAuthorize}
              disabled={loading || !selectedCompany}
              style={{
                width: '100%', padding: '12px', background: '#10b981', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                marginBottom: '12px',
              }}
            >
              {loading ? 'Autorizando...' : `Autorizar ${clientName}`}
            </button>

            <button
              onClick={() => setStep('login')}
              style={{
                width: '100%', padding: '10px', background: 'transparent', color: '#64748b',
                border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
              }}
            >
              Voltar
            </button>
          </div>
        )}

        <p style={{ color: '#475569', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>
          Seus créditos serão consumidos normalmente por cada ação executada.
          <br />
          Você pode revogar o acesso a qualquer momento no dashboard.
        </p>
      </div>
    </div>
  )
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f172a', minHeight: '100vh' }} />}>
      <AuthorizeContent />
    </Suspense>
  )
}