// useModalVoiceClose.ts — versão corrigida
import { useEffect, useRef } from 'react';
import { useModalVoiceCommand } from './useModalVoiceCommand';

export function useModalVoiceClose(onClose: () => void) {
  const CLOSE_TRIGGERS = ['fechar', 'fecha', 'cancelar', 'cancela', 'sair', 'voltar', 'obrigado', 'tchau'];

  useModalVoiceCommand({
    onTranscript: (text) => {
      if (CLOSE_TRIGGERS.some(t => text.includes(t))) {
        onClose();
      }
    }
  });
}