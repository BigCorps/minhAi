'use client';

import { useEffect, useState } from 'react';

type AudioGraph = {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
};

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

function getOrCreateGraph(audio: HTMLAudioElement): AudioGraph | null {
  if (typeof window === 'undefined') return null;
  const existing = graphs.get(audio);
  if (existing) return existing;

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    const context: AudioContext = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.62;
    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
    const graph = { context, analyser, source };
    graphs.set(audio, graph);
    return graph;
  } catch (error) {
    console.warn('[FuncionarIA] analisador de áudio indisponível:', error);
    return null;
  }
}

/**
 * Converte a amplitude real de um HTMLAudioElement em um nível de 0..1.
 * Foi feito para receber o mesmo `currentAudioRef.current` que a minhAi já
 * usa no TTS, sem substituir o player existente.
 */
export function useFuncionarIAAudioAmplitude(
  audio: HTMLAudioElement | null,
  active: boolean,
): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!audio || !active) {
      setLevel(0);
      return;
    }

    const graph = getOrCreateGraph(audio);
    if (!graph) {
      // Fallback visual: mantém a sensação de fala mesmo em browsers sem
      // MediaElementAudioSource. O caminho principal continua sendo amplitude.
      let timer = window.setInterval(() => setLevel(0.12 + Math.random() * 0.7), 90);
      return () => {
        window.clearInterval(timer);
        setLevel(0);
      };
    }

    const data = new Uint8Array(graph.analyser.fftSize);
    let raf = 0;
    let smoothed = 0;

    const tick = () => {
      graph.analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const normalized = Math.max(0, Math.min(1, (rms - 0.012) * 8.5));
      smoothed = smoothed * 0.58 + normalized * 0.42;
      setLevel(smoothed);
      raf = requestAnimationFrame(tick);
    };

    const resume = () => {
      if (graph.context.state === 'suspended') void graph.context.resume();
    };
    audio.addEventListener('play', resume);
    resume();
    tick();

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener('play', resume);
      setLevel(0);
    };
  }, [audio, active]);

  return level;
}
