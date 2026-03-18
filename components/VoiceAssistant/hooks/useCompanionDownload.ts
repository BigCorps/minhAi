'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import QRCode from 'qrcode';

interface UseCompanionDownloadOptions {
  companyId: string;
  fileName: string;
  fileType: string;
  fileBase64: string;
  enabled?: boolean;
}

export interface UseCompanionDownloadReturn {
  status: 'idle' | 'generating' | 'ready' | 'downloaded' | 'expired' | 'error';
  qrCodeUrl: string | null;
  downloadUrl: string | null;
  timeLeft: number;
  reset: () => void;
  error: string | null;
}

const EXPIRY_SECONDS = 600;

export function useCompanionDownload({
  companyId,
  fileName,
  fileType,
  fileBase64,
  enabled = false,
}: UseCompanionDownloadOptions): UseCompanionDownloadReturn {
  const [status, setStatus] = useState<UseCompanionDownloadReturn['status']>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<UseCompanionDownloadReturn['status']>('idle');
  const hasGeneratedRef = useRef(false);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    return () => { cleanupAll(); };
  }, []); // eslint-disable-line

  const cleanupAll = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, [supabase]);

  const generate = useCallback(async () => {
    setStatus('generating');
    setError(null);

    try {
      // 1. Inserir registro com o arquivo
      const { data, error: dbError } = await supabase
        .from('companion_downloads')
        .insert({
          company_id: companyId,
          file_name: fileName,
          file_type: fileType,
          file_base64: fileBase64,
        })
        .select('token')
        .single();

      if (dbError || !data) throw new Error('Erro ao gerar token de download.');

      const newToken = data.token as string;
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.minhai.app';
      const url = `${BASE_URL}/download/${newToken}`;

      // 2. Gerar QR Code
      const qr = await QRCode.toDataURL(url, {
        width: 180,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      setDownloadUrl(url);
      setQrCodeUrl(qr);
      setStatus('ready');
      setTimeLeft(EXPIRY_SECONDS);

      // 3. Contagem regressiva
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            cleanupAll();
            supabase
              .from('companion_downloads')
              .update({ status: 'expired' })
              .eq('token', newToken)
              .then(() => {});
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 4. Timeout total
      timerRef.current = setTimeout(() => {
        if (statusRef.current === 'ready') {
          cleanupAll();
          supabase
            .from('companion_downloads')
            .update({ status: 'expired' })
            .eq('token', newToken)
            .then(() => {});
          setStatus('expired');
        }
      }, EXPIRY_SECONDS * 1000);

      // 5. Supabase Realtime — detectar quando o cliente baixou
      const channel = supabase
        .channel(`companion-download-${newToken}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'companion_downloads',
            filter: `token=eq.${newToken}`,
          },
          (payload) => {
            const row = payload.new as { status: string };
            if (row.status === 'downloaded') {
              cleanupAll();
              setStatus('downloaded');
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // 6. Polling de fallback — usa newToken do closure, não ref
      pollRef.current = setInterval(async () => {
        if (statusRef.current !== 'ready') {
          clearInterval(pollRef.current!);
          return;
        }
        const { data: row } = await supabase
          .from('companion_downloads')
          .select('status')
          .eq('token', newToken)
          .single();

        if (row?.status === 'downloaded') {
          clearInterval(pollRef.current!);
          cleanupAll();
          setStatus('downloaded');
        }
      }, 5000);

    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido.');
      setStatus('error');
    }
  }, [companyId, fileName, fileType, fileBase64, supabase, cleanupAll]);

  useEffect(() => {
    if (enabled && !hasGeneratedRef.current && fileBase64) {
      hasGeneratedRef.current = true;
      generate();
    }
  }, [enabled, fileBase64, generate]);

  const reset = useCallback(() => {
    cleanupAll();
    hasGeneratedRef.current = false;
    setStatus('idle');
    setQrCodeUrl(null);
    setDownloadUrl(null);
    setTimeLeft(EXPIRY_SECONDS);
    setError(null);
    if (enabled && fileBase64) {
      hasGeneratedRef.current = true;
      generate();
    }
  }, [cleanupAll, enabled, fileBase64, generate]);

  return { status, qrCodeUrl, downloadUrl, timeLeft, reset, error };
}
