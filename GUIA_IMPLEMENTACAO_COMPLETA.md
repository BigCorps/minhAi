# Guia de Implementação Completa: Sistema Alexa-like com Wake Word Visual

## 📋 Resumo Executivo

Este guia fornece instruções passo a passo para integrar o novo sistema de **Wake Word State com Transição Visual** ao seu assistente eAi. O resultado final será uma experiência similar à Alexa:

- ✅ Avatar muda para roxo/violeta quando a wake word é detectada
- ✅ Microfone fica roxo indicando "pronto para ouvir"
- ✅ Captura de áudio sem perdas desde o início da fala
- ✅ Feedback visual do que foi reconhecido
- ✅ Compatibilidade total com o código existente

---

## 🎯 Arquivos Criados

| Arquivo | Propósito |
|---------|-----------|
| `hooks/useWakeWordState.ts` | Hook para gerenciar estado da wake word |
| `MicrophoneFeedback.tsx` | Componente de feedback visual do microfone (roxo) |
| `TranscriptFeedbackCard.tsx` | Card mostrando o último reconhecimento |
| `AvatarFace-Enhanced.tsx` | Avatar com suporte a estado roxo de wake word |
| `lib/google-speech-websocket-enhanced.ts` | GoogleSpeechWebSocket com buffer de wake word |

---

## 🔧 Passo 1: Atualizar VoiceAssistantWithWakeWord.tsx

### 1.1 Adicionar Imports

No topo do arquivo, adicione:

```typescript
import { useWakeWordState } from './hooks/useWakeWordState';
import { MicrophoneFeedback } from './MicrophoneFeedback';
import { TranscriptFeedbackCard } from './TranscriptFeedbackCard';
```

### 1.2 Inicializar o Hook

Dentro do componente, após os outros hooks, adicione:

```typescript
// ✅ NOVO: Hook para gerenciar estado visual da wake word
const { wakeWordState, onWakeWordDetected, resetWakeWordState, isWakeWordActive } = useWakeWordState();
```

### 1.3 Atualizar handleGoogleTranscript

Localize a função `handleGoogleTranscript` e faça as seguintes alterações:

**Antes (linha ~374):**
```typescript
const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);

if (!wakeWordResult?.detected) {
  // ... resto do código
  return;
}

const WAKE_WORD_MIN_CONFIDENCE = 0.75;
if (wakeWordResult.confidence < WAKE_WORD_MIN_CONFIDENCE) {
  console.log(`⚠️ Wake word rejeitada — confiança: ${(wakeWordResult.confidence * 100).toFixed(0)}%`);
  return;
}

console.log(`✅ Wake word aceita: "${wakeWordResult.keyword}" (${(wakeWordResult.confidence * 100).toFixed(0)}%)`);
```

**Depois:**
```typescript
const wakeWordResult = wakeWordDetectorRef.current?.detect(lowerText);

if (!wakeWordResult?.detected) {
  // ... resto do código
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
```

### 1.4 Atualizar stopEverything()

Localize a função `stopEverything()` e adicione ao final:

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

### 1.5 Atualizar a Renderização do JSX

Localize onde o `AvatarFace` é renderizado e faça as alterações:

**Antes:**
```typescript
<AvatarFace
  isListening={isListening}
  isSpeaking={isSpeaking}
  isProcessing={isProcessing}
  theme={theme}
  // ... outras props
/>
```

**Depois:**
```typescript
<AvatarFaceEnhanced
  isListening={isListening}
  isSpeaking={isSpeaking}
  isProcessing={isProcessing}
  isWakeWordDetected={wakeWordState.isWakeWordDetected}
  theme={theme}
  // ... outras props
/>
```

### 1.6 Adicionar Componentes de Feedback

Adicione os novos componentes no JSX (geralmente antes do `TextInputChat`):

```typescript
{/* Feedback do Microfone */}
<MicrophoneFeedback
  isListening={isListening}
  isProcessing={isProcessing}
  isWakeWordDetected={wakeWordState.isWakeWordDetected}
  theme={theme}
/>

{/* Card de Transcrição */}
<TranscriptFeedbackCard
  lastTranscript={lastTranscript}
  lastResponse={lastResponse}
  isListening={isListening}
  isProcessing={isProcessing}
  theme={theme}
  showCard={true}
/>

{/* Input de Texto */}
<TextInputChat
  onSendMessage={handleTextMessage}
  isProcessing={isProcessing}
  theme={theme}
  disabled={activeModal !== null}
/>
```

---

## 🔌 Passo 2: Integrar GoogleSpeechWebSocketEnhanced (Opcional mas Recomendado)

Se você deseja aproveitar o buffer de wake word para zero-loss de áudio:

### 2.1 Atualizar o Import

**Antes:**
```typescript
import { GoogleSpeechWebSocket } from '@/lib/google-speech-websocket';
```

**Depois:**
```typescript
import { GoogleSpeechWebSocketEnhanced } from '@/lib/google-speech-websocket-enhanced';
```

### 2.2 Atualizar startGoogleSpeech()

Localize a função `startGoogleSpeech()` e substitua a criação da instância:

