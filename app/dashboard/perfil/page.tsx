// app/dashboard/perfil/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { 
  User, Mail, Lock, Camera, Save, Loader2, 
  AlertCircle, CheckCircle2, Fingerprint, Trash2, 
  Smartphone, ShieldCheck, Wallet, Key, Edit, Unlink
} from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // User details states
  const [userName, setUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Documento states
  const [documento, setDocumento] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState<'cpf' | 'cnpj'>('cpf');

  // Pix states
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  
  // Biometrics states
  const [authenticators, setAuthenticators] = useState<any[]>([]);
  const [isBiometrySupported, setIsBiometrySupported] = useState(false);
  const [registeringBiometry, setRegisteringBiometry] = useState(false);

  // Google linking states
  const [linkedIdentities, setLinkedIdentities] = useState<string[]>([]);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // ── Feedback ao retornar do OAuth de vinculação ──────────────────────────
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('linked') === 'google') {
      setMessage({ 
        type: 'success', 
        text: 'Conta Google vinculada com sucesso! Agora você pode entrar com Google ou email.' 
      });
      window.history.replaceState({}, '', '/dashboard/perfil');
    }
    // ─────────────────────────────────────────────────────────────────────────

    async function loadData() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (authUser) {
          setUser(authUser);
          setUserName(authUser.user_metadata?.name || '');

          // ── Identidades vinculadas ─────────────────────────────────────────
          const identities = authUser.identities?.map((i: any) => i.provider) || [];
          setLinkedIdentities(identities);
          // ──────────────────────────────────────────────────────────────────
          
          // Load user profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }
          
          if (profileData) {
            setProfile(profileData);
            setPixKey(profileData.withdrawal_pix_key || '');
            setPixKeyType(profileData.withdrawal_pix_key_type || 'cpf');
            setDocumento(profileData.documento || '');
            setDocumentoTipo(profileData.documento_tipo || 'cpf');
          }

          // Load authenticators
          const { data: authData, error: authDataError } = await supabase
            .from('webauthn_credentials')
            .select('*')
            .eq('user_id', authUser.id);
          
          if (authDataError) throw authDataError;
          if (authData) setAuthenticators(authData);
        }
        
        setIsBiometrySupported(browserSupportsWebAuthn());
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error.message);
        setMessage({ type: 'error', text: 'Erro ao carregar dados: ' + error.message });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  function formatDocumento(value: string, tipo: 'cpf' | 'cnpj') {
    const digits = value.replace(/\D/g, '');
    if (tipo === 'cpf') {
      return digits.slice(0, 11).replace(
        /(\d{3})(\d{3})(\d{3})(\d{0,2})/,
        (_, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
      );
    } else {
      return digits.slice(0, 14).replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
        (_, a, b, c, d, e) => e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
      );
    }
  }

  // ── Vincular Google ────────────────────────────────────────────────────────
  async function handleLinkGoogle() {
    setLinkingGoogle(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?link=true`,
        },
      });
      // Se chegou aqui sem erro, o redirect OAuth já aconteceu
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao vincular Google:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao vincular conta Google.' });
      setLinkingGoogle(false);
    }
  }

  // ── Desvincular Google ─────────────────────────────────────────────────────
  async function handleUnlinkGoogle() {
    if (!confirm('Tem certeza que deseja desvincular sua conta Google? Você continuará acessando apenas por email e senha.')) return;

    // Garantir que o usuário tem senha antes de desvincular
    // (evitar que fique sem nenhuma forma de login)
    const hasEmailIdentity = linkedIdentities.includes('email');
    if (!hasEmailIdentity) {
      setMessage({ 
        type: 'error', 
        text: 'Não é possível desvincular: você não tem senha cadastrada. Cadastre uma senha primeiro.' 
      });
      return;
    }

    setUnlinkingGoogle(true);
    setMessage(null);
    try {
      const googleIdentity = user.identities?.find((i: any) => i.provider === 'google');
      if (!googleIdentity) throw new Error('Identidade Google não encontrada.');

      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;

      setLinkedIdentities(prev => prev.filter(p => p !== 'google'));
      setMessage({ type: 'success', text: 'Conta Google desvinculada com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao desvincular Google:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao desvincular conta Google.' });
    } finally {
      setUnlinkingGoogle(false);
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      // Update user name
      if (userName !== user?.user_metadata?.name) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { name: userName }
        });
        if (updateError) throw updateError;
        setUser({ ...user, user_metadata: { ...user.user_metadata, name: userName } });
      }

      // Update profile including documento
      const { error: pixError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id:                 user.id,
          withdrawal_pix_key:      pixKey,
          withdrawal_pix_key_type: pixKeyType,
          documento:               documento.replace(/\D/g, '') || null,
          documento_tipo:          documento ? documentoTipo : null,
          updated_at:              new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (pixError) throw pixError;
      
      setProfile({
        ...profile,
        withdrawal_pix_key:      pixKey,
        withdrawal_pix_key_type: pixKeyType,
        documento:               documento.replace(/\D/g, '') || null,
        documento_tipo:          documentoTipo,
      });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      setUpdating(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      setUpdating(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdating(false);
    }
  }

  async function registerBiometry() {
    setRegisteringBiometry(true);
    setMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Usuário não autenticado.');

      const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      };

      const optionsRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-registration-options`, {
        method: 'POST', headers,
      });
      if (!optionsRes.ok) {
        const err = await optionsRes.json();
        throw new Error(err.error || 'Não foi possível iniciar o registro biométrico.');
      }
      const options = await optionsRes.json();

      const regResponse = await startRegistration(options);

      const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-verify-registration`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          attestationResponse: regResponse,
          expectedChallenge: options.challenge,
        }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Falha na verificação biométrica.');
      }
      const verification = await verifyRes.json();
      if (!verification.verified) throw new Error(verification?.error || 'Falha na verificação biométrica.');

      const { data: authData, error: authDataError } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', user.id);

      if (authDataError) throw authDataError;
      if (authData) setAuthenticators(authData);
      localStorage.setItem('lastLoggedInUser', user.email);
      setMessage({ type: 'success', text: 'Biometria cadastrada com sucesso!' });
    } catch (error: any) {
      console.error('Erro biometria:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setRegisteringBiometry(false);
    }
  }

  async function removeAuthenticator(credentialId: string) {
    if (!confirm('Tem certeza que deseja remover este acesso biométrico?')) return;

    try {
      const { data: result, error: removeError } = await supabase.functions.invoke(
        'webauthn-remove-credential',
        { body: { credentialId } }
      );

      if (removeError || !result.success) {
        throw new Error(result?.error || 'Erro ao remover acesso biométrico.');
      }

      setAuthenticators(authenticators.filter(a => a.credential_id !== credentialId));
      setMessage({ type: 'success', text: 'Acesso removido com sucesso.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao remover: ' + error.message });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isGoogleUser      = user?.app_metadata?.provider === 'google';
  const hasPixKey         = !!profile?.withdrawal_pix_key;
  const isGoogleLinked    = linkedIdentities.includes('google');
  const isEmailLinked     = linkedIdentities.includes('email');
  // Conta puramente Google = só tem Google, sem email/senha
  const isPureGoogleUser  = isGoogleUser && !isEmailLinked;

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header do Perfil */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#b0cb1f] shadow-lg">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" width={128} height={128} className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{user?.user_metadata?.name || 'Usuário'}</h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center md:justify-start mt-1">
              <Mail className="w-4 h-4 mr-2" /> {user?.email}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              {/* Badge tipo de conta */}
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                {isGoogleUser ? 'Conta Google' : 'Conta E-mail'}
              </span>

              {/* Badge Google vinculado (para contas email que vincularam Google) */}
              {!isGoogleUser && isGoogleLinked && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google Vinculado
                </span>
              )}

              {authenticators.length > 0 && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Biometria Ativa
                </span>
              )}
            </div>

            {/* ── Botão Vincular / Desvincular Google ────────────────────────── */}
            {/* Só aparece para contas email (não para quem já É Google puro) */}
            {!isGoogleUser && (
              <div className="mt-4 flex justify-center md:justify-start">
                {isGoogleLinked ? (
                  <button
                    onClick={handleUnlinkGoogle}
                    disabled={unlinkingGoogle}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm font-medium disabled:opacity-50"
                  >
                    {unlinkingGoogle
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Unlink className="w-4 h-4" />
                    }
                    Desvincular Google
                  </button>
                ) : (
                  <button
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-800 transition text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    {linkingGoogle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {linkingGoogle ? 'Redirecionando...' : 'Vincular conta Google'}
                  </button>
                )}
              </div>
            )}
            {/* ──────────────────────────────────────────────────────────────── */}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-500/30 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Biometria */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-3 lg:flex-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Login por Biometria</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isBiometrySupported 
                    ? `${authenticators.length} dispositivo${authenticators.length !== 1 ? 's' : ''} cadastrado${authenticators.length !== 1 ? 's' : ''}`
                    : 'Não suportado neste navegador'
                  }
                </p>
              </div>
            </div>

            {isBiometrySupported && (
              <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
                {authenticators.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-500/30">
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">Ativo</span>
                  </div>
                )}
                <button
                  onClick={registerBiometry}
                  disabled={registeringBiometry}
                  className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold disabled:opacity-50 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                >
                  {registeringBiometry ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Cadastrar Biometria
                </button>
              </div>
            )}
          </div>

          {isBiometrySupported && authenticators.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dispositivos Cadastrados</p>
              {authenticators.map((auth) => (
                <div key={auth.credential_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Dispositivo Confiável</p>
                      <p className="text-xs text-gray-500">Cadastrado em {new Date(auth.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAuthenticator(auth.credential_id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                    title="Remover biometria"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Informações do Usuário */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Informações do Usuário</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">

              {/* Nome */}
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={documentoTipo}
                  onChange={(e) => {
                    setDocumentoTipo(e.target.value as 'cpf' | 'cnpj');
                    setDocumento('');
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>

              {/* Número do documento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {documentoTipo === 'cpf' ? 'CPF' : 'CNPJ'}
                </label>
                <input
                  type="text"
                  value={documento}
                  onChange={(e) => setDocumento(formatDocumento(e.target.value, documentoTipo))}
                  placeholder={documentoTipo === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Utilizado para emissão de nota de serviço referente aos seus recebimentos na plataforma.
                </p>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full flex items-center justify-center px-6 py-3 bg-[#b0cb1f] text-white rounded-xl hover:bg-[#8ca214] transition font-bold disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Salvar Informações
              </button>
            </form>
          </div>

          {/* Configuração Pix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuração Pix</h2>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-500/30">
              Esta chave Pix será utilizada para SACAR o saldo consolidado de todos os recebimentos dos seus assistentes.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  disabled={hasPixKey}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chave Pix</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  disabled={hasPixKey}
                  placeholder="Sua chave Pix"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition disabled:opacity-50"
                />
                {hasPixKey && (
                  <p className="mt-2 text-xs text-gray-500 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" /> A chave Pix não pode ser alterada após o preenchimento.
                  </p>
                )}
              </div>

              {!hasPixKey && (
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full flex items-center justify-center px-6 py-3 bg-[#b0cb1f] text-white rounded-xl hover:bg-[#8ca214] transition font-bold disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  Salvar Chave Pix
                </button>
              )}
            </form>
          </div>

        </div>

        {/* Alterar Senha — visível para conta email E para conta Google que vinculou email */}
        {(!isGoogleUser || isEmailLinked) && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
                <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alterar Senha</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nova Senha</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Alterar Senha
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}