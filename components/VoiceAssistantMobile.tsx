"use client";

import { useVoskMic } from "@/hooks/useVoskMic";

export function VoiceAssistantMobile({ onWakeWord }: { onWakeWord: (t: string) => void }) {
  const { ready, start } = useVoskMic(text => {
    console.log("🎤", text);
    if (text.toLowerCase().includes("e aí")) {
      onWakeWord(text);
    }
  });

  if (!ready) return <p>Carregando voz...</p>;

  return <button onClick={start}>Ativar voz</button>;
}