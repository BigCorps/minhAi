'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Users, Copy, Check, Loader2, TrendingUp, QrCode } from 'lucide-react';

export default function IndicacoesPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [userBalance, setUserBalance] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      // Perfil com referral_code
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('referral_code, username')
        .eq('user_id', authUser.id)
        .single();
      setProfile(profileData);

      // Indicações
      const { data: referralData } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referrer_id', authUser.id)
        .order('created_at', { ascending: false });
      setReferrals(referralData || []);

      // Comissões
      const { data: commissionData } = await supabase
        .from('referral_commissions')
        .select('*')
        .eq('referrer_id', authUser.id)
        .order('created_at', { ascending: false });
      setCommissions(commissionData || []);

      // Saldo do usuário (comissões de indicação)
      const { data: balanceData } = await supabase
        .from('user_balance')
        .select('available_balance_cents, total_received_cents')
        .eq('user_id', authUser.id)
        .maybeSingle();
      setUserBalance(balanceData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const referralCode = profile?.referral_code;
  const username = profile?.username;
  const linkSlug = username || referralCode;
  const referralLink = linkSlug ? `https://eai.app.br/indica/${linkSlug}` : '';

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvite() {
    if (!inviteEmail || !referralCode) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setSendMessage({ type: 'error', text: 'Email inválido.' });
      return;
    }

    setSending(true);
    setSendMessage(null);
    try {
      const { error } = await supabase.functions.invoke('enviar-email-indicacao', {
        body: {
          referred_email: inviteEmail,
          referral_code: referralCode,
        },
      });
      if (error) throw error;
      setSendMessage({ type: 'success', text: `Convite enviado para ${inviteEmail}!` });
      setInviteEmail('');
    } catch (err: any) {
      setSendMessage({ type: 'error', text: 'Erro ao enviar. Tente novamente.' });
    } finally {
      setSending(false);
    }
  }

  const totalCommissions = commissions
    .filter(c => c.status === 'paid')
    .reduce((acc, c) => acc + c.amount_cents, 0);

  const activeReferrals = referrals.filter(r => r.status === 'active').length;

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Indicações</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Indique amigos e ganhe 50% das mensalidades deles, todos os meses aqui no seu saldo!
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Indicados', value: referrals.length, icon: <Users className="w-5 h-5" />, color: 'blue' },
            { label: 'Ativos', value: activeReferrals, icon: <TrendingUp className="w-5 h-5" />, color: 'green' },
            { label: 'Total Ganho', value: formatCurrency(userBalance?.total_received_cents ?? 0), icon: <TrendingUp className="w-5 h-5" />, color: 'purple' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-white/5">
              <div className={`flex items-center gap-3 mb-3`}>
                <div className={`p-2 bg-${color}-100 dark:bg-${color}-500/10 rounded-lg text-${color}-600 dark:text-${color}-400`}>
                  {icon}
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Seu link */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            Seu Link de Indicação
          </h2>

          {referralLink ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-700 dark:text-blue-400 font-mono text-sm break-all">{referralLink}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyLink}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Link</>}
                </button>
                <button
                  onClick={() => window.open(referralLink, '_blank')}
                  className="px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-bold"
                >
                  ↗
                </button>
              </div>

              {/* Divisor */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900">
                    ou envie o convite diretamente
                  </span>
                </div>
              </div>

              {/* Envio por email */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
                  placeholder="email@do-indicado.com"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendInvite}
                  disabled={sending || !inviteEmail}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    : <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Enviar
                      </>
                  }
                </button>
              </div>

              {/* Feedback */}
              {sendMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                  sendMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {sendMessage.type === 'success'
                    ? <Check className="w-4 h-4 flex-shrink-0" />
                    : <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  }
                  {sendMessage.text}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-500">
                Código: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{referralCode}</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Carregando seu link...</p>
          )}
        </div>

        {/* Lista de indicados */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Indicados ({referrals.length})
          </h2>

          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma indicação ainda.</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Compartilhe seu link para começar a ganhar comissões!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-white/5">
                    <th className="pb-4 font-bold">Data</th>
                    <th className="pb-4 font-bold">Status</th>
                    <th className="pb-4 font-bold">Comissão Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {referrals.map((ref) => {
                    const refCommissions = commissions.filter(c => c.referral_id === ref.id);
                    const total = refCommissions.reduce((acc, c) => acc + c.amount_cents, 0);
                    return (
                      <tr key={ref.id} className="text-sm">
                        <td className="py-4 text-gray-600 dark:text-gray-400">
                          {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            ref.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                              : ref.status === 'cancelled'
                              ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                          }`}>
                            {ref.status === 'active' ? 'Ativo' : ref.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-4 font-bold text-gray-900 dark:text-white">
                          {total > 0 ? formatCurrency(total) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Histórico de comissões */}
        {commissions.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-white/5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Histórico de Comissões
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-white/5">
                    <th className="pb-4 font-bold">Mês</th>
                    <th className="pb-4 font-bold">Valor</th>
                    <th className="pb-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {commissions.map((c) => (
                    <tr key={c.id} className="text-sm">
                      <td className="py-4 text-gray-600 dark:text-gray-400">{c.payment_month}</td>
                      <td className="py-4 font-bold text-gray-900 dark:text-white">
                        {formatCurrency(c.amount_cents)}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
                        }`}>
                          {c.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
