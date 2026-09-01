// components/dashboard/functions/VendasConfigPanel.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { InfinitePayConfigForm } from './InfinitePayConfigModal';
import { MpPointConfigForm } from './MpPointConfigModal';
import PixPaymentModeSettings from '@/components/pix/PixPaymentModeSettings';
import {
  Zap, ChevronDown, ChevronUp, Save, Loader2,
  CheckCircle, AlertCircle, ExternalLink, Calendar,
  Bot, ShoppingBag, ShoppingCart, Banknote, CreditCard,
  Link2, Terminal, Building2, MessageCircleQuestion,
  MapPin, Eye, EyeOff, Disc,
} from 'lucide-react';

const VENDAS_FUNCTIONS: { key: string; name: string; icon: React.ReactNode; description: string }[] = [
  { key: 'modo_venda',          name: 'Modo Venda',           icon: <Disc className="w-4 h-4 text-gray-500" />, description: 'Catálogo de produtos com carrinho de compras' },
  { key: 'ver_produtos',        name: 'Ver Produtos',         icon: <ShoppingBag className="w-4 h-4 text-gray-500" />, description: 'Consultar produtos do catálogo por voz' },
  { key: 'fazer_pedido',        name: 'Fazer Pedido',         icon: <ShoppingCart className="w-4 h-4 text-gray-500" />, description: 'Pedido por voz com produtos do catálogo' },
  { key: 'registrar_venda',     name: 'Registrar Venda',      icon: <Zap className="w-4 h-4 text-lime-500" />, description: 'Registrar venda manualmente por voz' },
  { key: 'cardapio',            name: 'Cardápio',             icon: <Disc className="w-4 h-4 text-orange-400" />, description: 'Exibir cardápio digital para o cliente' },
  { key: 'minha_conta',         name: 'Minha Conta',          icon: <Building2 className="w-4 h-4 text-gray-500" />, description: 'Consultar saldo e dados da conta' },
  { key: 'cadastrar_produto',   name: 'Cadastrar Produto',    icon: <ShoppingBag className="w-4 h-4 text-blue-400" />, description: 'Adicionar produto ao catálogo por voz' },
  { key: 'pix_generate',        name: 'PIX',                  icon: <Banknote className="w-4 h-4 text-green-500" />, description: 'Cobrar via PIX com confirmação configurável' },
  { key: 'nfc_debito',          name: 'NFC Débito',           icon: <CreditCard className="w-4 h-4 text-red-500" />, description: 'Pagamento por aproximação no débito (InfinitePay)' },
  { key: 'nfc_credito',         name: 'NFC Crédito',          icon: <CreditCard className="w-4 h-4 text-red-500" />, description: 'Pagamento por aproximação no crédito (InfinitePay)' },
  { key: 'link_pagamento',      name: 'Link de Pagamento',    icon: <Link2 className="w-4 h-4 text-red-500" />, description: 'Link de cobrança via InfinitePay' },
  { key: 'tef_debito',          name: 'TEF Débito',           icon: <Terminal className="w-4 h-4 text-red-700" />, description: 'Maquininha débito (Mercado Pago Point)' },
  { key: 'tef_credito',         name: 'TEF Crédito',          icon: <Terminal className="w-4 h-4 text-red-700" />, description: 'Maquininha crédito (Mercado Pago Point)' },
  { key: 'agendar_compromisso', name: 'Agendar',              icon: <Calendar className="w-4 h-4 text-pink-400" />, description: 'Criar eventos no Google Calendar por voz' },
  { key: 'ver_agenda',          name: 'Ver Agenda',           icon: <Calendar className="w-4 h-4 text-pink-400" />, description: 'Consultar compromissos do Google Calendar' },
  { key: 'chatgpt',             name: 'Perguntas Gerais',     icon: <MessageCircleQuestion className="w-4 h-4 text-blue-500" />, description: 'Assistente IA para dúvidas gerais' },
  { key: 'nossa_marca',         name: 'Nossa Marca',          icon: <Building2 className="w-4 h-4 text-gray-500" />, description: 'Informações da empresa, endereço e horários' },
  { key: 'meu_sistema',         name: 'Meu Sistema',          icon: <Terminal className="w-4 h-4 text-lime-600" />, description: 'Informações sobre o minhAi (obrigatório)' },
];

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' }, { value: 'cnpj', label: 'CNPJ' }, { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' }, { value: 'random', label: 'Chave Aleatória' },
];

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition text-left">
        <div className="flex items-center gap-3">{icon}<span className="font-semibold text-gray-900 dark:text-white text-sm">{title}</span></div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 py-5 bg-white dark:bg-slate-900 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>{children}{hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}</div>;
}

