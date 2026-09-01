'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Images } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
}

interface DrivePickerButtonProps {
  companyId: string;
  onFilesSelected: (files: DriveFile[]) => void;
  label?: string;
  className?: string;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
    pickerApiLoaded: boolean;
  }
}

export default function DrivePickerButton({
  companyId,
  onFilesSelected,
  label = 'Selecionar imagens do Drive',
  className,
}: DrivePickerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pickerReady, setPickerReady] = useState(false);

  useEffect(() => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ]).then(() => {
      window.gapi.load('picker', () => {
        window.pickerApiLoaded = true;
        setPickerReady(true);
      });
    }).catch(() => {
      console.error('Erro ao carregar Google Picker API');
    });
  }, []);

  const openPicker = useCallback(async () => {
    if (!pickerReady) return;
    setLoading(true);

    try {
      // Buscar access token via edge function
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-token-helper`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.access_token) throw new Error(json.error || 'Token não disponível');

      const accessToken = json.access_token;

      // Criar o Google Picker com seleção múltipla de imagens
      const picker = new window.google.picker.PickerBuilder()
        .addView(
          new window.google.picker.DocsView()
            .setMimeTypes('image/jpeg,image/png,image/gif,image/webp,image/bmp')
            .setMode(window.google.picker.DocsViewMode.GRID)
        )
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
        .setOAuthToken(accessToken)
        .setTitle('Selecione as imagens (máximo 50)')
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const files: DriveFile[] = data.docs.map((f: any) => ({
              id: f.id,
              name: f.name,
            }));
            onFilesSelected(files);
          }
          if (
            data.action === window.google.picker.Action.PICKED ||
            data.action === window.google.picker.Action.CANCEL
          ) {
            setLoading(false);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err: any) {
      console.error('Erro ao abrir picker:', err);
      alert('Erro ao abrir seletor do Drive: ' + err.message);
      setLoading(false);
    }
  }, [pickerReady, companyId, onFilesSelected]);

  return (
    <button
      onClick={openPicker}
      disabled={loading || !pickerReady}
      className={className || 'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition'}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Images className="w-4 h-4" />
      }
      {loading ? 'Abrindo...' : pickerReady ? label : 'Carregando...'}
    </button>
  );
}