**Antes:**
```typescript
googleSpeechRef.current = new GoogleSpeechWebSocket({
  onTranscript: (text, isFinal) => {
    if (text && text.trim().length > 0) {
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      if (!isFinal) {
        setIsListening(true);
      } else {
        listeningTimeoutRef.current = setTimeout(() => {
          if (!isProcessing && !isPlayingAudio) setIsListening(false);
        }, 1000);
      }
    }
    handleGoogleTranscript(text, isFinal);
  },
  onError: (err) => {
    console.error('❌ Erro Google Speech:', err);
    setIsListening(false);
  },
  onStatusChange: (status) => {
    setIsListening(status === 'recording');
  },
  onVolumeChange: handleVolumeChange,
  ...vadConfig,
});
```

**Depois:**
```typescript
googleSpeechRef.current = new GoogleSpeechWebSocketEnhanced({
  onTranscript: (text, isFinal) => {
    if (text && text.trim().length > 0) {
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      if (!isFinal) {
        setIsListening(true);
      } else {
        listeningTimeoutRef.current = setTimeout(() => {
          if (!isProcessing && !isPlayingAudio) setIsListening(false);
        }, 1000);
      }
    }
    handleGoogleTranscript(text, isFinal);
  },
  onError: (err) => {
    console.error('❌ Erro Google Speech:', err);
    setIsListening(false);
  },
  onStatusChange: (status) => {
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

---

## 🎨 Passo 3: Personalizar Cores (Opcional)

Se quiser mudar a cor roxo para outra cor:

### 3.1 No AvatarFace-Enhanced.tsx

Localize a definição de `wakeWordColors`:

```typescript
const wakeWordColors = useMemo(() => ({
  primary: '#a855f7',      // Mude para a cor desejada (hex)
  secondary: '#d8b4fe',    // Cor secundária
  glow: isDark ? 'rgba(168, 85, 247, 0.6)' : 'rgba(147, 51, 234, 0.6)',
  ring: isDark ? '#a855f7' : '#9333ea',
  halo: isDark ? '#a855f7' : '#9333ea'
}), [isDark]);
```

### 3.2 No MicrophoneFeedback.tsx

Localize a seção de cores:

```typescript
if (isWakeWordDetected) {
  bgColor = 'bg-purple-600';  // Mude para a cor desejada
  iconColor = 'text-white';
  glowColor = 'rgba(147, 51, 234, 0.5)';
  pulseAnimation = 'animate-pulse';
}
```

---

## ✅ Checklist de Implementação

- [ ] Adicionar imports em `VoiceAssistantWithWakeWord.tsx`
- [ ] Inicializar `useWakeWordState` hook
- [ ] Atualizar `handleGoogleTranscript` com `onWakeWordDetected`
- [ ] Atualizar `stopEverything()` com `resetWakeWordState`
- [ ] Substituir `AvatarFace` por `AvatarFaceEnhanced`
- [ ] Adicionar `MicrophoneFeedback` no JSX
- [ ] Adicionar `TranscriptFeedbackCard` no JSX
- [ ] (Opcional) Integrar `GoogleSpeechWebSocketEnhanced`
- [ ] Testar a transição visual
- [ ] Testar o feedback do microfone
- [ ] Testar o card de transcrição

---

## 🧪 Testes Recomendados

### Teste 1: Transição Visual
1. Abra o assistente
2. Fale a wake word (ex: "Olá Assistente")
3. Observe se o Avatar muda para roxo
4. Observe se o Microfone fica roxo

### Teste 2: Captura de Áudio
1. Ative a wake word
2. Imediatamente após, fale um comando
3. Verifique se o comando foi capturado completamente
4. Verifique no console se há logs de "Wake Word Buffer"

### Teste 3: Feedback de Transcrição
1. Fale algo que não seja um comando válido
2. Observe o Card de Transcrição mostrando o que foi entendido
3. Verifique se a mensagem de erro aparece

### Teste 4: Reset de Estado
1. Ative a wake word
2. Fale um comando
3. Observe se o Avatar volta ao estado normal após a conclusão

---

## 🐛 Troubleshooting

### Problema: Avatar não muda para roxo
**Solução:** Verifique se `onWakeWordDetected` está sendo chamado. Adicione um `console.log` na função para confirmar.

### Problema: Microfone não muda de cor
**Solução:** Certifique-se de que o `MicrophoneFeedback` está recebendo `isWakeWordDetected={wakeWordState.isWakeWordDetected}`.

### Problema: Card de transcrição não aparece
**Solução:** Verifique se `lastTranscript` e `lastResponse` estão sendo atualizados. Adicione logs no `handleGoogleTranscript`.

### Problema: Audio é cortado no início
**Solução:** Se não estiver usando `GoogleSpeechWebSocketEnhanced`, o buffer padrão pode não ser suficiente. Considere integrar a versão enhanced.

---

## 📚 Referências

- `INTEGRACAO_WAKE_WORD_STATE.md` — Guia detalhado do hook
- `components/VoiceAssistant/hooks/useWakeWordState.ts` — Implementação do hook
- `components/VoiceAssistant/MicrophoneFeedback.tsx` — Componente de feedback
- `lib/google-speech-websocket-enhanced.ts` — Buffer de wake word

---

## 🚀 Próximos Passos

1. Implementar as mudanças acima
2. Testar em diferentes navegadores (Chrome, Safari, Firefox)
3. Testar em mobile e desktop
4. Ajustar cores conforme a marca
5. Coletar feedback dos usuários