const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition';
const textareaCls = inputCls + ' resize-none';

interface VendasConfigPanelProps { companyId: string; companyName: string; }

export default function VendasConfigPanel({ companyId, companyName }: VendasConfigPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [assistantRole, setAssistantRole] = useState('Assistente IA');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [wakeWord, setWakeWord] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [telefoneFixo, setTelefoneFixo] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [website, setWebsite] = useState('');
  const [receivingPixKey, setReceivingPixKey] = useState('');
  const [receivingPixKeyType, setReceivingPixKeyType] = useState('');
  const [enabledFunctions, setEnabledFunctions] = useState<Record<string, boolean>>({});
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: company } = await supabase.from('companies').select(
          'system_prompt, assistant_role, greeting_message, wake_word, business_address, business_hours, telefone_fixo, whatsapp_number, email_contato, website, receiving_pix_key, receiving_pix_key_type'
        ).eq('id', companyId).single();
        if (company) {
          setSystemPrompt(company.system_prompt || ''); setAssistantRole(company.assistant_role || 'Assistente IA');
          setGreetingMessage(company.greeting_message || ''); setWakeWord(company.wake_word || '');
          setBusinessAddress(company.business_address || ''); setBusinessHours(company.business_hours || '');
          setTelefoneFixo(company.telefone_fixo || ''); setWhatsappNumber(company.whatsapp_number || '');
          setEmailContato(company.email_contato || ''); setWebsite(company.website || '');
          setReceivingPixKey(company.receiving_pix_key || ''); setReceivingPixKeyType(company.receiving_pix_key_type || '');
        }
        const { data: settings } = await supabase.from('company_function_settings').select('function_key, is_enabled').eq('company_id', companyId).in('function_key', VENDAS_FUNCTIONS.map(f => f.key));
        const map: Record<string, boolean> = {}; VENDAS_FUNCTIONS.forEach(f => { map[f.key] = false; });
        (settings || []).forEach((s: any) => { map[s.function_key] = s.is_enabled; }); map.meu_sistema = true; setEnabledFunctions(map);
        const { data: google } = await supabase.from('google_accounts').select('id').eq('company_id', companyId).maybeSingle();
        setGoogleConnected(!!google);
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    }
    void load();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleFunction(key: string) { setEnabledFunctions(prev => ({ ...prev, [key]: !prev[key] })); }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const { error: companyErr } = await supabase.from('companies').update({
        system_prompt: systemPrompt, assistant_role: assistantRole, greeting_message: greetingMessage, wake_word: wakeWord,
        business_address: businessAddress, business_hours: businessHours, telefone_fixo: telefoneFixo,
        whatsapp_number: whatsappNumber, email_contato: emailContato, website,
        receiving_pix_key: receivingPixKey || null, receiving_pix_key_type: receivingPixKeyType || null,
      }).eq('id', companyId);
      if (companyErr) throw companyErr;

      for (const fn of VENDAS_FUNCTIONS) {
        const is_enabled = enabledFunctions[fn.key] ?? false;
        const { data: existing } = await supabase.from('company_function_settings').select('id').eq('company_id', companyId).eq('function_key', fn.key).maybeSingle();
        if (existing) await supabase.from('company_function_settings').update({ is_enabled, updated_at: new Date().toISOString() }).eq('company_id', companyId).eq('function_key', fn.key);
        else await supabase.from('company_function_settings').insert({ company_id: companyId, function_key: fn.key, is_enabled });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message || 'Erro ao salvar configurações.'); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-lime-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuração — minhAi Vendas</h2><p className="text-xs text-gray-500 dark:text-gray-400">{companyName} · Comissão 10% por venda | Sem cobrança de créditos</p></div></div>

      <Section title="Identidade do Assistente" icon={<Bot className="w-5 h-5 text-lime-500" />} defaultOpen>
        <Field label="Papel do Assistente" hint="Define como o assistente se apresenta"><select value={assistantRole} onChange={e => setAssistantRole(e.target.value)} className={inputCls}>{['Assistente IA','Atendente IA','Vendedor IA','Consultor IA','Operador IA','Agente IA','Funcionário IA','Auxiliar IA','Gerente IA','Secretário IA','Analista IA','Coordenador IA'].map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
        <Field label="Palavra de Ativação" hint="Ex: olá assistente, oi loja (separe com vírgula para múltiplas)"><input type="text" value={wakeWord} onChange={e => setWakeWord(e.target.value)} placeholder="olá assistente" className={inputCls} /></Field>
        <Field label="Mensagem de Ativação" hint="Frase falada quando o assistente é ativado"><input type="text" value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} placeholder="Olá! Como posso ajudar você hoje?" className={inputCls} /></Field>
        <Field label="Prompt do Assistente" hint="Descreva o tom, ramo de atuação e instruções especiais. O GROQ usa isso para responder conversas."><textarea rows={5} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder={`Você é o vendedor da ${companyName}. Conhece todos os produtos, preços e especialidades da casa.`} className={textareaCls} /></Field>
      </Section>

      <Section title="Informações de Contato" icon={<MapPin className="w-5 h-5 text-blue-500" />}>
        <Field label="Endereço" hint="Endereço completo da empresa"><textarea rows={2} value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="Rua Exemplo, 123 — Bairro, Cidade - UF" className={textareaCls} /></Field>
        <Field label="Horário de Funcionamento"><textarea rows={2} value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Seg–Sex: 08h–18h | Sáb: 08h–12h" className={textareaCls} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="WhatsApp"><input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="5511999999999" className={inputCls} /></Field><Field label="Telefone Fixo"><input type="text" value={telefoneFixo} onChange={e => setTelefoneFixo(e.target.value)} placeholder="(11) 3333-4444" className={inputCls} /></Field></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="E-mail de Contato"><input type="email" value={emailContato} onChange={e => setEmailContato(e.target.value)} placeholder="contato@empresa.com.br" className={inputCls} /></Field><Field label="Website"><input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://empresa.com.br" className={inputCls} /></Field></div>
      </Section>

      <Section title="Recebimento via PIX" icon={<Banknote className="w-5 h-5 text-green-500" />} defaultOpen>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200">Cadastre a chave que receberá o Pix. A forma de confirmação pode continuar no fluxo atual ou migrar, por escolha da empresa, para o Pix Grátis inteligente.</div>
        <Field label="Tipo da Chave PIX"><select value={receivingPixKeyType} onChange={e => setReceivingPixKeyType(e.target.value)} className={inputCls}><option value="">Selecione o tipo</option>{PIX_KEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Chave PIX" hint="A chave cadastrada no banco para receber pagamentos"><input type="text" value={receivingPixKey} onChange={e => setReceivingPixKey(e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className={inputCls} /></Field>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">Salve a chave acima antes de ativar o Pix Grátis pela primeira vez.</p>
        <PixPaymentModeSettings companyId={companyId} product="minhai" compact />
      </Section>

      <Section title="InfinitePay — NFC e Link de Pagamento" icon={<CreditCard className="w-5 h-5 text-red-500" />}>
        <InfinitePayConfigForm settings={{}} onChange={() => {}} functionKey="link_pagamento" />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">O token InfinitePay é compartilhado entre NFC Débito, NFC Crédito e Link de Pagamento. Configure uma vez e as três funções ficam prontas.</p>
        <InfinitePayStandaloneFields companyId={companyId} />
      </Section>

      <Section title="Mercado Pago Point — TEF Débito e Crédito" icon={<Terminal className="w-5 h-5 text-red-700" />}>
        <MpPointConfigForm companyId={companyId} functionKey="tef_credito" />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Access Token e Terminal ID são compartilhados entre TEF Débito e TEF Crédito.</p>
      </Section>

      <Section title="Google Agenda" icon={<Calendar className="w-5 h-5 text-pink-500" />}>
        {googleConnected ? <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /><div><p className="text-sm font-medium text-green-800 dark:text-green-200">Google Calendar conectado</p><p className="text-xs text-green-600 dark:text-green-400">Agendamento e consulta de agenda estão disponíveis.</p></div></div> : <div className="space-y-3"><div className="flex items-start gap-3 p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg"><AlertCircle className="w-4 h-4 text-lime-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-lime-800 dark:text-lime-200">Google Calendar não conectado. Conecte para habilitar as funções de Agendamento e Ver Agenda.</p></div><Link href={`/dashboard/google-connect?companyId=${companyId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><ExternalLink className="w-4 h-4" />Conectar Google Calendar</Link></div>}
      </Section>

      <Section title="Funções do Assistente" icon={<Zap className="w-5 h-5 text-lime-500" />} defaultOpen>
        <p className="text-xs text-gray-500 dark:text-gray-400">Ative ou desative as funções disponíveis para os clientes deste assistente.</p>
        <div className="space-y-2 mt-1">{VENDAS_FUNCTIONS.map(fn => {
          const needsGoogle = fn.key === 'agendar_compromisso' || fn.key === 'ver_agenda'; const isOn = enabledFunctions[fn.key] ?? false;
          return <div key={fn.key} className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition ${isOn ? 'border-lime-200 dark:border-lime-500/30 bg-lime-50 dark:bg-lime-900/10' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]'}`}>
            <div className="flex min-w-0 items-center gap-3">{fn.icon}<div><p className="text-sm font-medium text-gray-900 dark:text-white">{fn.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{fn.description}</p>{needsGoogle && !googleConnected && <p className="text-[10px] text-lime-500 mt-0.5">Requer Google Calendar conectado</p>}</div></div>
            <button type="button" onClick={() => fn.key !== 'meu_sistema' && toggleFunction(fn.key)} disabled={fn.key === 'meu_sistema'} title={fn.key === 'meu_sistema' ? 'Esta função é obrigatória e não pode ser desativada' : undefined} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-lime-500' : 'bg-gray-300 dark:bg-white/20'} ${fn.key === 'meu_sistema' ? 'opacity-60 cursor-not-allowed' : ''}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>;
        })}</div>
      </Section>

      {error && <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700 dark:text-red-300">{error}</p></div>}
      {saved && <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-xl"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><p className="text-sm text-green-700 dark:text-green-300">Configurações salvas com sucesso!</p></div>}

      <button type="button" onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition shadow-lg disabled:opacity-50 bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 shadow-lime-500/20">{saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : <><Save className="w-5 h-5" /> Salvar Configurações</>}</button>

      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-xl flex items-start gap-3"><AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-purple-700 dark:text-purple-300">A versão Vendas mantém as regras comerciais do plano contratado. No modo Pix Grátis, o motor de confirmação não cobra tarifa por transação; no modo Mercado Pago, podem existir tarifas cobradas diretamente pelo provedor.</p></div>
    </div>
  );
}

function InfinitePayStandaloneFields({ companyId }: { companyId: string }) {
  const supabase = createClient();
  const [handle, setHandle] = useState(''); const [show, setShow] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  useEffect(() => { supabase.from('companies').select('infinitepay_handle').eq('id', companyId).single().then(({ data }) => { if (data) setHandle(data.infinitepay_handle || ''); }); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() { setSaving(true); await supabase.from('companies').update({ infinitepay_handle: handle.trim() }).eq('id', companyId); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  return <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/10"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Handle InfinitePay (Token)</label><div className="flex gap-2"><div className="relative flex-1"><input type={show ? 'text' : 'password'} value={handle} onChange={e => setHandle(e.target.value)} placeholder="$seu-handle-aqui" className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent" /><button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div><button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 whitespace-nowrap">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : 'Salvar'}</button></div><p className="text-xs text-gray-400 mt-1">Painel InfinitePay → Integrações → Token. Formato: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">$meu-handle</code></p></div></div>;
}
