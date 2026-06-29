'use client';
// ARQUIVO: app/dashboard/atendimentos/_components/ConversationsPanel.tsx
//
// Substitui o QuickActionsPanel. Mostra todas as conversas ativas de todas
// as conexões do assistente, com filtros, realtime e ações inline.
//
// Passo 3: integração do ConversationChatModal (botão "Ver" em cada card)

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2, X, Zap, PauseCircle, PlayCircle, Send,
  MessageSquare, Phone, Instagram, Facebook, RefreshCw,
  CreditCard, MapPin, Building2, AlertCircle, User,
  Pencil, Check, Search, Filter, MessageCircle,
  CheckCircle2, XCircle, Pause, Play, Smartphone,
  Camera, Users, ChevronRight, Circle,
  Tag, StickyNote, Target,
  LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { ConversationChatModal } from './ConversationChatModal';

// ─── Tipos ────────────────────────────────────────────────────────────────

type Connection = {
  id:                          string;
  company_id:                  string;
  page_name:                   string;
  meta_page_id:                string;
  instagram_account_id:        string | null;
  whatsapp_number_id:          string | null;
  whatsapp_number:             string | null;
  encrypted_page_access_token: string;
};

type Conversation = {
  conversation_id: string;
  page_id:         string;
  platform:        string;
  is_paused:       boolean;
  sender_name:     string | null;
  custom_name:     string | null;
  last_message_text: string | null;
  updated_at:      string;
  tags:            string[] | null;
  notes:           string | null;
  pipeline_stage:  string | null;
  estimated_value_cents: number | null;
  // join para sabermos de qual conexão é
  connection?:     Connection;
};

type Filter = 'all' | 'paused' | 'active' | 'whatsapp' | 'instagram' | 'facebook';

type Notification = { id: number; message: string; type: 'success' | 'error' };

const FORCE_FUNCTIONS = [
  { key: 'pix',         label: 'Gerar PIX',   icon: CreditCard, credits: 0,  hasInput: true,  placeholder: 'Valor em reais (ex: 150)' },
  { key: 'nossa_marca', label: 'Nossa Marca',  icon: Building2,  credits: 1,  hasInput: false },
  { key: 'endereco',    label: 'Endereço',     icon: MapPin,     credits: 1,  hasInput: false },
];

