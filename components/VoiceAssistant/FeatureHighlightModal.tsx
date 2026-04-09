import BaseModal from '@/components/assistant/BaseModal';
import { Lightbulb } from 'lucide-react';

interface FeatureHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  featureCategory?: string;
  theme?: 'dark' | 'light';
}

const CATEGORY_NAMES: { [key: string]: string } = {
  'knowledge':     'Consultas',
  'configuration': 'Localização',
  'contact':       'Contato',
  'payment':       'Financeiro',
  'schedule':      'Agendamento',
  'information':   'Informação',
  'ai_assistant':  'Conhecimento',
  'video':         'Multimídia',
  'biometry':      'Identificação',
  'products':      'Comercial',
  'images':        'Arquivos',
  'codes':         'Câmera',
  'utylities':     'Utilitários',
  'services':      'Serviços',
};

export function FeatureHighlightModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  featureCategory,
  theme = 'dark',
}: FeatureHighlightModalProps) {
  const categoryLabel = featureCategory
    ? (CATEGORY_NAMES[featureCategory] ?? featureCategory)
    : null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dicas de Funções minhAi"
      theme={theme}
      size="small"
      autoCloseSeconds={10}
      showTimer={true}
      closeOnBackdropClick={true}
      closeOnEsc={true}
    >
      <div className="flex flex-col items-center text-center p-2">
        <div className={`p-3 rounded-full mb-4 ${
          theme === 'dark' ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-600'
        }`}>
          <Lightbulb className="w-8 h-8" />
        </div>

        {categoryLabel && (
          <span className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
            theme === 'dark' ? 'text-lime-400/70' : 'text-lime-600/70'
          }`}>
            {categoryLabel}
          </span>
        )}

        <h3 className={`text-xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {featureName}
        </h3>

        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {featureDescription}
        </p>

        <p className={`text-xs mt-4 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          (Este aviso sumirá em breve ou você pode fechá-lo)
        </p>
      </div>
    </BaseModal>
  );
}
