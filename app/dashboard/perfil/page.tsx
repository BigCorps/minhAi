'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { 
  User, Mail, Lock, Camera, Save, Loader2, 
  AlertCircle, CheckCircle2, Fingerprint, Trash2, 
  Smartphone, ShieldCheck, Wallet, Key
} from 'lucide-react';
import Image from 'next/image';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          // Load user profile (Pix)
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (profileData) {
            setProfile(profileData);
            setPixKey(profileData.pix_key || '');
            setPixKeyType(profileData.pix_key_type || 'cpf');
          }

          // Load authenticators
          const { data: authData } = await supabase
            .from('webauthn_credentials')
            .select('*')
            .eq('user_id', user.id);
          
          if (authData) setAuthenticators(authData);
        }
        
        setIsBiometrySupported(browserSupportsWebAuthn());
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setProfile({ ...profile, pix_key: pixKey, pix_key_type: pixKeyType });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
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
      // 1. Get registration options from Edge Function
      const { data: options, error: optionsError } = await supabase.functions.invoke('webauthn-registration-options');
      if (optionsError) throw new Error('Não foi possível iniciar o registro biométrico.');

      // 2. Start browser registration
      const regResponse = await startRegistration(options);

      // 3. Verify registration via Edge Function
      const { data: verification, error: verificationError } = await supabase.functions.invoke(
        'webauthn-verify-registration', 
        { body: { registrationResponse: regResponse } }
      );

      if (verificationError || !verification.success) {
        throw new Error(verification.error || 'Falha na verificação biométrica.');
      }

      // Refresh authenticators list
      const { data: authData } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', user.id);
      
      if (authData) setAuthenticators(authData);
      setMessage({ type: 'success', text: 'Biometria cadastrada com sucesso!' });
    } catch (error: any) {
      console.error('Erro biometria:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setRegisteringBiometry(false);
    }
  }

  async function removeAuthenticator(id: string) {
    if (!confirm('Tem certeza que deseja remover este acesso biométrico?')) return;

    try {
      const { error } = await supabase.functions.invoke('webauthn-remove-credential', {
        body: { credentialId: id }
      });

      if (error) throw error;

      setAuthenticators(authenticators.filter(a => a.id !== id));
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
  const hasPixKey = !!profile?.pix_key;

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header do Perfil */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#b0cb1f] shadow-lg">
              {user?.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="Avatar" width={128} height={128} className="object-cover" />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Configuração Pix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuração Pix</h2>
            </div>

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

          {/* Biometria */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Login por Biometria</h2>
            </div>

            {!isBiometrySupported ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-400 text-sm">
                Seu navegador ou dispositivo não suporta autenticação biométrica.
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Adicione uma camada extra de segurança e acesse sua conta rapidamente usando sua digital ou reconhecimento facial.
                </p>

                {authenticators.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dispositivos Cadastrados</p>
                    {authenticators.map((auth) => (
                      <div key={auth.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/5">
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

                <button
                  onClick={registerBiometry}
                  disabled={registeringBiometry}
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {registeringBiometry ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Key className="w-5 h-5 mr-2" />}
                  Cadastrar Nova Biometria
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
