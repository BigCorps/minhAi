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

export function FeatureHighlightModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  featureCategory,
  theme = 'dark',
}: FeatureHighlightModalProps) {
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
          theme === 'dark' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-600'
        }`}>
          <Lightbulb className="w-8 h-8" />
        </div>

        {featureCategory && (
          <span className={`text-xs font-semibold uppercase tracking-widest mb-1 ${
            theme === 'dark' ? 'text-yellow-400/70' : 'text-yellow-600/70'
          }`}>
            {featureCategory}
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
          (Este aviso sumirá em breve ou você pode fechá-lo acima)
        </p>
      </div>
    </BaseModal>
  );
}
