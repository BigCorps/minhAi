'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

// ── Tipos de status ────────────────────────────────────────────
type PageStatus = 'validating' | 'ready' | 'uploading' | 'success' | 'expired' | 'error';

// ── Componente interno (usa useSearchParams — precisa de Suspense) ──
function ArquivosContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<PageStatus>('validating');
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  const supabase = createClient();

  // Validar token ao carregar
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validações básicas no cliente
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPG, PNG, etc).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      // 1. Upload para Storage usando o token como pasta
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${token}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase
        .storage
        .from('companion-uploads')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

      // 2. Atualizar status na tabela — isso dispara o Realtime no kiosk
      const { error: updateError } = await supabase
        .from('companion_uploads')
        .update({ status: 'uploaded', storage_path: fileName })
        .eq('token', token)
        .eq('status', 'pending'); // só atualiza se ainda estiver pending

      if (updateError) throw new Error('Erro ao confirmar envio: ' + updateError.message);

      setStatus('success');
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido.');
      setStatus('error');
    }
  };

  // ── Renders por status ─────────────────────────────────────────

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
        <div className="text-5xl">⏱️</div>
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
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500/20 text-4xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-white">Enviado com sucesso!</h2>
        <p className="text-slate-400 text-sm max-w-xs">
          O assistente já recebeu sua imagem e está processando.
        </p>
        <p className="text-slate-500 text-xs mt-2">Pode fechar esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'uploading') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Enviando imagem...</p>
        <p className="text-slate-500 text-xs">Aguarde, não feche esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'error') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">❌</div>
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
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-white">
            {companyName || 'eAi - Funcionários de Voz'}
          </h1>
          <p className="text-slate-400 text-sm">
            Envie uma foto para o assistente
          </p>
        </div>

        {/* Botão câmera — abre câmera nativa no mobile */}
        <label className="w-full cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-semibold transition-all active:scale-95">
            <span>Tirar Foto</span>
          </div>
        </label>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs">ou</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Botão galeria */}
        <label className="w-full cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-full flex items-center justify-center gap-3 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl text-base font-semibold transition-all active:scale-95 border border-slate-600">
            <span>Escolher da Galeria</span>
          </div>
        </label>

        {/* Erro inline */}
        {error && (
          <div className="w-full px-4 py-3 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center mt-2">
          <p className="text-slate-600 text-xs">Esta página expira em 10 minutos.</p>
          <p className="text-slate-600 text-xs">Seus dados são processados com segurança.</p>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Wrapper de layout ──────────────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

// ── Export default com Suspense (obrigatório para useSearchParams) ──
export default function ArquivosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ArquivosContent />
    </Suspense>
  );
}