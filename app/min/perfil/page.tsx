'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import {
  User, Mail, Lock, Save, Loader2, AlertCircle, CheckCircle2,
  Unlink, Zap, TrendingUp, Shield,
  ExternalLink, Sparkles, ArrowLeft, Moon, Sun, LayoutDashboard
} from 'lucide-react';
import Image from 'next/image';

// ── Paleta Min.IA ───────────────────────────────────────────────────────
const BRAND = { blue: '#3B82F6', green: '#10B981' };
const GRAD = `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.green} 100%)`;

// ── Tipos ─────────────────────────────────────────────────────────────────
interface UserCredits {
  available_credits: number;
  total_purchased: number;
  total_used: number;
}

// ── Ícones customizados ───────────────────────────────────────────────────
function BotIA({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="96 96 320 320" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <circle cx="256" cy="256" r="145" stroke="currentColor" strokeWidth="18" />
      <circle cx="256" cy="256" r="122" stroke="currentColor" strokeWidth="18" />
      <ellipse cx="218" cy="230" rx="18" ry="24" fill="currentColor" />
      <ellipse cx="294" cy="230" rx="18" ry="24" fill="currentColor" />
      <path d="M216 296C237 314 275 314 296 296" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BigCorpsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" fill="currentColor" aria-hidden="true">
      <path d="M 2.589 26.923c3.905 4.641 19.9 4.741 24.488 .154 4.465-4.465 4.465-19.689 0-24.154s-19.689-4.465-24.154 0c-4.236 4.236-4.443 19.117-.334 24zm0.411-12.146c0-10.652 1.147-11.777 12-11.777 6.667 0 8.333 .333 10 2s2 3.333 2 10c0 10.995-1.042 12-12.443 12-10.698 0-11.557-.908-11.557-12.223zm3.667-6.111c-1.06 1.06-.772 12.15 .333 12.833 .631.39 1-1.99 1-6.441 0-7.097-.109-7.617-1.333-6.392zm4.333 .333v12.121l3.75-.31c4.302-.356 5.123-2.708 1.5-4.297-2.258-.991-3.059-2.513-1.321-2.513 1.49 0 4.143-3.075 3.522-4.081-.313-.506-2.117-.919-4.009-.919zm9.526 4.331c-1.299 1.299-1.299 1.542 0 2.04 .88.338 1.48 1.89 1.49 3.847 .012 2.487 .25 2.918 .985 1.781 .533-.825.969-3.525 .969-6s-.436-5.175-.969-6c-.789-1.221-.972-1.095-.985.679-.008 1.198-.679 2.842-1.49 3.653z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Cards de ajuda ────────────────────────────────────────────────────────
const HELP_CARDS = [
  {
    id: 'minhai',
    titulo: 'Conheça a minhAi',
    descricao: 'Mais de 100 funções de IA para o seu negócio.',
    icon: <BotIA className="w-5 h-5" />,
    href: 'https://minhai.app',
    color: BRAND.blue,
  },
  {
    id: 'bigcorps',
    titulo: 'BigCorps',
    descricao: 'Conheça a empresa por trás da min.IA e da minhAi. Tecnologia para impulsionar o seu negócio.',
    icon: <BigCorpsIcon className="w-5 h-5" />,
    href: 'https://bigcorps.com.br',
    color: '#F97316',
  },
  {
    id: 'suporte',
    titulo: 'Suporte min.IA',
    descricao: 'Precisa de ajuda com a min.IA? Nossa equipe de suporte técnico está pronta para te auxiliar.',
    icon: <WhatsAppIcon className="w-5 h-5" />,
    href: 'https://api.whatsapp.com/send/?phone=5511926828418&text=Preciso%20de%20suporte%20no%20min.IA&type=phone_number&app_absent=0',
    color: '#25D366',
  },
];

// ─────────────────────────────────────────────────────────────────────────
export default function MinPerfilPage() {
  const supabase = createClient();

  // ── Tema ───────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === 'dark' : false;

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

  // ── Google linking ───────────────────────────────────────────────────
  const [linkedIdentities, setLinkedIdentities] = useState<string[]>([]);
  const [linkingGoogle, setLinkingGoogle]   = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  // ── Créditos (só leitura aqui — compra acontece no dashboard da minhAi) ──
  const [credits, setCredits] = useState<UserCredits | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('linked') === 'google') {
      setMessage({ type: 'success', text: 'Conta Google vinculada com sucesso!' });
      window.history.replaceState({}, '', '/min/perfil');
    }

    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        setUser(authUser);
        setUserName(authUser.user_metadata?.name || '');
        setLinkedIdentities(authUser.identities?.map((i: any) => i.provider) || []);

        const { data: credData } = await supabase
          .from('user_credits')
          .select('available_credits, total_purchased, total_used')
          .eq('user_id', authUser.id)
          .maybeSingle();
        setCredits(credData || { available_credits: 0, total_purchased: 0, total_used: 0 });
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
        options: { redirectTo: `${window.location.origin}/auth/callback?link=true&next=/min/perfil` },
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

  // ── Derivados ─────────────────────────────────────────────────────────
  const isGoogleUser   = user?.app_metadata?.provider === 'google';
  const isGoogleLinked = linkedIdentities.includes('google');
  const isEmailLinked  = linkedIdentities.includes('email');
  const canChangePass  = !isGoogleUser || isEmailLinked;

  // ── Tokens de tema ────────────────────────────────────────────────────
  const T = {
    pageBg: isDark
      ? 'linear-gradient(to bottom, rgb(2,6,23), rgb(15,23,42))'
      : 'linear-gradient(to bottom, rgb(248,250,252), rgb(241,245,249))',
    card:       isDark ? 'rgb(15,23,42)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    text:       isDark ? '#f1f5f9' : '#111827',
    subtext:    isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
    inputBg:    isDark ? 'rgba(30,41,59,0.6)' : '#ffffff',
    inputBorder:isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    divider:    isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: mounted ? T.pageBg : 'rgb(248,250,252)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND.blue }} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: T.pageBg }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Botão Voltar + Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <a
              href="/min"
              className="flex items-center justify-center w-9 h-9 rounded-full border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
              style={{ background: T.card, borderColor: T.cardBorder }}
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" style={{ color: T.subtext }} />
            </a>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden">
                <Image src="/minia/logo.png" alt="Min.IA" width={28} height={28} className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: T.text }}>Meu Perfil</h1>
            </div>
          </div>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-full transition-colors"
            style={{ color: T.subtext }}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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
        <section className="rounded-3xl shadow-lg border overflow-hidden" style={{ background: T.card, borderColor: T.cardBorder }}>

          <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b" style={{ borderColor: T.divider }}>
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: BRAND.blue }}>
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: isDark ? 'rgba(59,130,246,0.15)' : 'linear-gradient(135deg, #eff6ff, #ecfdf5)' }}>
                    <User className="w-7 h-7" style={{ color: BRAND.blue }} />
                  </div>
                )
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ color: T.text }}>{user?.user_metadata?.name || 'Usuário'}</p>
              <p className="text-sm flex items-center gap-1 truncate" style={{ color: T.subtext }}>
                <Mail className="w-3.5 h-3.5 shrink-0" /> {user?.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: GRAD }}>
                {isGoogleUser ? 'Google' : 'E-mail'}
              </span>
            </div>
          </div>

          {/* Nome */}
          <form onSubmit={handleSaveName} className="px-6 py-5 border-b space-y-3" style={{ borderColor: T.divider }}>
            <label className="block text-sm font-medium" style={{ color: T.text }}>Nome</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Seu nome completo"
                className="flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-colors text-sm"
                style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
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

          {/* Google linking */}
          {!isGoogleUser && (
            <div className="px-6 py-5 border-b" style={{ borderColor: T.divider }}>
              <p className="text-sm font-medium mb-3" style={{ color: T.text }}>Login com Google</p>
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: T.inputBorder, color: T.text }}
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
              <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: T.text }}>
                <Lock className="w-4 h-4" style={{ color: BRAND.green }} /> Alterar Senha
              </p>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
              />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ background: T.inputBg, color: T.text, borderColor: T.inputBorder, '--tw-ring-color': BRAND.blue } as any}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: T.subtext }}>
                  <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="rounded" />
                  Mostrar senha
                </label>
                <button
                  type="submit"
                  disabled={updating || !newPassword}
                  className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: BRAND.green }}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Alterar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 2 — CRÉDITOS (somente leitura — compra fica no dashboard
            da minhAi, junto com o resto das configurações e planos)
        ══════════════════════════════════════════════════════════════ */}
        <section className="rounded-3xl shadow-lg border overflow-hidden" style={{ background: T.card, borderColor: T.cardBorder }}>

          <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: T.divider }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl" style={{ background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }}>
                <Zap className="w-5 h-5" style={{ color: BRAND.green }} />
              </div>
              <p className="font-bold" style={{ color: T.text }}>Créditos</p>
            </div>
            <p className="text-xs mt-1 ml-11" style={{ color: T.subtext }}>
              Compartilhados entre <strong>Min.IA</strong> e <strong>minhAi</strong> — o mesmo saldo vale nas duas.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x border-b" style={{ borderColor: T.divider }}>
            {[
              { label: 'Disponíveis', value: credits?.available_credits ?? 0, color: BRAND.blue, Icon: Zap },
              { label: 'Utilizados',  value: credits?.total_used ?? 0,        color: BRAND.green, Icon: TrendingUp },
              { label: 'Comprados',   value: credits?.total_purchased ?? 0,   color: '#6366f1', Icon: Shield },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="flex flex-col items-center py-4 gap-1">
                <Icon className="w-4 h-4" style={{ color }} />
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: T.subtext }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Link pro dashboard — planos, compra de créditos e demais configurações */}
          <div className="px-6 py-5">
            <a
              href="https://minhai.app/dashboard"
              className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)', borderColor: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: GRAD }}>
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: T.text }}>Ir para o dashboard da minhAi</p>
                  <p className="text-xs mt-0.5" style={{ color: T.subtext }}>Comprar créditos, ver planos e acessar todas as configurações</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 shrink-0" style={{ color: T.subtext }} />
            </a>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BLOCO 3 — AJUDA
        ══════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <p className="text-sm font-semibold px-1" style={{ color: T.subtext }}>Ajuda & Links</p>
          {HELP_CARDS.map((card) => (
            <a
              key={card.id}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl shadow-sm border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              style={{ background: T.card, borderColor: T.cardBorder }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: card.color }}>
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: T.text }}>{card.titulo}</p>
                <p className="text-xs truncate" style={{ color: T.subtext }}>{card.descricao}</p>
              </div>
              <ExternalLink className="w-4 h-4 shrink-0 transition-colors" style={{ color: T.subtext }} />
            </a>
          ))}
        </section>

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db' }}>
          <a href="https://min.ia.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: BRAND.blue }}>
            min.IA.br
          </a>
        </p>

      </div>
    </div>
  );
}
