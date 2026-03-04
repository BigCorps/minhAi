// components/VoiceAssistant/hooks/useModalVoiceCommand.ts
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

interface UseModalVoiceCommandOptions {
  onTranscript: (text: string) => void;
  active?: boolean; // para ligar/desligar sem desmontar
}

export function useModalVoiceCommand({ onTranscript, active = true }: UseModalVoiceCommandOptions) {
  const isMobile = useIsMobile();
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    if (isMobile) {
      startEdge();
    } else {
      startWebkit();
    }

    return () => stop();
  }, [active, isMobile]);

  // ── MOBILE: Edge Function WebSocket ──────────────────────
  async function startEdge() {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const wsUrl = `${SUPABASE_URL.replace('https://', 'wss://')}/functions/v1/google-speech-stream`;

      const ws = new WebSocket(`${wsUrl}?apikey=${SUPABASE_ANON_KEY}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'config',
          config: { language: 'pt-BR', sampleRate: 16000 }
        }));

        // Capturar áudio e enviar para Edge
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
          }
          ws.send(pcm.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
        console.log('👂 [Modal/Edge] Ouvindo...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript' && data.text?.trim()) {
            console.log('🎤 [Modal/Edge] Ouviu:', data.text);
            onTranscript(data.text.toLowerCase().trim()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[.,!?;:]+/g, ''));
          }
        } catch (e) {}
      };

      ws.onerror = () => { isRunningRef.current = false; };
      ws.onclose = () => { isRunningRef.current = false; };

    } catch (err) {
      console.error('❌ [Modal/Edge] Erro:', err);
      isRunningRef.current = false;
    }
  }

  // ── DESKTOP: webkitSpeechRecognition ─────────────────────
  function startWebkit() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
        .toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]+/g, '');
      console.log('🎤 [Modal/Webkit] Ouviu:', text);
      onTranscript(text);
      restart();
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') restart();
    };

    recognition.onend = () => {
      if (isRunningRef.current) restart();
    };

    recognition.start();
    console.log('👂 [Modal/Webkit] Ouvindo...');
  }

  function restart() {
    if (!isRunningRef.current) return;
    try { recognitionRef.current?.stop(); } catch (e) {}
    setTimeout(() => {
      if (!isRunningRef.current) return;
      try { recognitionRef.current?.start(); } catch (e) {}
    }, 300);
  }

  function stop() {
    isRunningRef.current = false;

    // Parar webkit
    try { recognitionRef.current?.stop(); } catch (e) {}
    recognitionRef.current = null;

    // Parar Edge WebSocket
    try { wsRef.current?.close(); } catch (e) {}
    wsRef.current = null;

    // Parar áudio
    try { processorRef.current?.disconnect(); } catch (e) {}
    try { audioCtxRef.current?.close(); } catch (e) {}
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current = null;
    audioCtxRef.current = null;
    mediaStreamRef.current = null;

    console.log('🔇 [Modal] Recognition parado');
  }
}