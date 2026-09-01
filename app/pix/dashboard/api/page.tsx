'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import PixWikiHeader from '@/components/pix/PixWikiHeader';
import PixWikiDashboardNav from '@/components/pix/PixWikiDashboardNav';

type PlanKey = 'free' | 'link' | 'pro';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
}

interface WebhookRow {
  id: string;
  company_id: string | null;
  name: string;
  url: string;
  is_active: boolean;
  event_types: string[];
  last_success_at: string | null;
  last_failure_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

interface DeliveryRow {
  webhook_id: string;
  status: 'pending' | 'retrying' | 'delivered' | 'failed';
  attempt_count: number;
  created_at: string;
  delivered_at: string | null;
  response_status: number | null;
}

interface PlanStatus {
  effective_plan: PlanKey;
  features?: {
    api?: boolean;
    webhooks?: boolean;
  };
}

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string) {
  if (status === 'delivered') return 'Entregue';
  if (status === 'retrying') return 'Tentando novamente';
  if (status === 'failed') return 'Falhou';
  return 'Pendente';
}

export default function PixWikiApiPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [keyName, setKeyName] = useState('Integração principal');
  const [newApiSecret, setNewApiSecret] = useState('');
  const [hookName, setHookName] = useState('Meu sistema');
  const [hookUrl, setHookUrl] = useState('');
  const [hookCompany, setHookCompany] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const callEdge = useCallback(async (slug: string, body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada');

    const response = await fetch(`${FUNCTIONS_URL}/${slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const err = new Error(data?.error || `HTTP ${response.status}`) as Error & { payload?: unknown };
      err.payload = data;
      throw err;
    }
    return data;
  }, [supabase]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.href = '/pix/login';
      return;
    }

    const [planResult, companyResult] = await Promise.all([
      callEdge('pixwiki-plan', { action: 'status' }),
      supabase.rpc('pixwiki_list_my_companies'),
    ]);

    const planStatus: PlanStatus = {
      effective_plan: planResult.effective_plan,
      features: planResult.features || {},
    };
    setPlan(planStatus);
    setCompanies((companyResult.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })));

    if (planStatus.effective_plan === 'pro' && planStatus.features?.api === true) {
      const [keyResult, hookResult] = await Promise.all([
        callEdge('pixwiki-api-admin', { action: 'list_keys' }),
        callEdge('pixwiki-api-admin', { action: 'list_webhooks' }),
      ]);
      setKeys(keyResult.keys || []);
      setWebhooks(hookResult.webhooks || []);
      setDeliveries(hookResult.deliveries || []);
    }

    setLoading(false);
  }, [callEdge, supabase]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('publicTheme');
    if (savedTheme === 'light' || savedTheme === 'dark') setDark(savedTheme === 'dark');
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    loadAll().catch(e => {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar API & Webhooks.');
      setLoading(false);
    });
  }, [loadAll]);

  async function createKey() {
    setBusy('key');
    setError('');
    setNotice('');
    setNewApiSecret('');
    try {
      const result = await callEdge('pixwiki-api-admin', {
        action: 'create_key',
        name: keyName.trim() || 'Chave API',
      });
      setNewApiSecret(result.secret || '');
      setNotice('Chave criada. Copie agora: por segurança ela não será exibida novamente.');
      await loadAll();
    } catch (e: any) {
      const msg = String(e?.message || '');
      setError(msg.includes('api_key_limit_reached')
        ? 'Você atingiu o limite de 10 chaves API ativas.'
        : 'Não foi possível criar a chave API.');
    } finally {
      setBusy('');
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm('Revogar esta chave? Sistemas que usam ela deixarão de acessar a API imediatamente.')) return;
    setBusy(`key-${id}`);
    try {
      await callEdge('pixwiki-api-admin', { action: 'revoke_key', key_id: id });
      setNotice('Chave revogada.');
      await loadAll();
    } catch {
      setError('Não foi possível revogar a chave.');
    } finally {
      setBusy('');
    }
  }

  async function createWebhook() {
    if (!hookUrl.trim()) {
      setError('Informe uma URL HTTPS para o webhook.');
      return;
    }
    setBusy('webhook');
    setError('');
    setNotice('');
    setNewWebhookSecret('');
    try {
      const result = await callEdge('pixwiki-api-admin', {
        action: 'create_webhook',
        name: hookName.trim() || 'Webhook',
        url: hookUrl.trim(),
        company_id: hookCompany || null,
      });
      setNewWebhookSecret(result.signing_secret || '');
      setHookUrl('');
      setNotice('Webhook criado. Copie o segredo de assinatura agora; ele não será exibido novamente.');
      await loadAll();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('webhook_limit_reached')) setError('Você atingiu o limite de 10 webhooks.');
      else if (msg.includes('private_webhook_host_not_allowed')) setError('Endereços locais ou privados não são permitidos.');
      else if (msg.includes('invalid_webhook')) setError('Use uma URL HTTPS pública válida.');
      else setError('Não foi possível criar o webhook.');
    } finally {
      setBusy('');
    }
  }

  async function toggleWebhook(hook: WebhookRow) {
    setBusy(`hook-${hook.id}`);
    try {
      await callEdge('pixwiki-api-admin', {
        action: 'update_webhook',
        webhook_id: hook.id,
        is_active: !hook.is_active,
      });
      await loadAll();
    } catch {
      setError('Não foi possível alterar o webhook.');
    } finally {
      setBusy('');
    }
  }

  async function testWebhook(hook: WebhookRow) {
    setBusy(`test-${hook.id}`);
    setError('');
    setNotice('');
    try {
      const result = await callEdge('pixwiki-api-admin', {
        action: 'test_webhook',
        webhook_id: hook.id,
      });
      setNotice(`Teste entregue com HTTP ${result?.result?.status ?? 200}.`);
      await loadAll();
    } catch {
      setError('O endpoint não respondeu com HTTP 2xx ao teste.');
      await loadAll().catch(() => undefined);
    } finally {
      setBusy('');
    }
  }

  async function rotateSecret(hook: WebhookRow) {
    if (!window.confirm('Gerar um novo segredo? O segredo anterior deixará de validar imediatamente.')) return;
    setBusy(`rotate-${hook.id}`);
    setError('');
    setNewWebhookSecret('');
    try {
      const result = await callEdge('pixwiki-api-admin', {
        action: 'rotate_webhook_secret',
        webhook_id: hook.id,
      });
      setNewWebhookSecret(result.signing_secret || '');
      setNotice('Novo segredo criado. Atualize seu sistema antes do próximo evento.');
    } catch {
      setError('Não foi possível rotacionar o segredo.');
    } finally {
      setBusy('');
    }
  }

  async function deleteWebhook(hook: WebhookRow) {
    if (!window.confirm(`Excluir o webhook "${hook.name}"?`)) return;
    setBusy(`delete-${hook.id}`);
    try {
      await callEdge('pixwiki-api-admin', {
        action: 'delete_webhook',
        webhook_id: hook.id,
      });
      setNotice('Webhook excluído.');
      await loadAll();
    } catch {
      setError('Não foi possível excluir o webhook.');
    } finally {
      setBusy('');
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice('Copiado.');
  }

  const latestDelivery = (hookId: string) =>
    deliveries.find(d => d.webhook_id === hookId) || null;

  if (loading) {
    return (
      <main className={`min-h-screen px-4 py-12 ${dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
        <div className="mx-auto max-w-6xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
        </div>
      </main>
    );
  }

  const isPro = plan?.effective_plan === 'pro' && plan?.features?.api === true;

  if (!isPro) {
    return (
      <main className={`min-h-screen pb-28 ${dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <PixWikiHeader
            plan={plan?.effective_plan || 'free'}
            dark={dark}
            onThemeChange={setDark}
          />

          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-7">
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-slate-950">PIX PRO</span>
            <h1 className="mt-4 text-3xl font-black">Integrações</h1>
            <p className={`mt-3 leading-relaxed ${dark ? 'text-white/65' : 'text-slate-600'}`}>
              Conecte seu ERP, e-commerce, automação ou sistema próprio aos recebimentos do PixWiki.
              Os recursos avançados de integração estão incluídos no Pix Pro.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen pb-28 ${dark ? 'bg-[#020617] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PixWikiHeader
          plan={plan?.effective_plan || 'pro'}
          dark={dark}
          onThemeChange={setDark}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-black tracking-tight">Integrações</h1>
          <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${dark ? 'text-slate-500 dark:text-white/55' : 'text-slate-500'}`}>
            Integre os recebimentos do PixWiki ao seu sistema sem acessar credenciais do Mercado Pago.
          </p>
        </div>

        {(notice || error) && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            error ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          }`}>
            {error || notice}
          </div>
        )}

        {newApiSecret && (
          <section className="mt-5 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
            <p className="font-black text-amber-300">Copie sua API Key agora</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/55">Por segurança, o PixWiki não consegue exibir esta chave novamente.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-slate-100 dark:bg-black/30 p-3 text-xs text-amber-100">{newApiSecret}</code>
              <button onClick={() => copy(newApiSecret)} className="rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950">Copiar</button>
            </div>
          </section>
        )}

        {newWebhookSecret && (
          <section className="mt-5 rounded-3xl border border-sky-400/30 bg-sky-400/10 p-5">
            <p className="font-black text-sky-300">Segredo de assinatura do Webhook</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/55">Guarde como senha. Ele é usado para validar X-PixWiki-Signature.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-slate-100 dark:bg-black/30 p-3 text-xs text-sky-100">{newWebhookSecret}</code>
              <button onClick={() => copy(newWebhookSecret)} className="rounded-xl bg-sky-300 px-4 py-3 text-xs font-black text-slate-950">Copiar</button>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.035] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Chaves de API</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/50">Até 10 chaves ativas. Limite de 120 requisições/minuto por chave.</p>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-white/35">{keys.filter(k => !k.revoked_at).length}/10</span>
            </div>

            <div className="mt-5 flex gap-2">
              <input
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                maxLength={80}
                placeholder="Nome da integração"
                className="min-w-0 flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.055] px-4 py-3 text-sm outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={createKey}
                disabled={busy === 'key' || keys.filter(k => !k.revoked_at).length >= 10}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"
              >
                Criar chave
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {keys.length === 0 && <p className="rounded-2xl border border-black/10 dark:border-white/10 p-4 text-sm text-slate-500 dark:text-white/45">Nenhuma chave criada.</p>}
              {keys.map(key => (
                <div key={key.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{key.name}</p>
                      <code className="mt-1 block text-xs text-slate-500 dark:text-white/45">{key.key_prefix}••••••••</code>
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-white/35">
                        Criada: {formatDate(key.created_at)} · Último uso: {formatDate(key.last_used_at)}
                      </p>
                    </div>
                    {key.revoked_at ? (
                      <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-white/45">REVOGADA</span>
                    ) : (
                      <button
                        onClick={() => revokeKey(key.id)}
                        disabled={busy === `key-${key.id}`}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.035] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Novo Webhook</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/50">O PixWiki envia <code>pix.received</code> para uma URL HTTPS pública.</p>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-white/35">{webhooks.length}/10</span>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={hookName}
                onChange={e => setHookName(e.target.value)}
                maxLength={80}
                placeholder="Nome do webhook"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.055] px-4 py-3 text-sm outline-none focus:border-sky-400/60"
              />
              <input
                value={hookUrl}
                onChange={e => setHookUrl(e.target.value)}
                placeholder="https://seusistema.com/webhooks/pixwiki"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.055] px-4 py-3 text-sm outline-none focus:border-sky-400/60"
              />
              <select
                value={hookCompany}
                onChange={e => setHookCompany(e.target.value)}
                className="w-full appearance-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white"
                style={{ colorScheme: dark ? "dark" : "light" }}
              >
                <option value="">Todas as empresas</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                onClick={createWebhook}
                disabled={busy === 'webhook' || webhooks.length >= 10}
                className="w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
              >
                Criar Webhook
              </button>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.035] p-5 sm:p-6">
          <h2 className="text-xl font-black">Webhooks configurados</h2>
          <div className="mt-5 grid gap-3">
            {webhooks.length === 0 && <p className="rounded-2xl border border-black/10 dark:border-white/10 p-5 text-sm text-slate-500 dark:text-white/45">Nenhum webhook configurado.</p>}
            {webhooks.map(hook => {
              const last = latestDelivery(hook.id);
              const company = companies.find(c => c.id === hook.company_id);
              return (
                <div key={hook.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/10 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{hook.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${hook.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/45'}`}>
                          {hook.is_active ? 'ATIVO' : 'PAUSADO'}
                        </span>
                        {last && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            last.status === 'delivered' ? 'bg-sky-500/15 text-sky-300' :
                            last.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                            'bg-amber-500/15 text-amber-300'
                          }`}>
                            {statusLabel(last.status)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500 dark:text-white/50">{hook.url}</p>
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-white/35">
                        Escopo: {company?.name || 'Todas as empresas'} · Último HTTP: {hook.last_status_code ?? '—'} · Sucesso: {formatDate(hook.last_success_at)}
                      </p>
                      {last && <p className="mt-1 text-[11px] text-slate-400 dark:text-white/35">Última entrega: {statusLabel(last.status)} · tentativa {last.attempt_count}/5 · HTTP {last.response_status ?? '—'}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => testWebhook(hook)} disabled={!!busy} className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-black text-slate-950">Testar</button>
                      <button onClick={() => toggleWebhook(hook)} disabled={!!busy} className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-bold text-slate-600 dark:text-white/70">{hook.is_active ? 'Pausar' : 'Ativar'}</button>
                      <button onClick={() => rotateSecret(hook)} disabled={!!busy} className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-bold text-slate-600 dark:text-white/70">Novo segredo</button>
                      <button onClick={() => deleteWebhook(hook)} disabled={!!busy} className="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-bold text-red-300">Excluir</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.035] p-5 sm:p-6">
          <h2 className="text-xl font-black">Para integrar com seu sistema</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/55">
            Use <code className="text-emerald-300">Authorization: Bearer SUA_API_KEY</code>. Valores monetários são retornados em centavos para evitar erros de ponto flutuante.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ['GET', '/api/v1/companies', 'Lista as empresas PixWiki da conta.'],
              ['GET', '/api/v1/receipts', 'Lista recebimentos. Aceita company_id, source, status, from, to, limit e offset.'],
              ['GET', '/api/v1/receipts/:id', 'Consulta um recebimento específico.'],
              ['GET', '/api/v1/summary', 'Totais de bruto, tarifas, líquido e contagem no período.'],
            ].map(([method, endpoint, desc]) => (
              <div key={endpoint} className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">{method}</span>
                  <code className="text-xs text-slate-700 dark:text-white/80">https://pix.wiki{endpoint}</code>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-white/45">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 dark:border-white/10 bg-slate-100 dark:bg-black/20 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/45">Exemplo</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre text-xs leading-relaxed text-emerald-200">{`curl \\
  -H "Authorization: Bearer SUA_API_KEY" \\
  "https://pix.wiki/api/v1/receipts?source=pix_key&limit=50"`}</pre>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.035] p-5 sm:p-6">
          <h2 className="text-xl font-black">Validando a assinatura do Webhook</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-white/55">
            O PixWiki assina o texto <code>timestamp.corpo_bruto</code> com HMAC-SHA256. Compare em tempo constante e rejeite timestamps antigos.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-100 dark:bg-black/25 p-4 text-xs leading-relaxed text-sky-200">{`import { createHmac, timingSafeEqual } from "node:crypto";

const timestamp = req.headers["x-pixwiki-timestamp"];
const received = req.headers["x-pixwiki-signature"].replace("v1=", "");
const rawBody = /* corpo EXATO recebido, antes do JSON.parse */;

const expected = createHmac("sha256", PIXWIKI_WEBHOOK_SECRET)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest("hex");

const valid = timingSafeEqual(
  Buffer.from(received, "hex"),
  Buffer.from(expected, "hex")
);`}</pre>
          <p className="mt-3 text-xs text-slate-500 dark:text-white/40">
            Headers: X-PixWiki-Event, X-PixWiki-Event-Id, X-PixWiki-Timestamp, X-PixWiki-Signature e Idempotency-Key.
            Em falha, o PixWiki tenta novamente em 1 min, 5 min, 30 min e 2 h, até 5 tentativas no total.
          </p>
        </section>

        <PixWikiDashboardNav dark={dark} />
      </div>
    </main>
  );
}
