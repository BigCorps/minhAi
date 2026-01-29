import { useEffect, useRef, useState } from "react";
import { loadVosk } from "@/lib/vosk";

export function useVoskMic(onText: (text: string) => void) {
  const [ready, setReady] = useState(false);
  const recognizerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    loadVosk().then(model => {
      recognizerRef.current = new model.KaldiRecognizer();
      setReady(true);
    });
  }, []);
  
  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = e => {
      const text = recognizerRef.current.acceptWaveform(e.inputBuffer);
      if (text) onText(text);
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
  }
  
  return { ready, start };
}