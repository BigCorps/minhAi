'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface UseCompanionUploadOptions {
  companyId: string;
  onImageReceived: (base64: string) => void;
  onUrlReceived?: (url: string) => void;
  allowUrl?: boolean; 
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
  allowUrl = false, 
}: UseCompanionUploadOptions): UseCompanionUploadReturn {
  const [token, setToken]       = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [status, setStatus]     = useState<UseCompanionUploadReturn['status']>('idle');
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const [error, setError]       = useState<string | null>(null);

  const supabase = createClient();
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef     = useRef<UseCompanionUploadReturn['status']>('idle');

  const onImageReceivedRef = useRef(onImageReceived);
  const onUrlReceivedRef   = useRef(onUrlReceived);
  useEffect(() => { onImageReceivedRef.current = onImageReceived; }, [onImageReceived]);
  useEffect(() => { onUrlReceivedRef.current = onUrlReceived; }, [onUrlReceived]);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => { return () => { cleanupAll(); }; }, []); // eslint-disable-line

  const cleanupAll = useCallback(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (timerRef.current)     { clearTimeout(timerRef.current);   timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (pollRef.current)      { clearInterval(pollRef.current);   pollRef.current = null; }
  }, [supabase]);

  const cancel = useCallback(() => {
    cleanupAll();
    setToken(null); setQrCodeUrl(null); setUploadUrl(null);
    setStatus('idle'); setTimeLeft(EXPIRY_SECONDS); setError(null);
  }, [cleanupAll]);

  const processReceivedUpload = useCallback(async (
    storagePath: string,
    fileName?: string | null,
    fileType?: string | null,
  ) => {
    cleanupAll();
    setStatus('received');

    console.log('[companion] processReceivedUpload', { storagePath, fileName, fileType });

    try {
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('companion-uploads')
        .download(storagePath);

      if (fileError || !fileData) {
        console.error('[companion] Erro ao baixar arquivo:', fileError);
        throw new Error('Erro ao baixar arquivo do servidor.');
      }

      console.log('[companion] Arquivo baixado. size:', fileData.size, 'type:', fileData.type);

      // ── Detectar se é um link enviado pelo celular ──────────────────────
      // Estratégia multicamada — verifica fileName, fileType, storagePath e conteúdo
      const looksLikeJson =
        fileName?.endsWith('.json') ||
        fileType === 'application/json' ||
        storagePath.endsWith('.json') ||
        fileData.type === 'application/json';

      console.log('[companion] looksLikeJson:', looksLikeJson, {
        fileNameEndsJson: fileName?.endsWith('.json'),
        fileTypeIsJson: fileType === 'application/json',
        pathEndsJson: storagePath.endsWith('.json'),
        blobTypeIsJson: fileData.type === 'application/json',
      });

      if (looksLikeJson) {
        try {
          const text = await fileData.text();
          console.log('[companion] Conteúdo JSON raw:', text.slice(0, 200));
          const json = JSON.parse(text);
          console.log('[companion] JSON parseado:', json);

          if (json.type === 'url' && json.url) {
            console.log('[companion] URL detectada, chamando onUrlReceived:', json.url);
            onUrlReceivedRef.current?.(json.url);
            return;
          } else {
            console.warn('[companion] JSON não tem type=url ou url ausente:', json);
          }
        } catch (parseErr) {
          console.error('[companion] Falha ao parsear JSON:', parseErr);
          // Continua para tentar como imagem
        }
      }

      // ── Verificar se o conteúdo começa com "URL:" (fallback texto puro) ──
      // Caso o bucket ainda não aceite JSON e o arquivo foi salvo como text/plain
      try {
        const textContent = await fileData.text();
        console.log('[companion] Tentando text/plain fallback. Conteúdo:', textContent.slice(0, 100));
        if (textContent.startsWith('URL:')) {
          const url = textContent.slice(4).trim();
          console.log('[companion] URL via fallback text/plain:', url);
          onUrlReceivedRef.current?.(url);
          return;
        }
      } catch {
        // Não é texto — continua para imagem
      }

      // ── Arquivo normal (imagem ou PDF) ──────────────────────────────────
      console.log('[companion] Tratando como imagem/PDF');
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        console.log('[companion] base64 pronto, chamando onImageReceived. Tamanho:', base64?.length);
        onImageReceivedRef.current(base64);
      };
      reader.readAsDataURL(fileData);

    } catch (err: any) {
      console.error('[companion] Erro em processReceivedUpload:', err);
      setError('Arquivo recebido mas erro ao processar: ' + err.message);
    }
  }, [supabase, cleanupAll]);

  const start = useCallback(async () => {
    setStatus('generating');
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('companion_uploads')
        .insert({ company_id: companyId })
        .select('token')
        .single();

      if (dbError || !data) throw new Error('Erro ao gerar token de upload.');

      const newToken  = data.token as string;
      const BASE_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://www.minhai.app';
      const url = `${BASE_URL}/arquivos?token=${newToken}${allowUrl ? '&allowUrl=1' : ''}`;

      const qr = await QRCode.toDataURL(url, {
        width: 280, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      setToken(newToken);
setUploadUrl(url);
setQrCodeUrl(`/api/qrcode?size=280&data=${encodeURIComponent(url)}&color=%231e293b`);
setStatus('waiting');
      setTimeLeft(EXPIRY_SECONDS);

      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { cleanupAll(); setStatus('expired'); return 0; }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        if (statusRef.current === 'waiting') { cleanupAll(); setStatus('expired'); }
      }, EXPIRY_SECONDS * 1000);

      // Realtime
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
              file_name?: string | null;
              file_type?: string | null;
            };
            console.log('[companion] Realtime UPDATE recebido:', row);
            if (row.status === 'uploaded' && row.storage_path) {
              await processReceivedUpload(row.storage_path, row.file_name, row.file_type);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Polling fallback
      pollRef.current = setInterval(async () => {
        if (statusRef.current !== 'waiting') { clearInterval(pollRef.current!); return; }

        const { data: row } = await supabase
          .from('companion_uploads')
          .select('status, storage_path, file_name, file_type')
          .eq('token', newToken)
          .single();

        console.log('[companion] Poll:', row?.status, row?.storage_path);

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
