'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  User, Mail, Lock, Save, Loader2, AlertCircle, CheckCircle2,
  Fingerprint, Trash2, Smartphone, ShieldCheck, Key, Unlink,
  Zap, TrendingUp, Shield, Clock, Smile,
  LifeBuoy, ExternalLink, MessageCircle, Sparkles, QrCode,
  CreditCard, Globe
} from 'lucide-react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import Image from 'next/image';

// ── Paleta CMYK ArteFinal ─────────────────────────────────────────────────
const C = {
  cyan:    '#00AEEF',
  magenta: '#EC008C',
  yellow:  '#FFD500',
  key:     '#1A1A1A',
};
const GRAD = `linear-gradient(135deg, ${C.cyan} 0%, ${C.magenta} 100%)`;

// ── Tipos ─────────────────────────────────────────────────────────────────
interface Package {
  id: string;
  name: string;
  interactions: number;
  price_cents: number;
  is_highlighted: boolean;
  display_order: number;
  package_type: 'credits' | 'monthly';
}

interface UserCredits {
  available_credits: number;
  total_purchased: number;
  total_used: number;
}

interface PaymentData {
  payment_id: string;
  pix_code: string;
  pix_qrcode?: string;
  amount: number;
  packageName: string;
}

// ── Cards de ajuda ────────────────────────────────────────────────────────
const HELP_CARDS = [
  {
    id: 'minhai',
    titulo: 'Conheça o minhAi',
    descricao: 'Mais de 100 funções de IA para o seu negócio. Os seus créditos ArteFinal também funcionam lá.',
    icon: <Sparkles className="w-5 h-5" />,
    href: 'https://minhai.app',
    botao: 'Acessar minhAi',
    color: C.cyan,
  },
  {
    id: 'bigcorps',
    titulo: 'BigCorps',
    descricao: 'Conheça a empresa por trás da ArteFinal e do minhAi. Tecnologia para impulsionar o seu negócio.',
    icon: <Globe className="w-5 h-5" />,
    href: 'https://bigcorps.com.br',
    botao: 'Visitar BigCorps',
    color: C.magenta,
  },
  {
    id: 'suporte',
    titulo: 'Suporte ArteFinal',
    descricao: 'Precisa de ajuda com a ArteFinal? Nossa equipe de suporte técnico está pronta para te auxiliar.',
    icon: <LifeBuoy className="w-5 h-5" />,
    href: 'https://api.whatsapp.com/send/?phone=5511926828418&text=Preciso%20de%20suporte%20URGENTE%20no%20app%20ArteFinal&type=phone_number&app_absent=0',
    botao: 'Falar no WhatsApp',
    color: '#25D366',
  },
];

