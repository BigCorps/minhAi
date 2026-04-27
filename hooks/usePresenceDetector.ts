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
 
const MEDIAPIPE_WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MEDIAPIPE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
 
/** Intervalo entre análises de frame (ms) */
const DETECTION_INTERVAL_MS = 1200;
 
/** Cooldown mínimo entre saudações (ms) — mesmo que a pessoa saia e volte rápido */
const GREETING_COOLDOWN_MS = 60_000;
 
/** Frames consecutivos COM rosto para confirmar presença (evita falsos positivos) */
const PRESENCE_CONFIRMATION_FRAMES = 2;
 
/**
 * Frames consecutivos SEM rosto para considerar que a pessoa saiu.
 * 4 frames × 1200ms = ~5s sem rosto → marca como ausente.
 * Só após isso uma nova saudação pode ser disparada.
 */
const ABSENCE_CONFIRMATION_FRAMES = 4;
 
/** Chave no sessionStorage para persistir lastGreeting entre remontagens */
const LAST_GREETING_KEY = 'eai:presenceLastGreeting';
 
// ─── Helpers sessionStorage ──────────────────────────────────────────────────
 
function readLastGreeting(): number {
  try {
    return parseInt(sessionStorage.getItem(LAST_GREETING_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
 
function writeLastGreeting(ts: number) {
  try {
    sessionStorage.setItem(LAST_GREETING_KEY, String(ts));
  } catch { /* silencioso */ }
}
 
// ─── Interface pública ───────────────────────────────────────────────────────
 
export interface UsePresenceDetectorOptions {
  enabled: boolean;
  onPresenceDetected: () => void;
}
 
export interface UsePresenceDetectorReturn {
  isInitializing: boolean;
  isRunning: boolean;
  error: string | null;
  stop: () => void;
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
 
  const streamRef              = useRef<MediaStream | null>(null);
  const videoRef               = useRef<HTMLVideoElement | null>(null);
  const detectorRef            = useRef<FaceDetector | null>(null);
  const intervalRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStoppedRef           = useRef<boolean>(false);
 
  // ── Contadores de frame ────────────────────────────────────────────────────
  /** Frames consecutivos COM rosto — confirma chegada */
  const presenceFramesRef      = useRef<number>(0);
  /** Frames consecutivos SEM rosto — confirma saída */
  const absenceFramesRef       = useRef<number>(0);
 
  // ── Estado de presença ─────────────────────────────────────────────────────
  /**
   * FIX: começa como true (câmera acabou de ligar = ninguém ainda foi visto).
   * Só permite saudar quando wasAbsentRef === true — ou seja, houve uma
   * transição real de "ninguém → alguém", não apenas "alguém ainda está lá".
   */
  const wasAbsentRef           = useRef<boolean>(true);
 
  /**
   * FIX: lê do sessionStorage para sobreviver à remontagem (troca de modo).
   * Sem isso, trocar de padrao→texto reseta lastGreeting para 0 e a pessoa
   * seria saudada novamente ao voltar para o modo anterior.
   */
  const lastGreetingRef        = useRef<number>(readLastGreeting());
 
  // Mantém onPresenceDetected sempre atualizado sem recriar o loop
  const onPresenceDetectedRef  = useRef(onPresenceDetected);
  useEffect(() => { onPresenceDetectedRef.current = onPresenceDetected; }, [onPresenceDetected]);
 
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
    // Não fecha o detector para evitar reload do modelo ao reiniciar
    presenceFramesRef.current = 0;
    absenceFramesRef.current  = 0;
    // wasAbsentRef permanece no valor atual — se a pessoa estava presente
    // antes do stop(), ao reiniciar ainda estará "presente" e não saudará
    // de novo até ela sair e voltar.
  }, []);
 
  // ── Loop de detecção ───────────────────────────────────────────────────────
  const startDetectionLoop = useCallback(
    (detector: FaceDetector, video: HTMLVideoElement) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
 
      intervalRef.current = setInterval(async () => {
        if (isStoppedRef.current) return;
        if (video.readyState < 2) return;
 
        try {
          const result = await detector.detect(video);
          const faceDetected = result.detections.length > 0;
 
          if (faceDetected) {
            // Rosto detectado — reseta contador de ausência
            absenceFramesRef.current = 0;
            presenceFramesRef.current += 1;
 
            // Aguarda N frames consecutivos para confirmar presença real
            if (presenceFramesRef.current >= PRESENCE_CONFIRMATION_FRAMES) {
              // FIX: só saúda se veio de um estado de ausência confirmada
              if (wasAbsentRef.current) {
                const now = Date.now();
                const cooldownExpired = now - lastGreetingRef.current > GREETING_COOLDOWN_MS;
 
                if (cooldownExpired) {
                  // Registra saudação e marca presença ativa
                  lastGreetingRef.current = now;
                  writeLastGreeting(now); // FIX: persiste no sessionStorage
                  wasAbsentRef.current = false;
                  presenceFramesRef.current = 0;
                  onPresenceDetectedRef.current();
                }
              }
              // Se wasAbsent === false: pessoa já foi saudada, ignora frames extras
            }
          } else {
            // Sem rosto — reseta contador de presença
            presenceFramesRef.current = 0;
            absenceFramesRef.current += 1;
 
            // FIX: só marca ausência após N frames consecutivos sem rosto
            // Evita que um frame "em branco" ou cabeça levemente virada
            // resete o estado e cause saudação duplicada
            if (absenceFramesRef.current >= ABSENCE_CONFIRMATION_FRAMES) {
              wasAbsentRef.current = true;
              absenceFramesRef.current = 0; // evita overflow desnecessário
            }
          }
        } catch {
          // Silencia erros de frame individual
        }
      }, DETECTION_INTERVAL_MS);
 
      setIsRunning(true);
    },
    [] // estável — lê tudo via refs
  );
 
  // ── Inicializar câmera + modelo ────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
 
    isStoppedRef.current = false;
    setIsInitializing(true);
    setError(null);
 
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;
 
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { FilesetResolver, FaceDetector: MPFaceDetector } = await (
        async () => {
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
    setTimeout(() => {
      isStoppedRef.current = false;
      initialize();
    }, 500);
  }, [stop, initialize]);
 
  // ── Efeito principal ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    initialize();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
 
  return { isInitializing, isRunning, error, stop, restart };
}
