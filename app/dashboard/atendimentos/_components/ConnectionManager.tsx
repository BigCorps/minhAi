'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConnectionManager.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, AlertCircle, Instagram, Facebook, CheckCircle, Trash2,
  Phone, Share2, X, Bot, Save, ChevronDown, ChevronUp,
  MessageSquare, CreditCard, Zap, Building2, MapPin, Calculator,
  AtSign, Globe, Mail, Smartphone, MessageCircle, Hash,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

// ─── Tipos ────────────────────────────────────────────────────────────────
type Company = { id: string; name: string; system_prompt: string | null };

type MetaConnection = {
  id: string;
  company_id: string;
  meta_page_id: string;
  page_name: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
  whatsapp_number_id: string | null;
  whatsapp_number: string | null;
  agent_enabled: boolean;
  agent_prompt: string | null;
  // Modo prompt
  prompt_enabled: boolean;
  greeting_message: string | null;
  // Funções
  faq_enabled: boolean;
  pix_enabled: boolean;
  contacts_enabled: boolean;
  nossa_marca_enabled: boolean;
  endereco_enabled: boolean;
  orcamento_enabled: boolean;
  // Comentários
  comments_enabled: boolean;
  comments_mode: 'all' | 'keyword';
  comments_keywords: string | null;
  comments_reply_text: string | null;
  comments_dm_text: string | null;
  // Créditos
  credits_per_reply_facebook: number;
  credits_per_reply_instagram: number;
  credits_per_reply_whatsapp: number;
  created_at: string;
};

type Notification = { id: number; message: string; type: 'success' | 'error' };

// ─── Notificações inline ───────────────────────────────────────────────────
function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((n) => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs
          ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="flex-1">{n.message}</span>
          <button onClick={() => onDismiss(n.id)} className="opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Toggle de função reutilizável ────────────────────────────────────────
function FunctionToggle({
  icon, label, description, credits, checked, onChange, always, disabled,
}: {
  icon: React.ReactNode; label: string; description: string; credits: string;
  checked: boolean; onChange: (v: boolean) => void; always?: boolean; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border
      ${always ? 'bg-muted/10 border-dashed border-border opacity-70' : 'bg-muted/20 border-border'}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {description} · <span className="text-yellow-500 font-medium">{credits}</span>
          </p>
        </div>
      </div>
      {always
        ? <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">Sempre ativo</span>
        : <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      }
    </div>
  );
}

// ─── Painel de funções ────────────────────────────────────────────────────
function FunctionsPanel({
  connection, onSave,
}: {
  connection: MetaConnection;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(field: keyof MetaConnection, value: boolean) {
    setSaving(field as string);
    await onSave({ [field]: value });
    setSaving(null);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full">
        <Zap className="h-4 w-4" />
        <span>Funções habilitadas</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2">

          <FunctionToggle
            icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
            label="Perguntas Frequentes (FAQ)"
            description="Responde com base nas perguntas cadastradas"
            credits="1 crédito"
            checked={connection.faq_enabled ?? true}
            onChange={(v) => toggle('faq_enabled', v)}
            disabled={saving === 'faq_enabled'}
          />

          <FunctionToggle
            icon={<Building2 className="h-4 w-4 text-cyan-500" />}
            label="Nossa Marca"
            description="Apresenta informações sobre a empresa e horários"
            credits="1 crédito"
            checked={connection.nossa_marca_enabled ?? false}
            onChange={(v) => toggle('nossa_marca_enabled', v)}
            disabled={saving === 'nossa_marca_enabled'}
          />

          <FunctionToggle
            icon={<MapPin className="h-4 w-4 text-purple-500" />}
            label="Endereço"
            description="Endereço com link Google Maps"
            credits="1 crédito"
            checked={connection.endereco_enabled ?? false}
            onChange={(v) => toggle('endereco_enabled', v)}
            disabled={saving === 'endereco_enabled'}
          />

          <FunctionToggle
            icon={<AtSign className="h-4 w-4 text-green-500" />}
            label="Contatos (WhatsApp, Instagram, email...)"
            description="Responde com links diretos de cada canal"
            credits="1 crédito"
            checked={connection.contacts_enabled ?? false}
            onChange={(v) => toggle('contacts_enabled', v)}
            disabled={saving === 'contacts_enabled'}
          />

          <FunctionToggle
            icon={<Calculator className="h-4 w-4 text-blue-600" />}
            label="Criar Orçamento"
            description="Gera orçamentos com IA (requer prompt configurado)"
            credits="2 créditos"
            checked={connection.orcamento_enabled ?? false}
            onChange={(v) => toggle('orcamento_enabled', v)}
            disabled={saving === 'orcamento_enabled'}
          />

          <FunctionToggle
            icon={<CreditCard className="h-4 w-4 text-green-500" />}
            label="PIX — Geração e Confirmação"
            description="Gera copia-e-cola e confirma pagamentos"
            credits="1 crédito por confirmação"
            checked={connection.pix_enabled ?? false}
            onChange={(v) => toggle('pix_enabled', v)}
            disabled={saving === 'pix_enabled'}
          />

          <FunctionToggle
            icon={<Bot className="h-4 w-4 text-purple-500" />}
            label="Respostas via IA (Prompt)"
            description="Responde qualquer mensagem que não ative outra função"
            credits="2 créditos"
            checked={connection.prompt_enabled ?? true}
            onChange={(v) => toggle('prompt_enabled', v)}
            disabled={saving === 'prompt_enabled'}
          />

          {/* Mensagem de saudação — só quando prompt desativado */}
          {!connection.prompt_enabled && (
            <GreetingConfig connection={connection} onSave={onSave} />
          )}

        </div>
      )}
    </div>
  );
}

