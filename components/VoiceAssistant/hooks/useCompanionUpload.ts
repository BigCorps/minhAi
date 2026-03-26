'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import QRCode from 'qrcode';

interface UseCompanionUploadOptions {
  companyId: string;
  onImageReceived: (base64: string) => void;
  onUrlReceived?: (url: string) => void; // NOVO — callback para quando o celular envia um link
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

const EXPIRY_SECONDS = 600;

export function useCompanionUpload({
  companyId,
  onImageReceived,
  onUrlReceived,
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
  const statusRef = useRef<UseCompanionUploadReturn['status']>('idle');

  // Refs para callbacks — garante versão atualizada mesmo em closures do Realtime
  const onImageReceivedRef = useRef(onImageReceived);
  const onUrlReceivedRef = useRef(onUrlReceived);
  useEffect(() => { onImageReceivedRef.current = onImageReceived; }, [onImageReceived]);
  useEffect(() => { onUrlReceivedRef.current = onUrlReceived; }, [onUrlReceived]);

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
  }, [cleanupAll]);

  const processReceivedUpload = useCallback(async (storagePath: string, fileName?: string, fileType?: string) => {
    cleanupAll();
    setStatus('received');

    try {
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('companion-uploads')
        .download(storagePath);

      if (fileError || !fileData) throw new Error('Erro ao baixar arquivo do servidor.');

      // ── Detectar se é um link enviado pelo celular ──────────────────────────
      // O arquivo de link é salvo como .json com mime application/json
      const isJsonLink =
        (fileName?.endsWith('.json')) ||
        (fileType === 'application/json') ||
        storagePath.endsWith('.json');

      if (isJsonLink) {
        try {
          const text = await fileData.text();
          const json = JSON.parse(text);
          if (json.type === 'url' && json.url) {
            onUrlReceivedRef.current?.(json.url);
            return;
          }
        } catch {
          // JSON inválido — tratar como imagem normal abaixo
        }
      }

      // ── Arquivo normal (imagem ou PDF) ──────────────────────────────────────
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        onImageReceivedRef.current(base64);
      };
      reader.readAsDataURL(fileData);

    } catch (err: any) {
      setError('Arquivo recebido mas erro ao processar: ' + err.message);
    }
  }, [supabase, cleanupAll]);

  const start = useCallback(async () => {
    setStatus('generating');
    setError(null);

    try {
      // 1. Criar token no banco
      const { data, error: dbError } = await supabase
        .from('companion_uploads')
        .insert({ company_id: companyId })
        .select('token')
        .single();

      if (dbError || !data) throw new Error('Erro ao gerar token de upload.');

      const newToken = data.token as string;
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.minhai.app';
      const url = `${BASE_URL}/arquivos?token=${newToken}`;

      // 2. Gerar QR Code
      const qr = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      setToken(newToken);
      setUploadUrl(url);
      setQrCodeUrl(qr);
      setStatus('waiting');
      setTimeLeft(EXPIRY_SECONDS);

      // 3. Contagem regressiva
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

      // 4. Timeout total
      timerRef.current = setTimeout(() => {
        if (statusRef.current === 'waiting') {
          cleanupAll();
          setStatus('expired');
        }
      }, EXPIRY_SECONDS * 1000);

      // 5. Supabase Realtime
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
            const row = payload.new as {
              status: string;
              storage_path: string | null;
              file_name?: string;
              file_type?: string;
            };
            if (row.status === 'uploaded' && row.storage_path) {
              await processReceivedUpload(row.storage_path, row.file_name, row.file_type);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // 6. Polling de fallback
      pollRef.current = setInterval(async () => {
        if (statusRef.current !== 'waiting') {
          clearInterval(pollRef.current!);
          return;
        }
        const { data: row } = await supabase
          .from('companion_uploads')
          .select('status, storage_path, file_name, file_type')
          .eq('token', newToken)
          .single();

        if (row?.status === 'uploaded' && row.storage_path) {
          clearInterval(pollRef.current!);
          await processReceivedUpload(row.storage_path, row.file_name, row.file_type);
        }
      }, 5000);

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }, [companyId, supabase, cleanupAll, processReceivedUpload]);

  return { token, qrCodeUrl, uploadUrl, status, timeLeft, error, start, cancel };
}