// ─────────────────────────────────────────────────────────────────────────
export default function ArtePerfilPage() {
  const supabase = createClient();

  // ── Auth / user ──────────────────────────────────────────────────────
  const [user, setUser]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);
  const [message, setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Perfil ───────────────────────────────────────────────────────────
  const [userName, setUserName]           = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]           = useState(false);

  // ── Biometria ────────────────────────────────────────────────────────
  const [authenticators, setAuthenticators] = useState<any[]>([]);
  const [biometrySupported, setBiometrySupported] = useState(false);
  const [registeringBiometry, setRegisteringBiometry] = useState(false);

  // ── Google linking ───────────────────────────────────────────────────
  const [linkedIdentities, setLinkedIdentities] = useState<string[]>([]);
  const [linkingGoogle, setLinkingGoogle]   = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  // ── Créditos ─────────────────────────────────────────────────────────
  const [packages, setPackages]     = useState<Package[]>([]);
  const [credits, setCredits]       = useState<UserCredits | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [copied, setCopied]         = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('linked') === 'google') {
      setMessage({ type: 'success', text: 'Conta Google vinculada com sucesso!' });
      window.history.replaceState({}, '', '/arte/perfil');
    }

    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        setUser(authUser);
        setUserName(authUser.user_metadata?.name || '');
        setLinkedIdentities(authUser.identities?.map((i: any) => i.provider) || []);

        // Biometria
        setBiometrySupported(browserSupportsWebAuthn());
        const { data: authData } = await supabase
          .from('webauthn_credentials')
          .select('*')
          .eq('user_id', authUser.id);
        if (authData) setAuthenticators(authData);

        // Créditos
        const { data: credData } = await supabase
          .from('user_credits')
          .select('available_credits, total_purchased, total_used')
          .eq('user_id', authUser.id)
          .maybeSingle();
        setCredits(credData || { available_credits: 0, total_purchased: 0, total_used: 0 });

        // Pacotes de créditos
        const { data: pkgData } = await supabase
          .from('credits_packages')
          .select('*')
          .eq('is_active', true)
          .eq('package_type', 'credits')
          .gt('price_cents', 0)
          .order('display_order');
        setPackages(pkgData || []);
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Erro ao carregar dados: ' + err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // ── Salvar nome ──────────────────────────────────────────────────────
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { name: userName } });
      if (error) throw error;
      setUser((u: any) => ({ ...u, user_metadata: { ...u.user_metadata, name: userName } }));
      setMessage({ type: 'success', text: 'Nome atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  }

  // ── Alterar senha ────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'As senhas não coincidem.' }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'Senha deve ter no mínimo 6 caracteres.' }); return; }
    setUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  }

  // ── Google linking ────────────────────────────────────────────────────
  async function handleLinkGoogle() {
    setLinkingGoogle(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?link=true` },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao vincular conta Google.' });
      setLinkingGoogle(false);
    }
  }

  async function handleUnlinkGoogle() {
    if (!confirm('Desvincular sua conta Google? Você continuará acessando apenas por email e senha.')) return;
    if (!linkedIdentities.includes('email')) {
      setMessage({ type: 'error', text: 'Cadastre uma senha antes de desvincular o Google.' });
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
      setMessage({ type: 'success', text: 'Conta Google desvinculada.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUnlinkingGoogle(false);
    }
  }

  // ── Biometria ─────────────────────────────────────────────────────────
  async function registerBiometry() {
    setRegisteringBiometry(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado.');

      const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const headers = { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` };

      const optRes = await fetch(`${SUPA_URL}/functions/v1/webauthn-registration-options`, { method: 'POST', headers });
      if (!optRes.ok) throw new Error((await optRes.json()).error || 'Erro ao iniciar registro.');
      const options = await optRes.json();

      const regResponse = await startRegistration(options);

      const verRes = await fetch(`${SUPA_URL}/functions/v1/webauthn-verify-registration`, {
        method: 'POST', headers,
        body: JSON.stringify({ attestationResponse: regResponse, expectedChallenge: options.challenge }),
      });
      const verification = await verRes.json();
      if (!verification.verified) throw new Error(verification?.error || 'Falha na verificação.');

      const { data: authData } = await supabase.from('webauthn_credentials').select('*').eq('user_id', user.id);
      if (authData) setAuthenticators(authData);
      localStorage.setItem('lastLoggedInUser', user.email);
      setMessage({ type: 'success', text: 'Biometria cadastrada com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRegisteringBiometry(false);
    }
  }

  async function removeAuthenticator(credentialId: string) {
    if (!confirm('Remover este acesso biométrico?')) return;
    try {
      const { data: result, error } = await supabase.functions.invoke('webauthn-remove-credential', { body: { credentialId } });
      if (error || !result.success) throw new Error(result?.error || 'Erro ao remover.');
      setAuthenticators(a => a.filter(x => x.credential_id !== credentialId));
      setMessage({ type: 'success', text: 'Acesso biométrico removido.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // ── Compra de créditos ────────────────────────────────────────────────
  async function handlePurchase(packageId: string) {
    if (!user) { alert('Você precisa estar logado.'); return; }
    setPurchasing(packageId);
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao processar compra.');
      const pkg = packages.find(p => p.id === packageId);
      setPaymentData({ payment_id: data.payment_id, pix_code: data.pix_code, pix_qrcode: data.pix_qrcode, amount: data.amount, packageName: pkg?.name || 'Pacote' });
      setPixModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPurchasing(null);
    }
  }

  async function copyPix() {
    if (!paymentData?.pix_code) return;
    await navigator.clipboard.writeText(paymentData.pix_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Derivados ─────────────────────────────────────────────────────────
  const isGoogleUser   = user?.app_metadata?.provider === 'google';
  const isGoogleLinked = linkedIdentities.includes('google');
  const isEmailLinked  = linkedIdentities.includes('email');
  const canChangePass  = !isGoogleUser || isEmailLinked;

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f7fe 0%, #ffffff 50%, #fce4f3 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.cyan }} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: 'linear-gradient(135deg, #e0f7fe 0%, #ffffff 50%, #fce4f3 100%)' }}
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image src="/arte/arte.png" alt="ArteFinal" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: C.key }}>Meu Perfil</h1>
        </div>

        {/* ── Feedback global ────────────────────────────────────────── */}
        {message && (
          <div className={`rounded-2xl p-4 flex items-start gap-3 border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            }
            <p>{message.text}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 1 — IDENTIFICAÇÃO
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Cabeçalho do card */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: C.cyan }}>
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f7fe, #fce4f3)' }}>
                    <User className="w-7 h-7" style={{ color: C.cyan }} />
                  </div>
                )
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{user?.user_metadata?.name || 'Usuário'}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {user?.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: GRAD }}>
                {isGoogleUser ? 'Google' : 'E-mail'}
              </span>
              {authenticators.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Biometria
                </span>
              )}
            </div>
          </div>

          {/* Nome */}
          <form onSubmit={handleSaveName} className="px-6 py-5 border-b border-gray-50 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Seu nome completo"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 transition-colors text-sm"
                style={{ background: '#ffffff', color: '#1e293b', '--tw-ring-color': C.cyan } as any}
              />
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: GRAD }}
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </form>

          {/* Google linking — apenas para contas e-mail */}
          {!isGoogleUser && (
            <div className="px-6 py-5 border-b border-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Login com Google</p>
              {isGoogleLinked ? (
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={unlinkingGoogle}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
                >
                  {unlinkingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  Desvincular Google
                </button>
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {linkingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {linkingGoogle ? 'Redirecionando…' : 'Vincular conta Google'}
                </button>
              )}
            </div>
          )}

          {/* Senha */}
          {canChangePass && (
            <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4" style={{ color: C.magenta }} /> Alterar Senha
              </p>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ background: '#ffffff', color: '#1e293b', '--tw-ring-color': C.cyan } as any}
              />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ background: '#ffffff', color: '#1e293b', '--tw-ring-color': C.cyan } as any}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                  <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="rounded" />
                  Mostrar senha
                </label>
                <button
                  type="submit"
                  disabled={updating || !newPassword}
                  className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: C.magenta }}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Alterar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 2 — BIOMETRIA
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(0,174,239,0.1)' }}>
                <Fingerprint className="w-5 h-5" style={{ color: C.cyan }} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Login por Biometria</p>
                <p className="text-xs text-gray-500">
                  {!biometrySupported
                    ? 'Não suportado neste navegador'
                    : `${authenticators.length} dispositivo${authenticators.length !== 1 ? 's' : ''} cadastrado${authenticators.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
            {biometrySupported && (
              <button
                onClick={registerBiometry}
                disabled={registeringBiometry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: GRAD }}
              >
                {registeringBiometry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                Cadastrar
              </button>
            )}
          </div>

          {biometrySupported && authenticators.length > 0 && (
            <div className="space-y-2 mt-2">
              {authenticators.map((auth) => (
                <div key={auth.credential_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Dispositivo Confiável</p>
                      <p className="text-xs text-gray-400">Cadastrado em {new Date(auth.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAuthenticator(auth.credential_id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 3 — CRÉDITOS
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Header créditos */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(236,0,140,0.1)' }}>
                <CreditCard className="w-5 h-5" style={{ color: C.magenta }} />
              </div>
              <p className="font-bold text-gray-900">Créditos</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-11">
              Compartilhados entre <strong>ArteFinal</strong> e <strong>minhAi</strong> — o mesmo saldo vale nos dois.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Disponíveis', value: credits?.available_credits ?? 0, color: C.cyan, Icon: Zap },
              { label: 'Utilizados',  value: credits?.total_used ?? 0,        color: C.magenta, Icon: TrendingUp },
              { label: 'Comprados',   value: credits?.total_purchased ?? 0,   color: '#6366f1', Icon: Shield },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="flex flex-col items-center py-4 gap-1">
                <Icon className="w-4 h-4" style={{ color }} />
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Aviso compartilhamento */}
          <div className="mx-6 my-4 p-3 rounded-2xl border flex items-start gap-3" style={{ background: 'rgba(0,174,239,0.05)', borderColor: 'rgba(0,174,239,0.2)' }}>
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.cyan }} />
            <p className="text-xs text-gray-600">
              Seus créditos são <strong>compartilhados automaticamente</strong> entre a ArteFinal e o minhAi. No minhAi você encontra mais de <strong>100 funções de IA</strong> para o seu negócio — assistente de voz, gestão, vendas, integrações Google e Meta, e muito mais.
              {' '}<a href="https://minhai.app" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2" style={{ color: C.cyan }}>Conhecer minhAi →</a>
            </p>
          </div>

          {/* Pacotes */}
          <div className="px-6 pb-6 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Adquirir créditos</p>
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all disabled:opacity-60 ${
                    pkg.is_highlighted
                      ? 'text-white shadow-lg border-transparent'
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-md'
                  }`}
                  style={pkg.is_highlighted ? { background: GRAD } : {}}
                >
                  {pkg.is_highlighted && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: C.yellow, color: C.key }}>
                      Mais popular
                    </span>
                  )}
                  {purchasing === pkg.id
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : (
                      <>
                        <p className={`text-base font-bold ${pkg.is_highlighted ? 'text-white' : 'text-gray-900'}`}>
                          {pkg.name}
                        </p>
                        <div className={`flex items-center gap-1 text-xs mt-1 ${pkg.is_highlighted ? 'text-white/80' : 'text-gray-500'}`}>
                          <Zap className="w-3 h-3" />
                          {pkg.interactions.toLocaleString('pt-BR')} créditos
                        </div>
                        <p className={`text-lg font-black mt-2 ${pkg.is_highlighted ? 'text-white' : 'text-gray-900'}`} style={!pkg.is_highlighted ? { color: C.magenta } : {}}>
                          R$ {(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                        </p>
                        <div className={`flex items-center gap-1 text-xs mt-1 ${pkg.is_highlighted ? 'text-white/70' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" /> Não expiram
                        </div>
                      </>
                    )
                  }
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 4 — AJUDA
        ══════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 px-1">Ajuda & Links</p>
          {HELP_CARDS.map((card) => (
            <a
              key={card.id}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: card.color }}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{card.titulo}</p>
                <p className="text-xs text-gray-500 truncate">{card.descricao}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </a>
          ))}
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 pb-4">
          Powered by{' '}
          <a href="https://minhai.app" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: C.cyan }}>
            minhAi.app
          </a>
        </p>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL PIX
      ══════════════════════════════════════════════════════════════ */}
      {pixModalOpen && paymentData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm p-6 space-y-5">

            {/* Cabeçalho */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: GRAD }}>
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <p className="font-bold text-gray-900">{paymentData.packageName}</p>
              <p className="text-2xl font-black mt-1" style={{ color: C.magenta }}>
                R$ {(paymentData.amount / 100).toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* QR Code */}
            {paymentData.pix_qrcode && (
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl border border-gray-100 bg-gray-50">
                  <img src={paymentData.pix_qrcode} alt="QR Code PIX" className="w-44 h-44" />
                </div>
              </div>
            )}

            {/* Código copia e cola */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 text-center">PIX Copia e Cola</p>
              <div
                onClick={copyPix}
                className="cursor-pointer px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 break-all text-center hover:bg-gray-100 transition select-all"
              >
                {paymentData.pix_code}
              </div>
              <button
                onClick={copyPix}
                className="w-full py-3 rounded-xl font-bold text-white transition-all text-sm"
                style={{ background: copied ? '#22c55e' : GRAD }}
              >
                {copied ? '✓ Copiado!' : 'Copiar código PIX'}
              </button>
            </div>

            <button
              onClick={() => setPixModalOpen(false)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
