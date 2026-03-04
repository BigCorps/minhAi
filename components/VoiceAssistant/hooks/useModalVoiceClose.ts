import { useEffect } from 'react';

export function useModalVoiceClose(onClose: () => void) {
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();

    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    const CLOSE_TRIGGERS = ['fechar', 'fecha', 'cancelar', 'cancela', 'sair', 'voltar', 'obrigado', 'tchau'];

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
        .toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');

      if (CLOSE_TRIGGERS.some(t => transcript.includes(t))) {
        onClose();
      } else {
        try { recognition.stop(); } catch (e) {}
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        try { recognition.stop(); } catch (e) {}
        setTimeout(() => { try { recognition.start(); } catch (e) {} }, 300);
      }
    };

    recognition.start();
    return () => { try { recognition.stop(); } catch (e) {} };
  }, [onClose]);
}
