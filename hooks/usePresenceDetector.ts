'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Tipos mínimos do MediaPipe (evita instalar @types separado) ────────────
interface FaceDetectorResult {
  detections: Array<{ boundingBox: object }>;
}
interface FaceDetector {
  detect(image: HTMLVideoElement | HTMLCanvasElement): Promise<FaceDetectorResult>;
  close(): void;
}
interface MediaPipeVision {
  FaceDetector: {
    createFromOptions(
      vision: object,
      options: { baseOptions: { modelAssetPath: string; delegate: string }; minDetectionConfidence: number; minSuppressionThreshold: number }
    ): Promise<FaceDetector>;
  };
  FilesetResolver: {
    forVisionTasks(wasmPath: string): Promise<object>;
  };
}

// ─── Constantes ─────────────────────────────────────────────────────────────

/** CDN do MediaPipe Tasks Vision (WASM + modelo) */
const MEDIAPIPE_WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MEDIAPIPE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

/** Intervalo entre análises de frame (ms) */
const DETECTION_INTERVAL_MS = 1200;

/** Cooldown entre saudações (ms) — evita saudar a mesma pessoa repetidamente */
const GREETING_COOLDOWN_MS = 30_000;

/** Frames consecutivos com rosto para confirmar presença (evita falsos positivos) */
const PRESENCE_CONFIRMATION_FRAMES = 2;

// ─── Interface pública ───────────────────────────────────────────────────────

export interface UsePresenceDetectorOptions {
  /** Habilitar o detector. Se false, não inicia câmera nem carrega modelo. */
  enabled: boolean;
  /** Chamado quando presença é confirmada e cooldown expirou. */
  onPresenceDetected: () => void;
}

export interface UsePresenceDetectorReturn {
  /** true enquanto a câmera e modelo estão sendo inicializados */
  isInitializing: boolean;
  /** true se o detector está rodando ativamente */
  isRunning: boolean;
  /** Mensagem de erro caso câmera ou modelo falhem */
  error: string | null;
  /** Para o detector e libera a câmera manualmente */
  stop: () => void;
  /** Reinicia o detector (útil após uma interação terminar) */
  restart: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePresenceDetector({
  enabled,
  onPresenceDetected,
}: UsePresenceDetectorOptions): UsePresenceDetectorReturn {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs — não causam re-render e são seguros em closures de intervalos
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGreetingRef = useRef<number>(0);
  const consecutiveFramesRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(false);

  // ── Parar tudo ─────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    isStoppedRef.current = true;
    setIsRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    // Não fechamos o detector para evitar reload do modelo ao reiniciar
    consecutiveFramesRef.current = 0;
  }, []);

  // ── Loop de detecção ───────────────────────────────────────────────────────
  const startDetectionLoop = useCallback(
    (detector: FaceDetector, video: HTMLVideoElement) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(async () => {
        if (isStoppedRef.current) return;
        if (video.readyState < 2) return; // vídeo ainda não tem frames

        try {
          const result = await detector.detect(video);
          const faceDetected = result.detections.length > 0;

          if (faceDetected) {
            consecutiveFramesRef.current += 1;

            if (consecutiveFramesRef.current >= PRESENCE_CONFIRMATION_FRAMES) {
              const now = Date.now();
              const cooldownExpired = now - lastGreetingRef.current > GREETING_COOLDOWN_MS;

              if (cooldownExpired) {
                lastGreetingRef.current = now;
                consecutiveFramesRef.current = 0;
                onPresenceDetected();
              }
            }
          } else {
            // Reseta contador de frames ao perder o rosto
            consecutiveFramesRef.current = 0;
          }
        } catch {
          // Silencia erros de frame individual — pode ocorrer se o vídeo pausar
        }
      }, DETECTION_INTERVAL_MS);

      setIsRunning(true);
    },
    [onPresenceDetected]
  );

  // ── Inicializar câmera + modelo ────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    isStoppedRef.current = false;
    setIsInitializing(true);
    setError(null);

    try {
      // 1. Câmera frontal (user) — ideal para totem/kiosk
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;

      // 2. Elemento de vídeo oculto (nunca adicionado ao DOM)
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      // 3. Carregar MediaPipe dinamicamente (evita bundle estático)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { FilesetResolver, FaceDetector: MPFaceDetector } = await (
        async () => {
          // Importação dinâmica para não quebrar SSR
          const mp = await import(
            /* webpackIgnore: true */
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs'
          ) as unknown as MediaPipeVision;
          return mp;
        }
      )();

      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      const detector = await MPFaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MEDIAPIPE_MODEL,
          delegate: 'GPU',
        },
        minDetectionConfidence: 0.6,
        minSuppressionThreshold: 0.3,
      });

      // Se stop() foi chamado enquanto inicializava, aborta
      if (isStoppedRef.current) {
        detector.close();
        return;
      }

      detectorRef.current = detector;
      setIsInitializing(false);
      startDetectionLoop(detector, video);
    } catch (err: unknown) {
      setIsInitializing(false);
      setIsRunning(false);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Habilite nas configurações do browser.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada neste dispositivo.');
        } else {
          setError('Erro ao inicializar detector de presença: ' + err.message);
        }
      }
    }
  }, [enabled, startDetectionLoop]);

  // ── restart público ────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    stop();
    // Pequeno delay para garantir que os tracks foram liberados
    setTimeout(() => {
      isStoppedRef.current = false;
      initialize();
    }, 500);
  }, [stop, initialize]);

  // ── Efeito principal: liga/desliga com `enabled` ───────────────────────────
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    initialize();
    return () => {
      stop();
    };
    // initialize e stop são estáveis (useCallback com deps fixas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { isInitializing, isRunning, error, stop, restart };
}
