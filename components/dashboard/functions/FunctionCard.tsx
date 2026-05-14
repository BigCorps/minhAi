// components/dashboard/functions/FunctionCard.tsx
'use client';

import { Settings, CreditCard } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FunctionCardProps {
  function: {
    id: string;
    function_key: string;
    function_name: string;
    function_category: string;
    description: string;
    short_description: string;
    icon: string;
    color: string;
    requires_payment: boolean;
    is_premium: boolean;
    save_to_history: boolean;
    consumes_credits: boolean;
    credits_per_use: number;
    example_phrases?: string[];
    edit_modal_component?: string;
    default_enabled?: boolean;
    // ── Badges ──────────────────────────────
    enabled_meta?: boolean;
    // enabled_gpt?: boolean; // GPT — ainda não implementado
  };
  isEnabled: boolean;
  stats: {
    usageCount: number;
    creditsConsumed: number;
    lastUsed: string | null;
  };
  onToggle: () => void;
  onEdit?: () => void;
  isUpdating: boolean;
  theme?: 'dark' | 'light';
  viewMode?: 'grid' | 'list';
}

const CATEGORY_NAMES: { [key: string]: string } = {
  'knowledge': 'Consultas',
  'configuration': 'Localização',
  'contact': 'Contato',
  'payment': 'Financeiro',
  'schedule': 'Agendamento',
  'information': 'Informação',
  'ai_assistant': 'Conhecimento',
  'video': 'Multimídia',
  'biometry': 'Identificação',
  'products': 'Comercial',
  'images': 'Arquivos',
  'codes': 'Câmera',
  'utylities': 'Utilitários',
  'services': 'Serviços',
};

const CONFIGURABLE_FUNCTIONS = [
  'qrcode_whatsapp',
  'qrcode_instagram',
  'qrcode_website',
  'qrcode_facebook',
  'qrcode_email',
  'qrcode_linkedin',
  'qrcode_tiktok',
  'qrcode_twitter',
  'qrcode_telefone',
  'pix_generate',
  'chatgpt',
  'orcamento',
  'endereco',
  'faq',
  'nossa_marca',
  'video_instrucoes',
  'agendar_compromisso',
  'ver_agenda',
  'enviar_email',
  'link_pagamento',
  'nfc_credito',
  'nfc_debito',
  'sequencia_videos',
  'wifi_qrcode',
  'cardapio',
  'nosso_qrcode',
  'validar_cupom',
  'imagem_em_texto',
  'tabela_em_texto',
  'ler_qrcode',
  'ler_codigo_barras',
  'contrato_em_texto',
  'fichas_producao_conversacional',
  'cancelar_agendamento',
  'confirmar_presenca',
  'reagendar_compromisso',
  'horarios_disponiveis',
  'meu_cupom',
  'cadastro',
  'clima_tempo',
  'tocar_video',
  'tocar_musica',
  'impressao_local',
  'impressao_remota',
  'impressao_recibo',
  'modo_venda',
  'ver_produtos',
  'fazer_pedido',
  'consultar_estoque',
  'cadastrar_produto',
  'consultar_cep',
  'playlist',
  'porta_retrato',
  'painel_ofertas',
  'emitir_nota',
  'canal_youtube',
  'identificar_fraude',
  'segunda_via_boleto',
  'rastreio_correios',
  'buscar_endereco',
  'tracar_rota',
  'criar_nota',
  'lembrete_remedios',
  'ver_noticias',
  'procurar_produto',
  'chamar_gerente',
  'pre_atendimento',
  'responder_pesquisa',
  'gerar_senha',
  'tef_debito',
  'tef_credito'
];

const SYSTEM_FUNCTIONS = ['meu_sistema'];

// ── Badge helper ───────────────────────────────────────────────────────────────
function FunctionBadges({
  fn,
  compact = false,
}: {
  fn: FunctionCardProps['function'];
  compact?: boolean;
}) {
  const base = compact
    ? 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full'
    : 'text-xs font-medium px-2 py-0.5 rounded-full';

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Todas as funções funcionam na IA */}
      <span className={`${base} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
        IA
      </span>

      {/* Disponível também nos serviços Meta */}
      {fn.enabled_meta && (
        <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}>
          Meta
        </span>
      )}

      {/* Requer plano pago */}
      {fn.is_premium && (
        <span className={`${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>
          Premium
        </span>
      )}

      {/* fn.enabled_gpt && (
        <span className={`${base} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300`}>
          GPT
        </span>
      ) */}
    </div>
  );
}

export default function FunctionCard({
  function: fn,
  isEnabled,
  stats,
  onToggle,
  onEdit,
  isUpdating,
  theme = 'dark',
  viewMode = 'grid',
}: FunctionCardProps) {

  if (!fn) return null;

  const hasEditModal = CONFIGURABLE_FUNCTIONS.includes(fn.function_key);
  const categoryName = CATEGORY_NAMES[fn.function_category] || fn.function_category;
  const isSystemFunction = SYSTEM_FUNCTIONS.includes(fn.function_key);

  // ── MODO LISTA ────────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => {
          if (hasEditModal && onEdit) onEdit();
        }}
        className={`relative border rounded-xl px-4 py-2.5 transition-all duration-300 flex items-center gap-3 ${
          hasEditModal && onEdit ? 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/5' : ''
        } ${
          isEnabled
            ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
        }`}
      >
        {/* Bolinha de categoria */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: fn.color || '#6B7280' }}
        />

        {/* Categoria */}
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 truncate">
          {categoryName}
        </span>

        {/* Título */}
        <span className="font-bold text-sm text-gray-900 dark:text-white truncate flex-shrink-0 w-36 sm:w-44">
          {fn.function_name}
        </span>

        {/* Badges — compact no modo lista */}
        <FunctionBadges fn={fn} compact />

        {/* Descrição */}
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 hidden sm:block">
          {fn.short_description}
        </span>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {hasEditModal && onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              disabled={isUpdating}
              aria-label="Configurar função"
              title="Configurar função"
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {fn.consumes_credits && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium">{fn.credits_per_use}©️</span>
            </div>
          )}

          {isSystemFunction ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
              Padrão
            </span>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggle}
                disabled={isUpdating}
                aria-label={isEnabled ? 'Desativar função' : 'Ativar função'}
              />
            </div>
          )}
        </div>

        {isUpdating && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
    );
  }

  // ── MODO GRID ─────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => {
        if (hasEditModal && onEdit) onEdit();
      }}
      className={`relative border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-full ${
        hasEditModal && onEdit ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
      }`}
    >
      <div className="flex-grow">
        {/* Linha superior: categoria (esquerda) + badges (direita) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: fn.color || '#6B7280' }}
            />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {categoryName}
            </span>
          </div>

          {/* Badges: Premium, Meta, GPT */}
          <FunctionBadges fn={fn} />
        </div>

        <h3 className="font-bold text-md text-gray-900 dark:text-white mb-1.5 truncate">
          {fn.function_name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 h-[40px]">
          {fn.short_description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          {fn.consumes_credits && (
            <>
              <span className="text-base leading-none">©️</span>
              <span className="font-medium">
                {fn.credits_per_use} crédito{fn.credits_per_use !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasEditModal && onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              disabled={isUpdating}
              aria-label="Configurar função"
              title="Configurar função"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}

          {!isSystemFunction && (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggle}
                disabled={isUpdating}
                aria-label={isEnabled ? 'Desativar função' : 'Ativar função'}
              />
            </div>
          )}

          {isSystemFunction && (
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
              Padrão
            </span>
          )}
        </div>
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}