const PIPELINE_STAGES = [
  { key: 'novo',           label: 'Novo',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'em_atendimento', label: 'Em atendimento', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { key: 'negociacao',     label: 'Negociação',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { key: 'fechado',        label: 'Fechado',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { key: 'perdido',        label: 'Perdido',        color: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDisplayName(conv: Conversation): string {
  return conv.custom_name || conv.sender_name || conv.conversation_id.substring(0, 12) + '...';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000)      return 'agora';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

// ─── Notificações ─────────────────────────────────────────────────────────

let notifId = 0;
function Notifications({ items, onDismiss }: { items: Notification[]; onDismiss: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {items.map((n) => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white max-w-xs
          ${n.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {n.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 opacity-90" />
            : <XCircle      className="h-4 w-4 shrink-0 opacity-90" />
          }
          <span className="flex-1">{n.message}</span>
          <button onClick={() => onDismiss(n.id)}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
        </div>
      ))}
    </div>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 287.56 191"
      fill="currentColor"
    >
      <path d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"/>
      <path d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"/>
      <path d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ─── Badge de plataforma ──────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    facebook:  { icon: <FacebookIcon  className="h-3 w-3" />, label: 'Facebook',  color: 'text-blue-600 bg-blue-600/10'   },
    instagram: { icon: <InstagramIcon className="h-3 w-3" />, label: 'Instagram', color: 'text-pink-600 bg-pink-600/10'   },
    whatsapp:  { icon: <WhatsAppIcon  className="h-3 w-3" />, label: 'WhatsApp',  color: 'text-green-600 bg-green-600/10' },
  };
  const p = map[platform] ?? { icon: <MessageSquare className="h-3 w-3" />, label: platform, color: 'text-gray-500 bg-gray-100 dark:bg-white/10' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${p.color}`}>
      {p.icon}{p.label}
    </span>
  );
}

// ─── Badge de etapa do funil ──────────────────────────────────────────────

function PipelineBadge({ stage }: { stage: string }) {
  const def = PIPELINE_STAGES.find((s) => s.key === stage) ?? PIPELINE_STAGES[0];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${def.color}`}>
      {def.label}
    </span>
  );
}

// ─── Card de conversa ─────────────────────────────────────────────────────

function ConversationCard({
  conv, onOpenModal, onTogglePause, onQuickMessage, onOpenChat, togglingPause,
}: {
  conv:           Conversation;
  onOpenModal:    (conv: Conversation) => void;
  onTogglePause:  (conv: Conversation) => void;
  onQuickMessage: (conv: Conversation) => void;
  onOpenChat:     (conv: Conversation) => void;
  togglingPause:  string | null;
}) {
  const displayName = getDisplayName(conv);
  const isToggling  = togglingPause === conv.conversation_id + conv.page_id;

  return (
    <div className={`rounded-xl border transition-all group
      ${conv.is_paused
        ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40'
        : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700/50'
      }`}>
      <div className="p-3">
        {/* Linha 1: nome + plataforma + tempo */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${conv.is_paused ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</span>
              {conv.custom_name && (
                <Pencil className="h-3 w-3 text-blue-500 shrink-0" title="Nome personalizado" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PlatformBadge platform={conv.platform} />
            <span className="text-xs text-gray-400">{relativeTime(conv.updated_at)}</span>
          </div>
        </div>

        {/* Linha 1.5: etapa do funil + tags */}
        {((conv.pipeline_stage && conv.pipeline_stage !== 'novo') || (conv.tags && conv.tags.length > 0)) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2 pl-3.5">
            {conv.pipeline_stage && conv.pipeline_stage !== 'novo' && (
              <PipelineBadge stage={conv.pipeline_stage} />
            )}
            {(conv.tags || []).slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
            {(conv.tags || []).length > 3 && (
              <span className="text-[10px] text-gray-400">+{conv.tags!.length - 3}</span>
            )}
          </div>
        )}

        {/* Linha 2: última mensagem */}
        {conv.last_message_text && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2.5 pl-3.5">
            {conv.last_message_text}
          </p>
        )}

{/* Linha 3: ações — 1 linha no desktop, 2 no mobile */}
<div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
  <button
    onClick={() => onTogglePause(conv)}
    disabled={isToggling}
    title={conv.is_paused ? 'Retomar assistente' : 'Pausar assistente'}
    className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      ${conv.is_paused
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
      } disabled:opacity-50`}
  >
    {isToggling
      ? <Loader2 className="h-3 w-3 animate-spin" />
      : conv.is_paused
        ? <><PlayCircle  className="h-3 w-3" />Retomar</>
        : <><PauseCircle className="h-3 w-3" />Pausar</>
    }
  </button>

  <button
    onClick={() => onQuickMessage(conv)}
    title="Enviar mensagem rápida"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400
      hover:bg-blue-200 dark:hover:bg-blue-900/50"
  >
    <Send className="h-3 w-3" />Responder
  </button>

  <button
    onClick={() => onOpenChat(conv)}
    title="Ver histórico da conversa"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400
      hover:bg-lime-200 dark:hover:bg-lime-900/50"
  >
    <MessageSquare className="h-3 w-3" />Ver
  </button>

  <button
    onClick={() => onOpenModal(conv)}
    title="Mais ações"
    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium transition
      bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400
      hover:bg-gray-200 dark:hover:bg-white/20"
  >
    <Zap className="h-3 w-3" />Ações
  </button>
</div>
            </div>
    </div>
  );
}

// ─── Kanban: Card compacto ────────────────────────────────────────────────

function KanbanCard({
  conv, onOpenChat, onOpenModal, onDragStart,
}: {
  conv:        Conversation;
  onOpenChat:  (conv: Conversation) => void;
  onOpenModal: (conv: Conversation) => void;
  onDragStart: (e: React.DragEvent, conv: Conversation) => void;
}) {
  const displayName = getDisplayName(conv);
  const value = conv.estimated_value_cents
    ? (conv.estimated_value_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, conv)}
      onClick={() => onOpenChat(conv)}
      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-white/10
        p-3 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700/50
        transition shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</span>
        </div>
        <PlatformBadge platform={conv.platform} />
      </div>

      {conv.last_message_text && (
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1.5">
          {conv.last_message_text}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {(conv.tags || []).slice(0, 2).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
        {value && (
          <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 shrink-0">{value}</span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onOpenModal(conv); }}
        className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
          bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition"
      >
        <Zap className="h-3 w-3" />Ações
      </button>
    </div>
  );
}

// ─── Kanban: Board completo ───────────────────────────────────────────────

function KanbanBoard({
  conversations, onMoveStage, onOpenChat, onOpenModal,
}: {
  conversations: Conversation[];
  onMoveStage:   (conv: Conversation, newStage: string) => void;
  onOpenChat:    (conv: Conversation) => void;
  onOpenModal:   (conv: Conversation) => void;
}) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const draggedConvRef = useRef<Conversation | null>(null);

  function handleDragStart(e: React.DragEvent, conv: Conversation) {
    draggedConvRef.current = conv;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(stageKey: string) {
    setDragOverStage(null);
    const conv = draggedConvRef.current;
    if (!conv) return;
    if ((conv.pipeline_stage || 'novo') !== stageKey) {
      onMoveStage(conv, stageKey);
    }
    draggedConvRef.current = null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map((stage) => {
        const cards = conversations.filter((c) => (c.pipeline_stage || 'novo') === stage.key);
        const totalValue = cards.reduce((sum, c) => sum + (c.estimated_value_cents || 0), 0);

        return (
          <div
            key={stage.key}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={() => handleDrop(stage.key)}
            className={`shrink-0 w-72 rounded-xl border transition-colors
              ${dragOverStage === stage.key
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]'
              }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-gray-400">{cards.length}</span>
              </div>
              {totalValue > 0 && (
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {(totalValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>

            <div className="p-2 space-y-2 min-h-[80px] max-h-[calc(100vh-320px)] overflow-y-auto">
              {cards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Nenhuma conversa aqui</p>
              ) : (
                cards.map((conv) => (
                  <KanbanCard
                    key={conv.conversation_id + conv.page_id}
                    conv={conv}
                    onOpenChat={onOpenChat}
                    onOpenModal={onOpenModal}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quick Message (inline) ────────────────────────────────────────────────

function QuickMessageBar({
  conv, connection, onDone, onCancel,
}: {
  conv:       Conversation;
  connection: Connection;
  onDone:     (msg: string) => void;
  onCancel:   () => void;
}) {
  const supabase = createClient();
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSend() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-send-message`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            recipient_id:      conv.conversation_id,
            message:           text.trim(),
            page_access_token: connection.encrypted_page_access_token,
            platform:          conv.platform,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao enviar');
      onDone('Mensagem enviada');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-1 mx-1 mb-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        rows={2}
        placeholder={`Responder ${getDisplayName(conv)}... (Enter para enviar)`}
        className="w-full text-sm rounded-lg border p-2 resize-none outline-none
          bg-white dark:bg-slate-800 text-gray-900 dark:text-white
          border-gray-300 dark:border-white/10 placeholder:text-gray-400
          focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
      />
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={handleSend} disabled={loading || !text.trim()} className="flex-1">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="mr-1.5 h-3.5 w-3.5" />Enviar</>}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="px-3">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Modal de ações completo ───────────────────────────────────────────────

function ActionsModal({ conv, connection, onClose, onDone }: {
  conv:       Conversation;
  connection: Connection;
  onClose:    () => void;
  onDone:     (msg: string) => void;
}) {
  const supabase  = createClient();
  const [tab, setTab]               = useState<'function' | 'funnel' | 'notes' | 'name'>('function');
  const [loading, setLoading]       = useState(false);
  const [selectedFn, setSelectedFn] = useState(FORCE_FUNCTIONS[0].key);
  const [fnInput, setFnInput]       = useState('');
  const [customName, setCustomName] = useState(conv.custom_name ?? '');
  const [nameSaved, setNameSaved]   = useState(false);
  const [stage, setStage]           = useState(conv.pipeline_stage || 'novo');
  const [tagsInput, setTagsInput]   = useState((conv.tags || []).join(', '));
  const [valueInput, setValueInput] = useState(
    conv.estimated_value_cents ? (conv.estimated_value_cents / 100).toFixed(2) : ''
  );
  const [notesText, setNotesText]   = useState(conv.notes || '');

  const fnDef       = FORCE_FUNCTIONS.find((f) => f.key === selectedFn)!;
  const displayName = getDisplayName(conv);

  async function handleForceFunction() {
    setLoading(true);
    try {
      const msgMap: Record<string, string> = {
        pix:         `gerar pix de ${fnInput || '0'} reais`,
        nossa_marca: 'sobre a empresa',
        endereco:    'endereço',
      };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/meta-force-function`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            conversation_id:   conv.conversation_id,
            page_id:           conv.page_id,
            platform:          conv.platform,
            message:           msgMap[selectedFn],
            page_access_token: connection.encrypted_page_access_token,
            company_id:        connection.company_id,
          }),
        }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro');
      onDone(`Função "${fnDef.label}" executada`);
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleSaveName() {
    setLoading(true);
    try {
      const { error } = await supabase.from('conversation_ai_control')
        .update({ custom_name: customName.trim() || null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
      onDone('Nome salvo');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleSaveFunnel() {
    setLoading(true);
    try {
      const tagsArray = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const valueCents = valueInput ? Math.round(parseFloat(valueInput.replace(',', '.')) * 100) : null;

      const { error } = await supabase.from('conversation_ai_control')
        .update({
          pipeline_stage: stage,
          tags: tagsArray,
          estimated_value_cents: valueCents,
          updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      onDone('Funil atualizado');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleSaveNotes() {
    setLoading(true);
    try {
      const { error } = await supabase.from('conversation_ai_control')
        .update({ notes: notesText.trim() || null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      onDone('Nota salva');
    } catch (e: any) { onDone('Erro: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Ações</p>
            <div className="flex items-center gap-2 mt-0.5">
              <PlatformBadge platform={conv.platform} />
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User className="h-3 w-3" />{displayName}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10">
          {[
            { key: 'function', label: 'Funções', icon: Zap        },
            { key: 'funnel',   label: 'Funil',    icon: Target     },
            { key: 'notes',    label: 'Notas',    icon: StickyNote },
            { key: 'name',     label: 'Nome',     icon: Pencil     },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2
                ${tab === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* Funções */}
          {tab === 'function' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {FORCE_FUNCTIONS.map((fn) => {
                  const Icon = fn.icon;
                  return (
                    <button
                      key={fn.key}
                      onClick={() => setSelectedFn(fn.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition
                        ${selectedFn === fn.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700/50'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {fn.label}
                      {fn.credits > 0 && (
                        <span className="text-[10px] text-gray-400">{fn.credits} crédito{fn.credits > 1 ? 's' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {fnDef.hasInput && (
                <input
                  type="number"
                  value={fnInput}
                  onChange={(e) => setFnInput(e.target.value)}
                  placeholder={fnDef.placeholder}
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                    border-gray-300 dark:border-white/10 placeholder:text-gray-400
                    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              )}

              <Button
                onClick={handleForceFunction}
                disabled={loading || (fnDef.hasInput && !fnInput)}
                className="w-full"
              >
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Zap className="mr-2 h-4 w-4" />
                }
                Executar para {displayName}
              </Button>
            </div>
          )}

          {/* Funil */}
          {tab === 'funnel' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStage(s.key)}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition
                      ${stage === s.key
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ex: VIP, recorrente, reclamação"
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                    border-gray-300 dark:border-white/10 placeholder:text-gray-400
                    focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Valor estimado (R$)
                </label>
                <input
                  type="text" value={valueInput} onChange={(e) => setValueInput(e.target.value)}
                  placeholder="Ex: 150,00"
                  className="w-full text-sm rounded-lg border p-2.5 outline-none
                    bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                    border-gray-300 dark:border-white/10 placeholder:text-gray-400
                    focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              </div>

              <Button onClick={handleSaveFunnel} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Target className="mr-2 h-4 w-4" />Salvar funil</>}
              </Button>
            </div>
          )}

          {/* Notas */}
          {tab === 'notes' && (
            <div className="space-y-3">
              <textarea
                value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={6}
                placeholder="Anotações internas sobre este contato (não visível para o cliente)..."
                className="w-full text-sm rounded-lg border p-3 resize-none outline-none
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                  border-gray-300 dark:border-white/10 placeholder:text-gray-400
                  focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <Button onClick={handleSaveNotes} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><StickyNote className="mr-2 h-4 w-4" />Salvar nota</>}
              </Button>
            </div>
          )}

          {/* Nome personalizado */}
          {tab === 'name' && (
            <div className="space-y-3">
              {conv.sender_name && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10">
                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nome detectado automaticamente:</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{conv.sender_name}</p>
                  </div>
                </div>
              )}
              <input
                type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: João da Padaria, Maria VIP..."
                maxLength={100}
                className="w-full text-sm rounded-lg border p-2.5 outline-none
                  bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                  border-gray-300 dark:border-white/10 placeholder:text-gray-400
                  focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500"
              />
              <Button onClick={handleSaveName} disabled={loading} className="w-full bg-lime-600 hover:bg-lime-700">
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : nameSaved
                    ? <><Check className="mr-2 h-4 w-4" />Salvo!</>
                    : <><Pencil className="mr-2 h-4 w-4" />Salvar nome</>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export function ConversationsPanel({ selectedCompanyId }: { selectedCompanyId: string }) {
  const supabase = createClient();

  const [connections, setConnections]     = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeModal, setActiveModal]     = useState<Conversation | null>(null);
  const [chatConv, setChatConv]           = useState<Conversation | null>(null);
  const [quickMsgConv, setQuickMsgConv]   = useState<string | null>(null); // conversation_id+page_id
  const [togglingPause, setTogglingPause] = useState<string | null>(null);
  const [filter, setFilter]               = useState<Filter>('all');
  const [search, setSearch]               = useState('');
  const [showSearch, setShowSearch]       = useState(false);
  const [viewMode, setViewMode]           = useState<'list' | 'kanban'>('list');
  const [selectedTag, setSelectedTag]     = useState<string | null>(null);
  const allTags = Array.from(new Set(conversations.flatMap((c) => c.tags || []))).sort();

  function notify(message: string, type: 'success' | 'error' = 'success') {
    const id = ++notifId;
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }

  // ── Carregar conexões ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCompanyId) return;
    async function loadConnections() {
      const { data } = await supabase
        .from('meta_connections')
        .select('id, company_id, page_name, meta_page_id, instagram_account_id, whatsapp_number_id, whatsapp_number, encrypted_page_access_token')
        .eq('company_id', selectedCompanyId)
        .eq('agent_enabled', true);
      setConnections(data || []);
    }
    loadConnections();
  }, [selectedCompanyId]);

  // ── Carregar conversas de TODAS as conexões ────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!connections.length) return;
    setIsLoading(true);
    try {
      // Coletar todos os page_ids de todas as conexões
      const pageIds = connections.flatMap((c) =>
        [c.meta_page_id, c.instagram_account_id, c.whatsapp_number_id].filter(Boolean)
      );
      if (!pageIds.length) { setConversations([]); return; }

      const { data } = await supabase
        .from('conversation_ai_control')
        .select('conversation_id, page_id, platform, is_paused, sender_name, custom_name, last_message_text, updated_at, tags, notes, pipeline_stage, estimated_value_cents')
        .in('page_id', pageIds)
        .order('updated_at', { ascending: false })
        .limit(50);

      // Associar cada conversa à sua conexão
      const withConnection = (data || []).map((conv: any) => {
        const connection = connections.find((c) =>
          c.meta_page_id         === conv.page_id ||
          c.instagram_account_id === conv.page_id ||
          c.whatsapp_number_id   === conv.page_id
        );
        return { ...conv, connection };
      });

      setConversations(withConnection);
    } finally {
      setIsLoading(false);
    }
  }, [connections]);

  // Carregar ao montar e quando connections mudar
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Realtime: atualizar quando chegar nova mensagem ────────────────────
  useEffect(() => {
    if (!connections.length) return;

    const pageIds = connections.flatMap((c) =>
      [c.meta_page_id, c.instagram_account_id, c.whatsapp_number_id].filter(Boolean)
    );

    const channel = supabase
      .channel('conversations_panel_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_ai_control' },
        (payload: any) => {
          const newRecord = payload.new as any;
          if (!newRecord || !pageIds.includes(newRecord.page_id)) return;

          setConversations((prev) => {
            const idx = prev.findIndex(
              (c) => c.conversation_id === newRecord.conversation_id && c.page_id === newRecord.page_id
            );
            const connection = connections.find((c) =>
              c.meta_page_id         === newRecord.page_id ||
              c.instagram_account_id === newRecord.page_id ||
              c.whatsapp_number_id   === newRecord.page_id
            );
            const updated = { ...newRecord, connection };

            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            } else {
              return [updated, ...prev];
            }
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [connections]);

  // ── Toggle pausa inline ────────────────────────────────────────────────
  async function handleTogglePause(conv: Conversation) {
    const key = conv.conversation_id + conv.page_id;
    setTogglingPause(key);
    try {
      const newPaused = !conv.is_paused;
      const { error } = await supabase
        .from('conversation_ai_control')
        .update({ is_paused: newPaused, paused_until: null, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id && c.page_id === conv.page_id
            ? { ...c, is_paused: newPaused }
            : c
        )
      );
      notify(newPaused ? 'Assistente pausado' : 'Assistente retomado');
    } catch (e: any) {
      notify('Erro: ' + e.message, 'error');
    } finally {
      setTogglingPause(null);
    }
  }

  // ── Mover etapa do funil ───────────────────────────────────────────────
  async function handleMoveStage(conv: Conversation, newStage: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === conv.conversation_id && c.page_id === conv.page_id
          ? { ...c, pipeline_stage: newStage }
          : c
      )
    );
    try {
      const { error } = await supabase
        .from('conversation_ai_control')
        .update({ pipeline_stage: newStage, updated_at: new Date().toISOString() })
        .eq('conversation_id', conv.conversation_id)
        .eq('page_id', conv.page_id);
      if (error) throw error;
      const stageLabel = PIPELINE_STAGES.find((s) => s.key === newStage)?.label ?? newStage;
      notify(`Movido para "${stageLabel}"`);
    } catch (e: any) {
      notify('Erro: ' + e.message, 'error');
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conv.conversation_id && c.page_id === conv.page_id
            ? { ...c, pipeline_stage: conv.pipeline_stage }
            : c
        )
      );
    }
  }

  // ── Filtrar conversas ──────────────────────────────────────────────────
  const filtered = conversations.filter((conv) => {
    const matchesFilter =
      filter === 'all'       ? true :
      filter === 'paused'    ? conv.is_paused :
      filter === 'active'    ? !conv.is_paused :
      filter === 'whatsapp'  ? conv.platform === 'whatsapp' :
      filter === 'instagram' ? conv.platform === 'instagram' :
      filter === 'facebook'  ? conv.platform === 'facebook' :
      true;

    const matchesSearch = !search.trim() || [
      getDisplayName(conv),
      conv.last_message_text || '',
      conv.conversation_id,
    ].some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = !selectedTag || (conv.tags || []).includes(selectedTag);
    return matchesFilter && matchesSearch && matchesTag;
  });

  const pausedCount = conversations.filter((c) => c.is_paused).length;

  // ── Conexão de uma conversa ────────────────────────────────────────────
  function getConnection(conv: Conversation): Connection | undefined {
    return conv.connection || connections[0];
  }

  return (
    <>
      <Notifications items={notifications} onDismiss={(id) => setNotifications((p) => p.filter((n) => n.id !== id))} />

      {/* Modal de ações (Funções + Nome) */}
      {activeModal && getConnection(activeModal) && (
        <ActionsModal
          conv={activeModal}
          connection={getConnection(activeModal)!}
          onClose={() => setActiveModal(null)}
          onDone={(msg) => {
            notify(msg, msg.startsWith('Erro') ? 'error' : 'success');
            setActiveModal(null);
            loadConversations();
          }}
        />
      )}

      {/* Modal de chat estilo WhatsApp */}
      {chatConv && getConnection(chatConv) && (
        <ConversationChatModal
          conv={chatConv}
          connection={getConnection(chatConv)!}
          onClose={() => setChatConv(null)}
          onTogglePause={(c) => {
            handleTogglePause(c);
            setChatConv((prev) => prev ? { ...prev, is_paused: !prev.is_paused } : prev);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Conversas</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
                {pausedCount > 0 && (
                  <span className="ml-1.5 text-yellow-600 dark:text-yellow-400 font-medium inline-flex items-center gap-1">
                    <span className="mx-0.5">·</span>
                    <PauseCircle className="h-3 w-3" />
                    {pausedCount} pausada{pausedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
              title={viewMode === 'list' ? 'Ver como funil (Kanban)' : 'Ver como lista'}
              className="p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800
                text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
            >
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg border transition text-sm
                ${showSearch
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800'
                }`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={loadConversations}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800
                text-gray-500 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Busca */}
        {showSearch && (
          <div className="px-4 pt-3 pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou mensagem..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10
                  bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400
                  outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto">
          {([
            { key: 'all',       label: 'Todas',     icon: MessageCircle },
            { key: 'paused',    label: 'Pausadas',   icon: PauseCircle   },
            { key: 'active',    label: 'Ativas',     icon: PlayCircle    },
            { key: 'whatsapp',  label: 'WhatsApp',  icon: WhatsAppIcon  },
{ key: 'instagram', label: 'Instagram', icon: InstagramIcon },
{ key: 'facebook',  label: 'Facebook',  icon: FacebookIcon  },
          ] as { key: Filter; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap
                ${filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
            >
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            <span className="text-xs text-gray-400 self-center shrink-0">Tags:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap
                  ${selectedTag === tag
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
              >
                <Tag className="h-3 w-3" />{tag}
              </button>
            ))}
          </div>
        )}

        {/* Lista / Kanban */}
        <div className="px-4 pb-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              {search || filter !== 'all' ? (
                <>
                  <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa encontrada</p>
                  <button onClick={() => { setFilter('all'); setSearch(''); }}
                    className="text-xs text-blue-500 mt-1 hover:underline">
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conversa ainda</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    As conversas aparecerão aqui após a primeira interação dos clientes.
                  </p>
                </>
              )}
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              conversations={filtered}
              onMoveStage={handleMoveStage}
              onOpenChat={(c) => setChatConv(c)}
              onOpenModal={setActiveModal}
            />
          ) : (
            filtered.map((conv) => {
              const convKey    = conv.conversation_id + conv.page_id;
              const connection = getConnection(conv);
              if (!connection) return null;

              return (
                <div key={convKey}>
                  <ConversationCard
                    conv={conv}
                    onOpenModal={setActiveModal}
                    onTogglePause={handleTogglePause}
                    onQuickMessage={() => setQuickMsgConv(quickMsgConv === convKey ? null : convKey)}
                    onOpenChat={(c) => setChatConv(c)}
                    togglingPause={togglingPause}
                  />
                  {quickMsgConv === convKey && (
                    <QuickMessageBar
                      conv={conv}
                      connection={connection}
                      onDone={(msg) => {
                        notify(msg, msg.startsWith('Erro') ? 'error' : 'success');
                        setQuickMsgConv(null);
                      }}
                      onCancel={() => setQuickMsgConv(null)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
