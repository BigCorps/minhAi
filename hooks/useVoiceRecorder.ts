'use client';

import { useState, useRef, useCallback } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar gravação
  const startRecording = useCallback(async () => {
    try {
      // Solicitar permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Criar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      // Listener para chunks de áudio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Iniciar gravação
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Iniciar timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setState((prev) => ({ ...prev, duration: seconds }));
      }, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      let errorMessage = 'Erro ao acessar microfone. Verifique as permissões.';

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhum microfone encontrado neste dispositivo.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão de microfone negada pelo usuário.';
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, []);

  // Parar gravação
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      // Limpar timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorder.onstop = () => {
        // Criar blob do áudio
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        // Parar todas as tracks
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          error: null,
        });

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  // Pausar gravação
  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return;
    }

    mediaRecorder.pause();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  // Retomar gravação
  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder || mediaRecorder.state !== 'paused') {
      return;
    }

    mediaRecorder.resume();

    // Retomar timer
    let seconds = state.duration;
    timerRef.current = setInterval(() => {
      seconds++;
      setState((prev) => ({ ...prev, duration: seconds }));
    }, 1000);

    setState((prev) => ({ ...prev, isPaused: false }));
  }, [state.duration]);

  // Cancelar gravação
  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    audioChunksRef.current = [];

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}
