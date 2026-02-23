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
  'payment': 'Pagamento',
  'schedule': 'Agendamento',
  'information': 'Informação',
  'ai_assistant': 'Conhecimento',
  'video': 'Vídeos',
  'biometry': 'Biometria',
  'products': 'Vendas',
  'images': 'Imagens',
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
  'video_instrucoes'
];

const SYSTEM_FUNCTIONS = ['meu_sistema'];

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

  // ── MODO LISTA: tudo numa única linha compacta ────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={`relative border rounded-xl px-4 py-2.5 transition-all duration-300 flex items-center gap-3 ${
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

        {/* Categoria — pequena, fixa */}
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 truncate">
          {categoryName}
        </span>

        {/* Título */}
        <span className="font-bold text-sm text-gray-900 dark:text-white truncate flex-shrink-0 w-36 sm:w-44">
          {fn.function_name}
        </span>

        {/* Descrição — cresce para preencher espaço disponível */}
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 hidden sm:block">
          {fn.short_description}
        </span>

        {/* Créditos */}
        {fn.consumes_credits && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium">{fn.credits_per_use}cr</span>
          </div>
        )}

        {/* Ações: badge sistema / toggle / config */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {isSystemFunction ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
              Padrão
            </span>
          ) : (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isUpdating}
              aria-label={isEnabled ? 'Desativar função' : 'Ativar função'}
            />
          )}

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
        </div>

        {isUpdating && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>
    );
  }

  // ── MODO GRID: layout original ────────────────────────────────────────────
  return (
    <div
      className={`relative border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between h-full ${
        isEnabled
          ? 'bg-white dark:bg-slate-900 shadow-sm border-gray-200 dark:border-white/10'
          : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-white/10'
      }`}
    >
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: fn.color || '#6B7280' }}
            />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {categoryName}
            </span>
          </div>
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
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="font-medium">
                {fn.credits_per_use} crédito{fn.credits_per_use !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isSystemFunction && (
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={isUpdating}
              aria-label={isEnabled ? 'Desativar função' : 'Ativar função'}
            />
          )}

          {isSystemFunction && (
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
              Padrão
            </span>
          )}

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
