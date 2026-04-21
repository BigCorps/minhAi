// app/dashboard/perfil/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { 
  User, Mail, Lock, Camera, Save, Loader2, 
  AlertCircle, CheckCircle2, Fingerprint, Trash2, 
  Smartphone, ShieldCheck, Wallet, Key, Edit
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

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (authUser) {
          setUser(authUser);
          setUserName(authUser.user_metadata?.name || '');
          
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

      const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

  const isGoogleUser = user?.app_metadata?.provider === 'google';
  const hasPixKey    = !!profile?.withdrawal_pix_key;

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
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                {isGoogleUser ? 'Conta Google' : 'Conta E-mail'}
              </span>
              {authenticators.length > 0 && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Biometria Ativa
                </span>
              )}
            </div>
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
                    setDocumento(''); // limpa ao trocar tipo
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

        {/* Alterar Senha */}
        {!isGoogleUser && (
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
