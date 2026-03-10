'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { createShortLink } from '@/lib/short-links';
import QRCode from 'qrcode';

interface UseCompanionUploadOptions {
  companyId: string;
  onImageReceived: (base64: string) => void;
}

export interface UseCompanionUploadReturn {
  token: string | null;
  qrCodeUrl: string | null;
  uploadUrl: string | null;
  status: 'idle' | 'generating' | 'waiting' | 'received' | 'expired' | 'error';
  timeLeft: number;
  error: string | null;
  start: () => Promise<void>;
  cancel: () => void;
}

const EXPIRY_SECONDS = 600; // 10 minutos

export function useCompanionUpload({
  companyId,
  onImageReceived,
}: UseCompanionUploadOptions): UseCompanionUploadReturn {
  const [token, setToken] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UseCompanionUploadReturn['status']>('idle');
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTokenRef = useRef<string | null>(null);
  const statusRef = useRef<UseCompanionUploadReturn['status']>('idle');

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

  const cancel = useCallback(() => {
    cleanupAll();
    setToken(null);
    setQrCodeUrl(null);
    setUploadUrl(null);
    setStatus('idle');
    setTimeLeft(EXPIRY_SECONDS);
    setError(null);
    currentTokenRef.current = null;
  }, [cleanupAll]);

  const processReceivedUpload = useCallback(async (storagePath: string) => {
    cleanupAll();
    setStatus('received');

    try {
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('companion-uploads')
        .download(storagePath);

      if (fileError || !fileData) throw new Error('Erro ao baixar imagem do servidor.');

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onImageReceived(base64);
      };
      reader.readAsDataURL(fileData);
    } catch (err: any) {
      setError('Imagem recebida mas erro ao processar: ' + err.message);
    }
  }, [supabase, cleanupAll, onImageReceived]);

  const start = useCallback(async () => {
    setStatus('generating');
    setError(null);

    try {
      // 1. Criar token no banco
      const { data, error: dbError } = await supabase
        .from('companion_uploads')
        .insert({ company_id: companyId })
        .select('token, expires_at')
        .single();

      if (dbError || !data) throw new Error('Erro ao gerar token de upload.');

      const newToken = data.token as string;
      const expiresAt = data.expires_at as string;
      currentTokenRef.current = newToken;

      // 2. Gerar short link — QR Code mais curto e fácil de escanear
      const shortUrl = await createShortLink('upload', newToken, companyId, expiresAt);

      // 3. Gerar QR Code com a URL curta
      const qr = await QRCode.toDataURL(shortUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      setToken(newToken);
      setUploadUrl(shortUrl);
      setQrCodeUrl(qr);
      setStatus('waiting');
      setTimeLeft(EXPIRY_SECONDS);

      // 4. Contagem regressiva
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            cleanupAll();
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 5. Timeout total de 10 min
      timerRef.current = setTimeout(() => {
        if (statusRef.current === 'waiting') {
          cleanupAll();
          setStatus('expired');
        }
      }, EXPIRY_SECONDS * 1000);

      // 6. Supabase Realtime
      const channel = supabase
        .channel(`companion-upload-${newToken}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'companion_uploads',
            filter: `token=eq.${newToken}`,
          },
          async (payload) => {
            const row = payload.new as { status: string; storage_path: string | null };
            if (row.status === 'uploaded' && row.storage_path) {
              await processReceivedUpload(row.storage_path);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // 7. Polling de fallback
      pollRef.current = setInterval(async () => {
        if (statusRef.current !== 'waiting') {
          clearInterval(pollRef.current!);
          return;
        }
        const { data: row } = await supabase
          .from('companion_uploads')
          .select('status, storage_path')
          .eq('token', currentTokenRef.current)
          .single();

        if (row?.status === 'uploaded' && row.storage_path) {
          clearInterval(pollRef.current!);
          await processReceivedUpload(row.storage_path);
        }
      }, 5000);

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [companyId, supabase, cleanupAll, processReceivedUpload]);

  return { token, qrCodeUrl, uploadUrl, status, timeLeft, error, start, cancel };
}
