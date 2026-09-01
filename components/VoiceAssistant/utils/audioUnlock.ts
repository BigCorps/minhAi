// components/VoiceAssistant/utils/audioUnlock.ts

export function unlockAudio(audioUnlockedRef: React.MutableRefObject<boolean>): void {
  if (audioUnlockedRef.current) return;
  
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
          audioUnlockedRef.current = true;
          console.log('✅ Audio unlocked!');
        })
        .catch((e) => {
          console.log('⚠️ Audio unlock failed:', e.message);
          
          setTimeout(() => {
            if (!audioUnlockedRef.current) {
              console.log('🔄 Retry unlock...');
              unlockAudio(audioUnlockedRef);
            }
          }, 1000);
        });
    }
  } catch (e: any) {
    console.log('⚠️ Audio unlock error:', e.message);
  }
}

export async function establishMobileAudioContext(): Promise<void> {
  try {
    const testAudio = new Audio(
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    );
    testAudio.volume = 0.01;
    await testAudio.play();
    testAudio.pause();
    console.log('✅ Mobile: Contexto de áudio estabelecido');
  } catch (e) {
    console.log('⚠️ Mobile: Falha no contexto de áudio');
  }
}
