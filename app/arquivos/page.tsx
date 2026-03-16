'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Timer, CheckCircle, XCircle, ImageUp, FileUp } from 'lucide-react';

// Tipos MIME aceitos pelo input (bucket aceita todos após a migration)
const ACCEPTED_TYPES = 'image/*,application/pdf,text/plain,text/csv,.docx,.xlsx,.doc,.xls';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type PageStatus = 'validating' | 'ready' | 'uploading' | 'success' | 'expired' | 'error';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

function ArquivosContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<PageStatus>('validating');
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setError('Token não encontrado na URL.');
      setStatus('error');
      return;
    }

    async function validateToken() {
      const { data, error: dbError } = await supabase
        .from('companion_uploads')
        .select('status, expires_at, company_id, companies(name)')
        .eq('token', token)
        .single();

      if (dbError || !data) {
        setError('QR Code inválido ou já utilizado.');
        setStatus('error');
        return;
      }
      if (data.status !== 'pending') {
        setStatus('expired');
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      setCompanyName((data.companies as any)?.name ?? '');
      setStatus('ready');
    }

    validateToken();
  }, [token]); // eslint-disable-line

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    captureMode?: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validação de tamanho
    if (file.size > MAX_SIZE_BYTES) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    // Em modo câmera, só aceitar imagem
    if (captureMode && !file.type.startsWith('image/')) {
      setError('Selecione uma imagem.');
      return;
    }

    setStatus('uploading');
    setError(null);
    setUploadedFileName(file.name);

    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const storagePath = `${token}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase
        .storage
        .from('companion-uploads')
        .upload(storagePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

      const { error: updateError } = await supabase
        .from('companion_uploads')
        .update({
          status: 'uploaded',
          storage_path: storagePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .eq('token', token)
        .eq('status', 'pending');

      if (updateError) throw new Error('Erro ao confirmar envio: ' + updateError.message);

      setStatus('success');
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido.');
      setStatus('error');
    }
  };

  if (status === 'validating') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Verificando QR Code...</p>
      </div>
    </PageWrapper>
  );

  if (status === 'expired') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-500/20">
          <Timer className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">QR Code expirado</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          Este QR Code expirou. Volte ao assistente e gere um novo.
        </p>
      </div>
    </PageWrapper>
  );

  if (status === 'success') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Enviado com sucesso!</h2>
        {uploadedFileName && (
          <p className="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-1.5 rounded-lg max-w-xs truncate">
            {uploadedFileName}
          </p>
        )}
        <p className="text-slate-400 text-sm max-w-xs">
          O assistente já recebeu o arquivo e está processando.
        </p>
        <p className="text-slate-500 text-xs mt-2">Pode fechar esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'uploading') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Enviando arquivo...</p>
        {uploadedFileName && (
          <p className="text-slate-500 text-xs font-mono">{uploadedFileName}</p>
        )}
        <p className="text-slate-500 text-xs">Aguarde, não feche esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'error') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500/20">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Erro</h2>
        <p className="text-red-400 text-sm max-w-xs">{error}</p>
        <button
          onClick={() => { setError(null); setStatus('validating'); window.location.reload(); }}
          className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </PageWrapper>
  );

  // status === 'ready'
  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-white">
            {companyName || 'minhAi - Uma IA pra chamar de sua!'}
          </h1>
          <p className="text-slate-400 text-sm">
            Envie um arquivo para o assistente
          </p>
        </div>

        {/* Botão câmera — apenas imagem */}
        <label className="w-full cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleFileChange(e, true)}
          />
          <div className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-semibold transition-all active:scale-95">
            <ImageUp className="w-5 h-5" />
            <span>Tirar Foto</span>
          </div>
        </label>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs">ou</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Botão arquivo — aceita imagens, PDF, planilhas, docs */}
        <label className="w-full cursor-pointer">
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={e => handleFileChange(e, false)}
          />
          <div className="w-full flex items-center justify-center gap-3 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl text-base font-semibold transition-all active:scale-95 border border-slate-600">
            <FileUp className="w-5 h-5" />
            <span>Escolher Arquivo</span>
          </div>
        </label>

        {/* Tipos aceitos */}
        <p className="text-slate-600 text-xs text-center">
          Imagens, PDF, TXT, CSV, DOC, XLS — até 10MB
        </p>

        {error && (
          <div className="w-full px-4 py-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="text-center">
          <p className="text-slate-600 text-xs">Esta página expira quando utilizada.</p>
          <p className="text-slate-600 text-xs">Seus dados são processados com segurança.</p>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function ArquivosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ArquivosContent />
    </Suspense>
  );
}
