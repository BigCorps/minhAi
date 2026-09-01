'use client';

import { CheckCircle2, Copy, Facebook, Instagram, Loader2, MessageCircle, RefreshCw, Save, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import EmbeddedSignupButton from '@/components/meta/EmbeddedSignupButton';
import { useFuncionarIAState } from '@/components/funcionaria/FuncionarIADashboardShell';
import type { FuncionarIAWhatsAppMode } from '@/lib/funcionaria-skills';

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${active ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-500'}`}>
      {active && <CheckCircle2 className="h-3 w-3" />}{label}
    </span>
  );
}

function ModeCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[#6D28D9] bg-violet-50 ring-1 ring-[#6D28D9]/10' : 'border-slate-200 hover:border-violet-200'}`}>
      <div className="flex items-center justify-between gap-2"><span className="font-black">{title}</span>{active && <CheckCircle2 className="h-4 w-4 text-[#6D28D9]" />}</div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

export function FuncionarIAChannelsPanel({ mode }: { mode: 'meta' | 'whatsapp' }) {
  const { state, reload: reloadState } = useFuncionarIAState();
  const supabase = useMemo(() => createClient(), []);
  const companyId = state.company?.id || '';
  const [userId, setUserId] = useState('');
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [whatsappMode, setWhatsappMode] = useState<FuncionarIAWhatsAppMode>(state.settings?.whatsapp_mode || 'hybrid');

  useEffect(() => { setWhatsappMode(state.settings?.whatsapp_mode || 'hybrid'); }, [state.settings?.whatsapp_mode]);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id || '');
    const { data } = await supabase
      .from('meta_connections')
      .select('id,company_id,page_name,meta_page_id,instagram_account_id,instagram_username,whatsapp_number_id,whatsapp_number,agent_enabled,is_coexistence,updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setConnection(data || null);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveMode() {
    if (!companyId) return;
    setSaving(true); setMessage('');
    const { error } = await supabase.rpc('funcionaria_save_channel_settings', {
      p_company_id: companyId,
      p_whatsapp_mode: whatsappMode,
    });
    setSaving(false);
    if (error) setMessage('Não foi possível salvar.');
    else { setMessage('Configuração salva.'); await reloadState(); }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#6D28D9]" /></div>;
  if (!companyId) return null;

  const facebookConnected = !!connection?.meta_page_id;
  const instagramConnected = !!connection?.instagram_account_id;
  const whatsappConnected = !!connection?.whatsapp_number_id;

  if (mode === 'whatsapp') {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-black">WhatsApp Business</h2></div>
              <p className="mt-2 text-sm leading-6 text-slate-500">A FuncionarIA usa a mesma integração Meta já existente na minhAi. Não é necessário cadastrar uma segunda conta.</p>
            </div>
            <StatusPill active={whatsappConnected} label={whatsappConnected ? 'CONECTADO' : 'NÃO CONECTADO'} />
          </div>

          {whatsappConnected ? (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Número conectado: {connection.whatsapp_number || connection.whatsapp_number_id}
              {connection.is_coexistence && <div className="mt-1 text-xs font-semibold text-emerald-700">Coexistence ativo: o WhatsApp Business App pode continuar sendo usado.</div>}
            </div>
          ) : userId ? (
            <div className="mt-5">
              <EmbeddedSignupButton
                companyId={companyId}
                userId={userId}
                mode="coexistence"
                whatsappOnly
                configIdOverride={process.env.NEXT_PUBLIC_META_CONFIG_ID_WA}
                onSuccess={() => { setMessage('WhatsApp conectado com sucesso.'); void load(); }}
                onError={setMessage}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> Conectar WhatsApp
              </EmbeddedSignupButton>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Como ela atende</div>
          <h2 className="mt-2 text-xl font-black">Escolha o modo do WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Você pode mudar a estratégia quando quiser. A configuração vale apenas para a FuncionarIA.</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <ModeCard active={whatsappMode === 'redirect'} title="Direcionar" description="Mais econômico. A primeira resposta leva o cliente para empresa.funcionaria.net e o atendimento continua fora do WhatsApp." onClick={() => setWhatsappMode('redirect')} />
            <ModeCard active={whatsappMode === 'native'} title="Atender no WhatsApp" description="FAQs, habilidades compatíveis e IA opcional continuam dentro do WhatsApp." onClick={() => setWhatsappMode('native')} />
            <ModeCard active={whatsappMode === 'hybrid'} title="Atendimento inteligente" description="Recomendado. Perguntas simples ficam no WhatsApp e fluxos maiores abrem na FuncionarIA." onClick={() => setWhatsappMode('hybrid')} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void saveMode()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar modo
            </button>
            {message && <span className="text-xs font-bold text-slate-500">{message}</span>}
          </div>
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">Mensagens cobradas pela Meta e recursos variáveis usam Créditos de uso. FAQ e habilidades determinísticas não geram custo de IA por si mesmas.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><Facebook className="h-5 w-5 text-blue-600" /><Instagram className="h-5 w-5 text-pink-600" /><h2 className="text-lg font-black">Instagram e Facebook</h2></div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A mesma conexão Meta da minhAi é reaproveitada. Na FuncionarIA, FAQ e habilidades contratadas vêm antes da IA.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-black"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</div><StatusPill active={facebookConnected} label={facebookConnected ? 'CONECTADO' : 'PENDENTE'} /></div>{connection?.page_name && <div className="mt-2 text-xs font-semibold text-slate-500">{connection.page_name}</div>}</div>
          <div className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-black"><Instagram className="h-4 w-4 text-pink-600" /> Instagram</div><StatusPill active={instagramConnected} label={instagramConnected ? 'CONECTADO' : 'PENDENTE'} /></div>{connection?.instagram_username && <div className="mt-2 text-xs font-semibold text-slate-500">@{connection.instagram_username.replace('@','')}</div>}</div>
        </div>

        {(!facebookConnected || !instagramConnected) && userId && (
          <div className="mt-5">
            <EmbeddedSignupButton
              companyId={companyId}
              userId={userId}
              mode="cloud"
              onSuccess={() => { setMessage('Conta Meta conectada.'); void load(); }}
              onError={setMessage}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 py-3 text-sm font-black text-white hover:opacity-90"
            >
              Conectar conta Meta
            </EmbeddedSignupButton>
          </div>
        )}
        {message && <div className="mt-3 text-xs font-bold text-slate-500">{message}</div>}
      </div>

      <div className="rounded-3xl border border-lime-100 bg-lime-50 p-5">
        <h3 className="font-black text-lime-900">FAQ First também nos canais</h3>
        <p className="mt-2 text-sm leading-6 text-lime-800">Perguntas de horário, endereço, contatos e Respostas Rápidas podem ser resolvidas sem IA. Se a resposta não existir, a IA só entra quando estiver ativada e houver créditos.</p>
      </div>
    </div>
  );
}

export function FuncionarIAWidgetInstallCard() {
  const { state } = useFuncionarIAState();
  const [copied, setCopied] = useState(false);
  if (!state.company) return null;
  const color = state.settings?.primary_color || '#6D28D9';
  const snippet = `<script src="https://funcionaria.net/funcionaria-widget.js" data-slug="${state.company.slug}" data-color="${color}"></script>`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">Widget grátis</div>
          <h2 className="mt-2 text-lg font-black">Coloque a mesma FuncionarIA no seu site</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">O widget usa a mesma aparência, FAQs e habilidades do subdomínio. Quando uma habilidade nova for ativada, ela passa a funcionar no widget automaticamente.</p>
        </div>
        <StatusPill active label="INCLUÍDO" />
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4"><code className="whitespace-nowrap text-xs font-semibold text-lime-300">{snippet}</code></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl bg-[#6D28D9] px-4 py-2.5 text-xs font-black text-white"><Copy className="h-4 w-4" /> {copied ? 'Copiado!' : 'Copiar código'}</button>
        <a href={`https://${state.company.slug}.funcionaria.net`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Abrir FuncionarIA</a>
      </div>
    </section>
  );
}
