// ============================================================
// utils/audioUtils.ts
// Caminho: components/assistant/VoiceAssistant/utils/audioUtils.ts
// ============================================================

/**
 * Tenta desbloquear o contexto de áudio do browser (necessário no iOS/Safari).
 */
export function unlockAudio(audioUnlocked: React.MutableRefObject<boolean>): void {
  if (audioUnlocked.current) return;

  console.log('🔓 Tentando unlock áudio...');

  try {
    const silentAudio = new Audio(
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    );
    silentAudio.volume = 0.01;

    const playPromise = silentAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          silentAudio.pause();
          audioUnlocked.current = true;
          console.log('✅ Audio unlocked!');
        })
        .catch(e => {
          console.log('⚠️ Audio unlock failed:', e.message);
          setTimeout(() => {
            if (!audioUnlocked.current) {
              unlockAudio(audioUnlocked);
            }
          }, 1000);
        });
    }
  } catch (e: any) {
    console.log('⚠️ Audio unlock error:', e.message);
  }
}

/**
 * Solicita permissão de microfone ao usuário.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    console.log('✅ Permissão de microfone concedida');
    return true;
  } catch (err) {
    console.error('❌ Permissão negada:', err);
    return false;
  }
}

/**
 * Toca um bipe de feedback enquanto processa (aguarda API responder).
 */
export async function playProcessingFeedback(): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔔 Tocando bipe de confirmação');

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // Lá (A4)
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      const currentTime = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.3, currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.15);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + 0.15);

      const fakeAudio = new Audio();
      fakeAudio.onended = () => {};

      setTimeout(() => resolve(fakeAudio), 150);
    } catch (err) {
      console.log('⚠️ Bipe falhou:', err);
      reject(err);
    }
  });
}