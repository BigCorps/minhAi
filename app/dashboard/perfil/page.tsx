'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { 
  User, Mail, Lock, Camera, Save, Loader2, 
  AlertCircle, CheckCircle2, Fingerprint, Smartphone, 
  CreditCard, ShieldCheck, Trash2, Smile 
} from 'lucide-react';
import Image from 'next/image';
import {
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pix states
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [hasPixKey, setHasPixKey] = useState(false);

  // Biometrics states
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(true);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'unknown'>('unknown');

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setName(user.user_metadata?.name || user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || '');

      // Load Pix data from 'users' table
      const { data: userData } = await supabase
        .from('users')
        .select('pix_key, pix_key_type')
        .eq('id', user.id)
        .single();

      if (userData?.pix_key) {
        setPixKey(userData.pix_key);
        setPixKeyType(userData.pix_key_type || 'cpf');
        setHasPixKey(true);
      }

      // Check Biometrics status via RPC (same as poupeja)
      try {
        const { data: hasCred, error: credError } = await supabase.rpc('has_webauthn_credential', { p_user_id: user.id });
        if (!credError) setHasBiometric(hasCred);
      } catch (err) {
        console.error("Erro ao verificar biometria:", err);
      }
    }

    // Check WebAuthn support
    if (browserSupportsWebAuthn()) {
      setIsBiometricSupported(true);
      const isLikelyFaceID = /iPhone/i.test(navigator.userAgent);
      setBiometricType(isLikelyFaceID ? 'face' : 'fingerprint');
    }

    setIsBiometricLoading(false);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name, avatar_url: avatarUrl }
      });

      if (error) throw error;
      
      // Also update 'users' table if needed
      await supabase.from('users').update({ name }).eq('id', user.id);
      
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleSavePix(e: React.FormEvent) {
    e.preventDefault();
    if (hasPixKey) return;

    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          pix_key: pixKey,
          pix_key_type: pixKeyType
        })
        .eq('id', user.id);

      if (error) throw error;
      setHasPixKey(true);
      setMessage({ type: 'success', text: 'Chave Pix configurada com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdating(false);
    }
  }

  // Biometrics Handlers (using Edge Functions from poupeja)
  async function handleRegisterBiometry() {
    setIsBiometricLoading(true);
    setMessage(null);

    try {
      // 1. Get options from Edge Function
      const { data: registrationOptions, error: optionsError } = await supabase.functions.invoke(
        'webauthn-registration-options'
      );
      if (optionsError) throw optionsError;

      // 2. Start browser registration
      const registrationResponse = await startRegistration(registrationOptions);

      // 3. Verify registration via Edge Function
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
        'webauthn-verify-registration',
        { 
          body: { 
            expectedChallenge: registrationOptions.challenge,
            attestationResponse: registrationResponse 
          } 
        }
      );

      if (verificationError) {
        const errorMessage = verificationError.context?.msg || verificationError.message || 'Erro desconhecido.';
        throw new Error(errorMessage);
      }

      if (verificationData.verified) {
        setHasBiometric(true);
        setMessage({ type: 'success', text: 'Login por biometria ativado com sucesso!' });
      } else {
        throw new Error(verificationData.error || 'A verificação da biometria falhou.');
      }
    } catch (error: any) {
      console.error('Falha no registro biométrico:', error);
      setMessage({ type: 'error', text: 'Erro ao ativar biometria: ' + error.message });
    } finally {
      setIsBiometricLoading(false);
    }
  }

  async function handleRemoveBiometry() {
    if (!window.confirm('Tem certeza que deseja remover o login por biometria deste dispositivo?')) return;
    
    setIsBiometricLoading(true);
    try {
      const { error } = await supabase.functions.invoke('webauthn-remove-credential');
      if (error) throw error;

      setHasBiometric(false);
      setMessage({ type: 'success', text: 'Biometria removida com sucesso.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível remover a biometria.' });
    } finally {
      setIsBiometricLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

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

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      setMessage(null);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Selecione uma imagem.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie suas informações pessoais, pagamentos e segurança</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 text-center shadow-sm">
            <div className="relative w-32 h-32 mx-auto mb-4">
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Avatar" 
                  fill 
                  className="rounded-full object-cover ring-4 ring-[#b0cb1f]"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#b0cb1f] to-[#8ca214] flex items-center justify-center text-white text-4xl font-bold">
                  {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {!isGoogleUser && (
                <label className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
                </label>
              )}
            </div>
            
            <h3 className="font-bold text-gray-900 dark:text-white">{name || 'Usuário'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            
            {isGoogleUser && (
              <div className="mt-4 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full inline-block">
                Conectado via Google
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Status de Segurança
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Biometria:</span>
                <span className={hasBiometric ? "text-green-500 font-bold" : "text-amber-500 font-bold"}>
                  {hasBiometric ? 'Ativada' : 'Desativada'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Chave Pix:</span>
                <span className={hasPixKey ? "text-green-500 font-bold" : "text-amber-500 font-bold"}>
                  {hasPixKey ? 'Configurada' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#b0cb1f]" />
              Informações Pessoais
            </h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#b0cb1f] outline-none transition-all text-gray-900 dark:text-white"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updating}
                className="flex items-center justify-center space-x-2 px-6 py-2 bg-[#b0cb1f] hover:bg-[#8ca214] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Alterações</span>
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              Configuração de Saque (Pix)
            </h2>
            
            <form onSubmit={handleSavePix} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Chave</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    disabled={hasPixKey}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chave Pix</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    disabled={hasPixKey}
                    placeholder="Sua chave pix"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>
              
              {hasPixKey ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                  <span>A chave Pix não pode ser alterada após configurada. Entre em contato com o suporte para mudanças.</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={updating || !pixKey}
                  className="flex items-center justify-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Confirmar Chave Pix</span>
                </button>
              )}
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-blue-500" />
              Login por Biometria
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Vincule seu rosto ou digital a este dispositivo para entrar sem senha.
            </p>
            
            {!isBiometricSupported ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                Seu navegador ou dispositivo não suporta autenticação biométrica.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${hasBiometric ? 'bg-green-100 dark:bg-green-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                      {biometricType === 'face' ? (
                        <Smile className={`w-5 h-5 ${hasBiometric ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                      ) : (
                        <Fingerprint className={`w-5 h-5 ${hasBiometric ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {biometricType === 'face' ? 'Acesso por Rosto' : 'Acesso por Digital'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isBiometricLoading ? 'Verificando...' : hasBiometric ? 'Ativado neste dispositivo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  
                  {!isBiometricLoading && (
                    hasBiometric ? (
                      <button 
                        onClick={handleRemoveBiometry}
                        className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                      >
                        Remover
                      </button>
                    ) : (
                      <button 
                        onClick={handleRegisterBiometry}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        Habilitar
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {!isGoogleUser && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-500" />
                Alterar Senha
              </h2>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Senha</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none transition-all text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none transition-all text-gray-900 dark:text-white"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updating || !newPassword}
                  className="flex items-center justify-center space-x-2 px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Atualizar Senha</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
