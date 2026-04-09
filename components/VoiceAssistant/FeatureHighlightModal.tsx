import BaseModal from '@/components/assistant/BaseModal';
import { Mic, Type } from 'lucide-react';

interface FeatureHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  theme?: 'dark' | 'light';
}

export function FeatureHighlightModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  theme = 'dark',
}: FeatureHighlightModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dica do minhAi!"
      theme={theme}
      size="small"
      autoCloseSeconds={10} // Mostra por 10 segundos
      showTimer={true}
      closeOnBackdropClick={true}
      closeOnEsc={true}
    >
      <div className="flex flex-col items-center text-center p-2">
        <div className={`p-3 rounded-full mb-4 ${
          theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
        }`}>
          <Type className="w-8 h-8" /> {/* Ícone genérico para função de texto */}
        </div>
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