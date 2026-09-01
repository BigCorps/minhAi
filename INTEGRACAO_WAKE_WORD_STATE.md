# Guia de Integração: Wake Word State com Transição Visual

## Visão Geral

Este guia explica como integrar o novo sistema de **Wake Word State** ao `VoiceAssistantWithWakeWord.tsx` para obter a experiência "Alexa-like" com transição visual instantânea.

## Arquivos Criados

1. **`hooks/useWakeWordState.ts`** — Hook para gerenciar o estado da wake word
2. **`MicrophoneFeedback.tsx`** — Componente de feedback visual do microfone (roxo quando ativo)
3. **`lib/google-speech-websocket-enhanced.ts`** — Versão aprimorada do GoogleSpeechWebSocket com buffer de wake word

## Passo 1: Importar o Hook e Componente

No `VoiceAssistantWithWakeWord.tsx`, adicione os imports:

```typescript
import { useWakeWordState } from './hooks/useWakeWordState';
import { MicrophoneFeedback } from './MicrophoneFeedback';
```

## Passo 2: Inicializar o Hook

Dentro do componente, após os outros hooks, adicione:

```typescript
const { wakeWordState, onWakeWordDetected, resetWakeWordState, isWakeWordActive } = useWakeWordState();
```

## Passo 3: Disparar a Detecção no Handler de Transcrição

No `handleGoogleTranscript`, após a detecção bem-sucedida da wake word, adicione:

```typescript
// ✅ 3. SÓ AGORA verifica wake word
const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);

if (!wakeWordResult?.detected) {
  // ... código existente
  return;
}

const WAKE_WORD_MIN_CONFIDENCE = 0.75;
if (wakeWordResult.confidence < WAKE_WORD_MIN_CONFIDENCE) {
  console.log(`⚠️ Wake word rejeitada — confiança: ${(wakeWordResult.confidence * 100).toFixed(0)}%`);
  return;
}

// ✅ NOVO: Disparar o estado visual da wake word
onWakeWordDetected(wakeWordResult.keyword, wakeWordResult.confidence);

// ✅ NOVO: Se usar GoogleSpeechWebSocketEnhanced, ativar o buffer
if (googleSpeechRef.current && 'activateWakeWordBuffer' in googleSpeechRef.current) {
  (googleSpeechRef.current as any).activateWakeWordBuffer();
}

console.log(`✅ Wake word aceita: "${wakeWordResult.keyword}" (${(wakeWordResult.confidence * 100).toFixed(0)}%)`);

// ... resto do código existente
```

## Passo 4: Resetar o Estado ao Finalizar o Comando

No `stopEverything()`, adicione:

```typescript
function stopEverything() {
  console.log('🛑 Parando tudo');

  stopAudioImmediately();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  setIsProcessing(false);
  setIsSpeaking(false);
  setQrCodeData(null);
  setPixConfirmationData(null);
  setActiveModal(null);
  setShowConversationModal(false);

  // ✅ NOVO: Resetar o estado da wake word
  resetWakeWordState();

  processingQuestion.current = false;
  shouldProcessAudio.current = true;
  activeFunctionContextRef.current = null;

  console.log('✅ Parado');

  setTimeout(async () => {
    if (isActiveRef.current) await startGoogleSpeech();
  }, 500);
}
```

## Passo 5: Renderizar o Componente de Feedback

No JSX do componente, adicione o `MicrophoneFeedback` (geralmente perto do Avatar):

```typescript
return (
  <div className="flex flex-col items-center gap-4">
    {/* Avatar existente */}
    <AvatarFace
      isListening={isListening}
      isSpeaking={isSpeaking}
      isProcessing={isProcessing}
      theme={theme}
      // ... outras props
    />

    {/* ✅ NOVO: Feedback do Microfone */}
    <MicrophoneFeedback
      isListening={isListening}
      isProcessing={isProcessing}
      isWakeWordDetected={wakeWordState.isWakeWordDetected}
      volume={/* passar volume do VAD se disponível */}
      theme={theme}
    />

    {/* Resto do layout */}
  </div>
);
```

## Passo 6 (Opcional): Usar GoogleSpeechWebSocketEnhanced

Para aproveitar o buffer de wake word e garantir zero-loss de áudio:

1. Substitua o import:
```typescript
// De:
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';

// Para:
import { GoogleSpeechWebSocketEnhanced } from '@/lib/google-speech-websocket-enhanced';
```

2. Crie a instância com os novos callbacks:
```typescript
googleSpeechRef.current = new GoogleSpeechWebSocketEnhanced({
  onTranscript: (text, isFinal) => {
    if (text && text.trim().length > 0) {
      // ... código existente
    }
    handleGoogleTranscript(text, isFinal);
  },
  onError: (err) => {
    console.error('❌ Erro Google Speech:', err);
    setIsListening(false);
  },
  onStatusChange: (status) => {
    console.log('📊 Status:', status);
    setIsListening(status === 'recording' || status === 'wake_word_detected');
  },
  onVolumeChange: handleVolumeChange,
  onWakeWordBufferReady: (bufferSize) => {
    console.log(`✅ Wake Word Buffer pronto: ${bufferSize} chunks`);
  },
  onAudioChunkCaptured: (chunkSize) => {
    console.log(`📦 Chunk capturado: ${chunkSize} bytes`);
  },
  ...vadConfig,
});
```

## Fluxo Completo

1. **Usuário fala a wake word** → Google Speech detecta
2. **WakeWordDetector valida** → Confiança > 75%
3. **`onWakeWordDetected` dispara** → Estado muda
4. **Avatar muda para Orbe roxo** → Feedback visual instantâneo
5. **Microfone fica roxo** → Confirmação visual
6. **Buffer de áudio captura** → Zero-loss de fala
7. **Comando é processado** → Resto do fluxo existente
8. **`resetWakeWordState` limpa** → Volta ao estado normal

## Notas Importantes

- ✅ **Compatibilidade**: Todos os arquivos novos são aditivos. Não quebram o código existente.
- ✅ **Transição Suave**: O Avatar já possui cores configuráveis. Apenas adicione um novo estado "wake_word_detected".
- ✅ **Zero-Loss de Áudio**: O buffer de wake word captura áudio desde a detecção, sem delay.
- ✅ **Eventos Customizados**: Use `wakeWordDetected` e `wakeWordReset` para integrar com outros componentes se necessário.

## Próximos Passos

1. Integrar o `MicrophoneFeedback` no layout
2. Testar a transição visual com diferentes wake words
3. Ajustar as cores (roxo) conforme a marca da empresa
4. Adicionar animação de "pulse" mais agressiva quando roxo
5. Coletar feedback dos usuários
