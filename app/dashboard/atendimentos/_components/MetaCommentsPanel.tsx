'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/MetaCommentsPanel.tsx
//
// Aba dedicada para configuração de resposta automática a comentários
// de Facebook e Instagram. Extraído do ConnectionManager.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, MessageSquare,
  AlertCircle, Save, ChevronDown, ChevronUp, Info, Lock,
} from 'lucide-react';

// ─── Ícones SVG customizados ──────────────────────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────

interface MetaConnection {
  id: string;
  company_id: string;
  page_name: string;
  meta_page_id: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
  whatsapp_number: string | null;
  agent_enabled: boolean;
  comments_enabled: boolean;
  comments_mode: 'all' | 'keyword';
  comments_keywords: string | null;
  comments_reply_text: string | null;
  comments_dm_text: string | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Seção de configuração colapsável ────────────────────────────────────

function ConfigSection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left
          hover:bg-gray-50 dark:hover:bg-white/5 transition bg-white dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        }
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Painel de comentários para uma conexão ───────────────────────────────

function ConnectionCommentsConfig({
  connection,
  onSave,
}: {
  connection: MetaConnection;
  onSave: (updates: Partial<MetaConnection>) => Promise<void>;
}) {
  const [commentsEnabled, setCommentsEnabled]   = useState(connection.comments_enabled);
  const [mode, setMode]                         = useState<'all' | 'keyword'>(connection.comments_mode || 'all');
  const [keywords, setKeywords]                 = useState(connection.comments_keywords || '');
  const [replyText, setReplyText]               = useState(connection.comments_reply_text || '');
  const [dmText, setDmText]                     = useState(connection.comments_dm_text || '');
  const [saveStatus, setSaveStatus]             = useState<SaveStatus>('idle');

  // Sincroniza se a prop mudar externamente
  useEffect(() => {
    setCommentsEnabled(connection.comments_enabled);
    setMode(connection.comments_mode || 'all');
    setKeywords(connection.comments_keywords || '');
    setReplyText(connection.comments_reply_text || '');
    setDmText(connection.comments_dm_text || '');
  }, [connection.id]);

  async function handleToggleEnabled(value: boolean) {
    setCommentsEnabled(value);
    await onSave({ comments_enabled: value });
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      await onSave({
        comments_mode:       mode,
        comments_keywords:   mode === 'keyword' ? keywords.trim() || null : null,
        comments_reply_text: replyText.trim() || null,
        comments_dm_text:    dmText.trim() || null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  const hasPlatformForComments = connection.meta_page_id || connection.instagram_account_id;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">

      {/* Header da conexão */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {connection.meta_page_id && (
              <FacebookIcon className="h-4 w-4 text-blue-600" />
            )}
            {connection.instagram_account_id && (
              <InstagramIcon className="h-4 w-4 text-pink-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {connection.page_name}
            </p>
            {connection.instagram_username && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{connection.instagram_username}
              </p>
            )}
          </div>
        </div>

        {/* Toggle principal */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${commentsEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {commentsEnabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch
            checked={commentsEnabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>
      </div>

      {/* Aviso se não tem plataforma compatível */}
      {!hasPlatformForComments && (
        <div className="p-4 flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Comentários funcionam apenas com Facebook e Instagram conectados.
          </p>
        </div>
      )}

      {/* Configurações (só visíveis quando ativo) */}
      {commentsEnabled && (
        <div className="p-4 space-y-4">

          {/* Modo de resposta */}
          <ConfigSection
            title="Modo de resposta"
            description="Defina quando o assistente deve responder comentários"
            icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
            defaultOpen
          >
            <div className="space-y-2">
              {/* Todos os comentários */}
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition
                border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name={`mode-${connection.id}`}
                  value="all"
                  checked={mode === 'all'}
                  onChange={() => setMode('all')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Todos os comentários
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Responde automaticamente a qualquer comentário nos posts
                  </p>
                </div>
              </label>

              {/* Por palavra-chave */}
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition
                border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name={`mode-${connection.id}`}
                  value="keyword"
                  checked={mode === 'keyword'}
                  onChange={() => setMode('keyword')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Apenas com palavras-chave
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Responde somente quando o comentário contiver as palavras definidas
                  </p>
                </div>
              </label>

              {/* Campo de palavras-chave */}
              {mode === 'keyword' && (
                <div className="mt-2 pl-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Palavras-chave (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="Ex: preço, informações, quero, interesse"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
                      bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
                      outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    A busca não diferencia maiúsculas/minúsculas e acentos
                  </p>
                </div>
              )}
            </div>
          </ConfigSection>

          {/* Reply público */}
          <ConfigSection
            title="Resposta pública no comentário"
            description="Texto exibido publicamente como reply no comentário"
            icon={<FacebookIcon className="h-4 w-4 text-blue-600" />}
          >
            <div>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={3}
                placeholder={`Ex: Olá! Obrigado pelo seu comentário 😊 Enviamos uma mensagem no seu inbox com mais detalhes!`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
                  outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Deixe em branco para não responder publicamente
              </p>
            </div>
          </ConfigSection>

          {/* DM automático */}
          <ConfigSection
            title="Mensagem privada automática (DM)"
            description="Enviada automaticamente no inbox de quem comentou"
            icon={<InstagramIcon className="h-4 w-4 text-pink-600" />}
          >
            <div>
              <textarea
                value={dmText}
                onChange={e => setDmText(e.target.value)}
                rows={4}
                placeholder={`Ex: Olá! Vi seu comentário no nosso post 😊\nAqui estão mais informações sobre o que você procura...\n\nPode contar com a gente!`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
                  outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Deixe em branco para não enviar DM automático
              </p>
            </div>

            {/* Info sobre permissões */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O DM automático requer que o usuário tenha enviado pelo menos uma mensagem para a página anteriormente
                (restrição da API do Meta para evitar spam).
              </p>
            </div>
          </ConfigSection>

          {/* Botão salvar */}
          <div className="flex items-center justify-between pt-2">
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Configurações salvas
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                ✗ Erro ao salvar. Tente novamente.
              </span>
            )}
            {(saveStatus === 'idle' || saveStatus === 'saving') && (
              <span /> // placeholder para manter o layout
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold
                hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saveStatus === 'saving'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />
              }
              Salvar configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function MetaCommentsPanel({
  selectedCompanyId,
  assistantType = 'smart',
}: {
  selectedCompanyId: string;
  assistantType?: string;
}) {
  const supabase = createClient();
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCompanyId) return;
    loadConnections();
  }, [selectedCompanyId]);

  async function loadConnections() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('meta_connections')
        .select(`
          id, company_id, page_name, meta_page_id,
          instagram_account_id, instagram_username, whatsapp_number,
          agent_enabled, comments_enabled, comments_mode,
          comments_keywords, comments_reply_text, comments_dm_text
        `)
        .eq('company_id', selectedCompanyId)
        .order('created_at');

      if (err) throw err;
      setConnections(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(connectionId: string, updates: Partial<MetaConnection>) {
    const { error: updateErr } = await supabase
      .from('meta_connections')
      .update(updates)
      .eq('id', connectionId);

    if (updateErr) throw updateErr;

    // Atualizar localmente
    setConnections(prev =>
      prev.map(c => c.id === connectionId ? { ...c, ...updates } : c)
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (assistantType === 'vendas') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Disponível apenas no minhAi Smart
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Respostas automáticas a comentários não estão disponíveis na versão Vendas.
          Faça upgrade para o <strong className="text-gray-700 dark:text-gray-300">minhAi Smart</strong> com um plano mensal para acessar essa funcionalidade.
        </p>
        <a
          href="/dashboard/credits"
          className="inline-block mt-5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Ver planos
        </a>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800/40 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={loadConnections}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Nenhuma conexão encontrada
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Conecte uma conta Meta na aba Conexões para configurar as respostas a comentários.
        </p>
      </div>
    );
  }

  const activeCount = connections.filter(c => c.comments_enabled).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-pink-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Comentários Automáticos</h2>
          </div>
          {activeCount > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure respostas automáticas para comentários no Facebook e Instagram.
          Pode responder publicamente no post e/ou enviar uma DM automática.
        </p>

        {/* Info sobre custo */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-yellow-500 font-bold">©</span>
          <span>Cada comentário respondido consome <strong className="text-gray-700 dark:text-gray-300">1 crédito</strong></span>
        </div>
      </div>

      {/* Uma seção por conexão */}
      {connections.map(conn => (
        <ConnectionCommentsConfig
          key={conn.id}
          connection={conn}
          onSave={(updates) => handleSave(conn.id, updates)}
        />
      ))}

    </div>
  );
}