// ─── Configuração de saudação (modo só-funções) ───────────────────────────
function GreetingConfig({
  connection, onSave,
}: {
  connection: MetaConnection;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [text, setText] = useState(connection.greeting_message || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ greeting_message: text.trim() || null });
    setSaving(false);
  }

  return (
    <div className="ml-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
      <p className="text-xs font-medium text-green-600 dark:text-green-400">
        Modo só com funções ativo — o bot só responde quando uma função for acionada, sem utilizar o ChatGPT.
      </p>
      <p className="text-xs text-muted-foreground">
        Mensagem de saudação enviada na primeira interação do cliente:
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Ex: Olá! Posso te ajudar com orçamentos, endereço ou PIX. O que precisa?"
        className="w-full text-sm rounded-lg border p-2 resize-none outline-none
          bg-background text-foreground border-border placeholder:text-muted-foreground
          focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
      />
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Salvando...</> : <><Save className="mr-2 h-3 w-3" />Salvar saudação</>}
      </Button>
    </div>
  );
}

// ─── Painel de comentários ────────────────────────────────────────────────
function CommentsPanel({
  connection, onSave,
}: {
  connection: MetaConnection;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(connection.comments_enabled ?? false);
  const [mode, setMode] = useState<'all' | 'keyword'>(connection.comments_mode ?? 'all');
  const [keywords, setKeywords] = useState(connection.comments_keywords ?? '');
  const [replyText, setReplyText] = useState(connection.comments_reply_text ?? '');
  const [dmText, setDmText] = useState(connection.comments_dm_text ?? '');

  async function handleSave() {
    setSaving(true);
    await onSave({
      comments_enabled:    enabled,
      comments_mode:       mode,
      comments_keywords:   mode === 'keyword' ? keywords.trim() || null : null,
      comments_reply_text: replyText.trim() || null,
      comments_dm_text:    dmText.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full">
        <MessageCircle className="h-4 w-4" />
        <span>Resposta automática a comentários</span>
        {enabled && <span className="ml-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Ativo</span>}
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">

          {/* Toggle principal */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-sm font-medium">Ativar para Facebook e Instagram</p>
              <p className="text-xs text-muted-foreground">Reply público + DM automático ao detectar comentário</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Modo */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quando responder</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('all')}
                    className={`p-3 rounded-lg border text-sm text-left transition
                      ${mode === 'all' ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}>
                    <p className="font-medium">Todos os comentários</p>
                    <p className="text-xs mt-0.5 opacity-70">Responde qualquer comentário novo</p>
                  </button>
                  <button onClick={() => setMode('keyword')}
                    className={`p-3 rounded-lg border text-sm text-left transition
                      ${mode === 'keyword' ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Hash className="h-3.5 w-3.5" />
                      Palavra-chave
                    </div>
                    <p className="text-xs mt-0.5 opacity-70">Só com as palavras definidas</p>
                  </button>
                </div>
              </div>

              {/* Palavras-chave */}
              {mode === 'keyword' && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Palavras-chave</p>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="preço, quero, interesse, desconto"
                    className="w-full text-sm rounded-lg border p-2 outline-none
                      bg-background text-foreground border-border placeholder:text-muted-foreground
                      focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">Separe por vírgula. Sem distinção de maiúsculas.</p>
                </div>
              )}

              {/* Reply público */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Reply no comentário (público)</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Ex: Olá! Enviamos mais detalhes no seu Direct 📩"
                  className="w-full text-sm rounded-lg border p-2 resize-none outline-none
                    bg-background text-foreground border-border placeholder:text-muted-foreground
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">Resposta pública visível a todos. Deixe vazio para não responder no comentário.</p>
              </div>

              {/* DM automático */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Mensagem no Direct (privado)</p>
                <textarea
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  rows={4}
                  placeholder="Ex: Olá! Vi seu comentário. Aqui estão mais detalhes sobre nosso produto..."
                  className="w-full text-sm rounded-lg border p-2 resize-none outline-none
                    bg-background text-foreground border-border placeholder:text-muted-foreground
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  Mensagem inicial enviada no Direct. Após isso, o cliente pode responder e o bot continuará normalmente com as funções configuradas.
                </p>
              </div>

              {/* Preview */}
              {(replyText || dmText) && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview do fluxo</p>
                  <div className="flex items-start gap-2 text-xs">
                    <MessageCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Cliente comenta no post</p>
                      {mode === 'keyword' && keywords && (
                        <p className="text-yellow-600 dark:text-yellow-400 mt-0.5">↳ Somente se contiver: {keywords}</p>
                      )}
                    </div>
                  </div>
                  {replyText && (
                    <div className="flex items-start gap-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Reply público:</p>
                        <p className="text-foreground mt-0.5 italic">"{replyText.substring(0, 80)}{replyText.length > 80 ? '...' : ''}"</p>
                      </div>
                    </div>
                  )}
                  {dmText && (
                    <div className="flex items-start gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 mt-0.5 text-purple-500 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">DM automático:</p>
                        <p className="text-foreground mt-0.5 italic">"{dmText.substring(0, 80)}{dmText.length > 80 ? '...' : ''}"</p>
                      </div>
                    </div>
                  )}
                  {dmText && (
                    <div className="flex items-start gap-2 text-xs">
                      <Bot className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-muted-foreground">Se o cliente responder o DM, o bot continua com as funções ativas.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <Button size="sm" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Salvando...</> : <><Save className="mr-2 h-3 w-3" />Salvar configurações</>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Painel de configuração do prompt ────────────────────────────────────
function AgentConfigPanel({
  connection, companySystemPrompt, onSave,
}: {
  connection: MetaConnection;
  companySystemPrompt: string | null;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useCustom, setUseCustom] = useState(!!connection.agent_prompt);
  const [promptText, setPromptText] = useState(connection.agent_prompt || companySystemPrompt || '');

  async function handleSave() {
    setIsSaving(true);
    await onSave({ agent_prompt: useCustom ? promptText.trim() || null : null });
    setIsSaving(false);
  }

  return (
    <div className="mt-2 border-t border-border pt-3">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition w-full">
        <Bot className="h-4 w-4" />
        <span>Configurar prompt do agente</span>
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex-1">
              <p className="text-sm font-medium">Prompt personalizado para Meta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {useCustom ? 'Usando prompt exclusivo para este canal' : 'Usando prompt do assistente (Perguntas/Respostas)'}
              </p>
            </div>
            <Switch checked={useCustom} onCheckedChange={(v) => { setUseCustom(v); if (!v) setPromptText(companySystemPrompt || ''); }} />
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={!useCustom}
            rows={5}
            placeholder="Ex: Você é um atendente da Loja X. Responda apenas sobre nossos produtos..."
            className={`w-full text-sm rounded-lg border p-3 resize-y outline-none transition
              bg-background text-foreground border-border placeholder:text-muted-foreground
              ${useCustom ? 'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500' : 'opacity-60 cursor-not-allowed'}`}
          />
          {!useCustom && (
            <p className="text-xs text-muted-foreground">
              Para editar, ative o prompt personalizado acima ou edite na função Perguntas Gerais.
              <a href="/dashboard/faqs" className="underline hover:text-foreground">Perguntas/Respostas</a>.
            </p>
          )}
          {useCustom && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar prompt</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export function ConnectionManager({ onCompanyChange }: { onCompanyChange?: (id: string) => void } = {}) {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifCounter = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function notify(message: string, type: 'success' | 'error') {
    const id = ++notifCounter.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }
  function dismissNotif(id: number) { setNotifications((prev) => prev.filter((n) => n.id !== id)); }

  useEffect(() => {
    async function loadCompanies() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('companies').select('id, name, system_prompt')
        .eq('user_id', user.id).eq('is_active', true).order('name');
      if (data && data.length > 0) { setCompanies(data); setSelectedCompanyId(data[0].id); onCompanyChange?.(data[0].id); }
    }
    loadCompanies();
  }, []);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  const fetchConnections = useCallback(async (companyId?: string) => {
    const id = companyId || selectedCompanyId;
    if (!id) { setIsLoading(false); return []; }
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('meta_connections')
        .select('*').eq('company_id', id).order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setConnections(data || []);
      return data || [];
    } catch (err: any) { setError(err.message); return []; }
    finally { setIsLoading(false); }
  }, [selectedCompanyId]);

  useEffect(() => { setIsLoading(true); fetchConnections(); }, [selectedCompanyId, fetchConnections]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const channel = supabase.channel('meta_connections_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_connections', filter: `company_id=eq.${selectedCompanyId}` },
        () => { fetchConnections(); stopPolling(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCompanyId, fetchConnections]);

  useEffect(() => {
    const onFocus = () => fetchConnections();
    const onVis = () => { if (!document.hidden) fetchConnections(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchConnections]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => { const f = await fetchConnections(); if (f && f.length > 0) stopPolling(); }, 5000);
  }
  function stopPolling() { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } }
  useEffect(() => {
    if (!isLoading && connections.length === 0) startPolling(); else stopPolling();
    return stopPolling;
  }, [connections.length, isLoading]);

  const handleConnect = async () => {
    if (!selectedCompanyId) { notify('Selecione um assistente antes de conectar.', 'error'); return; }
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
      if (!META_APP_ID) throw new Error('META_APP_ID não configurado');
      const state = `${user.id}:${selectedCompanyId}:${crypto.randomUUID().substring(0, 8)}`;
      const redirectUri = `${window.location.origin}/auth/callback/facebook`;
      const scopes = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_engagement',
  'pages_manage_metadata',
  'pages_messaging',
  'pages_manage_posts',            // ← novo: responder comentários FB
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_manage_comments',     // ← novo: responder comentários IG
  'whatsapp_business_management',
  'whatsapp_business_messaging',
].join(',');
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
      await openOAuthWindow(oauthUrl);
      notify('Conta Meta conectada! As conexões aparecerão em instantes.', 'success');
      await fetchConnections();
      setTimeout(() => fetchConnections(), 1500);
      setTimeout(() => fetchConnections(), 4000);
    } catch (err: any) {
      const isCancel = err.message.includes('cancelada') || err.message.includes('fechado') || err.message.includes('closed');
      if (!isCancel) notify(err.message, 'error');
    } finally { setIsConnecting(false); }
  };

  function openOAuthWindow(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = screen as any;
      const width = 580, height = 680;
      const left = Math.round((s.availLeft ?? 0) + (screen.availWidth - width) / 2);
      const top  = Math.round((s.availTop  ?? 0) + (screen.availHeight - height) / 2);
      const popup = window.open(url, 'MetaOAuth', `width=${width},height=${height},left=${left},top=${top}`);
      if (!popup || popup.closed) {
        localStorage.removeItem('meta_connection_result');
        window.open(url, '_blank');
        const lsi = setInterval(() => {
          const stored = localStorage.getItem('meta_connection_result');
          if (stored) {
            try {
              const d = JSON.parse(stored);
              if (Date.now() - (d.timestamp || 0) < 60_000) { localStorage.removeItem('meta_connection_result'); clearInterval(lsi); d.success ? resolve() : reject(new Error(d.error || 'Erro')); }
            } catch { }
          }
        }, 1000);
        setTimeout(() => { clearInterval(lsi); reject(new Error('Tempo esgotado.')); }, 120_000);
        return;
      }
      const mh = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'meta_connection_success') { window.removeEventListener('message', mh); resolve(); }
        else if (event.data?.type === 'meta_connection_error') { window.removeEventListener('message', mh); reject(new Error(event.data.error || 'Erro')); }
      };
      window.addEventListener('message', mh);
      const cc = setInterval(() => { if (popup.closed) { clearInterval(cc); window.removeEventListener('message', mh); reject(new Error('Autenticação cancelada pelo usuário')); } }, 500);
      setTimeout(() => { clearInterval(cc); window.removeEventListener('message', mh); if (!popup.closed) popup.close(); reject(new Error('Tempo esgotado.')); }, 120_000);
    });
  }

  const handleSaveConnection = async (connectionId: string, updates: Partial<MetaConnection>) => {
    const { error: updateError } = await supabase.from('meta_connections').update(updates).eq('id', connectionId);
    if (updateError) { notify(updateError.message, 'error'); return; }
    setConnections((prev) => prev.map((c) => c.id === connectionId ? { ...c, ...updates } : c));
  };

  const handleToggleAgent = async (connectionId: string, enabled: boolean) => {
    await handleSaveConnection(connectionId, { agent_enabled: enabled });
    notify(enabled ? '🤖 Respostas automáticas ativadas' : '⏸️ Respostas automáticas pausadas', 'success');
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;
    const { error: deleteError } = await supabase.from('meta_connections').delete().eq('id', connectionId);
    if (deleteError) { notify(deleteError.message, 'error'); return; }
    notify('Conta desconectada com sucesso.', 'success');
    await fetchConnections();
  };

  return (
    <>
      <Notifications items={notifications} onDismiss={dismissNotif} />
      <div className="space-y-6">

        {/* Seletor de assistente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              Selecione seu Assistente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); onCompanyChange?.(v); }}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione um assistente" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Configure as funções que o agente pode executar em cada conexão.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conexões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Facebook className="h-5 w-5 text-blue-600" />
              Conexões Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && connections.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Carregando conexões...</p>
              </div>
            ) : error && connections.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-red-500 mb-4">{error}</p>
                <Button variant="outline" onClick={() => fetchConnections()}>Tentar Novamente</Button>
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-muted/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                  <Facebook className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nenhuma conta conectada</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  Conecte sua conta do Facebook para ativar o agente no Instagram, WhatsApp e Messenger.
                </p>
                <Button onClick={handleConnect} size="lg" disabled={isConnecting || !selectedCompanyId}>
                  {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</> : <><Facebook className="mr-2 h-5 w-5" />Conectar Conta Meta</>}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {connections.length} {connections.length === 1 ? 'conexão ativa' : 'conexões ativas'}
                  </p>
                  <Button variant="outline" onClick={handleConnect} disabled={isConnecting || !selectedCompanyId}>
                    {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Conectando...</> : <><Facebook className="mr-2 h-4 w-4" />Conectar Nova Conta</>}
                  </Button>
                </div>

                {connections.map((conn) => (
                  <Card key={conn.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-blue-600" />
                            <p className="font-bold">{conn.page_name}</p>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                          {conn.instagram_username && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Instagram className="h-4 w-4 text-pink-600" />
                              <span>@{conn.instagram_username}</span>
                            </div>
                          )}
                          {conn.whatsapp_number && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 text-green-600" />
                              <span>{conn.whatsapp_number}</span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground pt-1">
                            Configure e acompanhe as conversas das contas do Facebook · Instagram · WhatsApp diretamente no Business Suite do Grupo Meta
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Respostas automáticas</span>
                            <Switch checked={conn.agent_enabled} onCheckedChange={(v) => handleToggleAgent(conn.id, v)} />
                            <span className={`text-xs font-medium ${conn.agent_enabled ? 'text-green-500' : 'text-gray-400'}`}>
                              {conn.agent_enabled ? 'Ativas' : 'Pausadas'}
                            </span>
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => handleDisconnect(conn.id)}>
                            <Trash2 className="mr-1 h-4 w-4" />Remover
                          </Button>
                        </div>
                      </div>

                      <FunctionsPanel connection={conn} onSave={(u) => handleSaveConnection(conn.id, u)} />
                      <CommentsPanel connection={conn} onSave={(u) => handleSaveConnection(conn.id, u)} />
                      <AgentConfigPanel
                        connection={conn}
                        companySystemPrompt={selectedCompany?.system_prompt || null}
                        onSave={(u) => handleSaveConnection(conn.id, u)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
