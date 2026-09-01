'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Timer, CheckCircle, XCircle, ImageUp, FileUp, RefreshCw, Paperclip, Link, Hash } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const ACCEPTED_TYPES = 'image/*,application/pdf,text/plain,text/csv,.docx,.xlsx,.doc,.xls';
const MAX_SIZE_BYTES  = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

type PageStatus = 'validating' | 'ready' | 'uploading' | 'merging' | 'success' | 'expired' | 'error';
type InputMode  = 'file' | 'url' | 'text';

async function mergeFilesToPDF(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    if (file.type === 'application/pdf') {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    } else if (file.type.startsWith('image/')) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = file.type === 'image/png'
        ? await mergedPdf.embedPng(bytes)
        : await mergedPdf.embedJpg(bytes);
      const page = mergedPdf.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const dims = image.scaleToFit(width, height);
      page.drawImage(image, {
        x: (width  - dims.width)  / 2,
        y: (height - dims.height) / 2,
        width: dims.width, height: dims.height,
      });
    }
  }
  return await mergedPdf.save();
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function ArquivosContent() {
  const searchParams = useSearchParams();
  const token     = searchParams.get('token');
  const allowUrl  = searchParams.get('allowUrl')  === '1';
  const allowText = searchParams.get('allowText') === '1'; // ← NOVO

  const [status, setStatus]               = useState<PageStatus>('validating');
  const [error, setError]                 = useState<string | null>(null);
  const [companyName, setCompanyName]     = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [mergingCount, setMergingCount]   = useState(0);
  const [inputMode, setInputMode]         = useState<InputMode>('file');
  const [urlInput, setUrlInput]           = useState('');
  const [textInput, setTextInput]         = useState(''); // ← NOVO
  const [textLabel, setTextLabel]         = useState('Código'); // ← NOVO — label configurável

  const supabase = createClient();

  useEffect(() => {
    if (!token) { setError('Token não encontrado na URL.'); setStatus('error'); return; }

    async function validateToken() {
      const { data, error: dbError } = await supabase
        .from('companion_uploads')
        .select('status, expires_at, company_id, companies(name)')
        .eq('token', token)
        .single();

      if (dbError || !data) { setError('QR Code inválido ou já utilizado.'); setStatus('error'); return; }
      if (data.status !== 'pending') { setStatus('expired'); return; }
      if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }

      setCompanyName((data.companies as any)?.name ?? '');

      // Ler label do texto a partir do parâmetro da URL (ex: &textLabel=Linha+Digitavel)
      const labelParam = searchParams.get('textLabel');
      if (labelParam) setTextLabel(decodeURIComponent(labelParam));

      setStatus('ready');
    }
    validateToken();
  }, [token]); // eslint-disable-line

  // ── Upload arquivo único ───────────────────────────────────────────────────
  const uploadSingleFile = async (file: File) => {
    if (!token) return;
    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${token}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('companion-uploads')
      .upload(storagePath, file, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);
    const { error: updateError } = await supabase
      .from('companion_uploads')
      .update({ status: 'uploaded', storage_path: storagePath, file_name: file.name, file_type: file.type, file_size: file.size })
      .eq('token', token).eq('status', 'pending');
    if (updateError) throw new Error('Erro ao confirmar envio: ' + updateError.message);
  };

  const uploadMergedPDF = async (pdfBytes: Uint8Array, fileCount: number) => {
    const fileName = `arquivos_mesclados_${Date.now()}.pdf`;
    const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
    setUploadedFileName(`${fileCount} arquivos → ${fileName}`);
    await uploadSingleFile(file);
  };

  // ── Handler câmera ─────────────────────────────────────────────────────────
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > MAX_SIZE_BYTES) { setError('Arquivo muito grande. Máximo 10MB.'); return; }
    setStatus('uploading'); setError(null); setUploadedFileName(file.name);
    try { await uploadSingleFile(file); setStatus('success'); }
    catch (err: any) { setError(err.message ?? 'Erro desconhecido.'); setStatus('error'); }
  };

  // ── Handler arquivo(s) ─────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !token) return;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > MAX_TOTAL_BYTES) { setError(`Total muito grande. Máximo ${MAX_TOTAL_BYTES / 1024 / 1024}MB.`); return; }
    for (const f of files) {
      if (f.size > MAX_SIZE_BYTES) { setError(`"${f.name}" muito grande. Máximo 10MB.`); return; }
    }
    setError(null);
    const isMergeable = (f: File) => f.type.startsWith('image/') || f.type === 'application/pdf';
    if (files.length === 1) {
      setStatus('uploading'); setUploadedFileName(files[0].name);
      try { await uploadSingleFile(files[0]); setStatus('success'); }
      catch (err: any) { setError(err.message ?? 'Erro desconhecido.'); setStatus('error'); }
      return;
    }
    const nonMergeable = files.filter(f => !isMergeable(f));
    if (nonMergeable.length > 0) {
      setError(`Ao enviar vários arquivos, use apenas PDFs e imagens. Arquivo não suportado: ${nonMergeable[0].name}`);
      return;
    }
    setStatus('merging'); setMergingCount(files.length);
    try {
      const pdfBytes = await mergeFilesToPDF(files);
      setStatus('uploading');
      await uploadMergedPDF(pdfBytes, files.length);
      setStatus('success');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao mesclar arquivos.');
      setStatus('error');
    } finally { setMergingCount(0); }
  };

  // ── Handler envio de URL ───────────────────────────────────────────────────
  const handleUrlSubmit = async () => {
    if (!token || !urlInput.trim()) return;
    const normalized = urlInput.trim().startsWith('http') ? urlInput.trim() : `https://${urlInput.trim()}`;
    try { new URL(normalized); } catch { setError('URL inválida. Verifique e tente novamente.'); return; }
    setStatus('uploading'); setError(null); setUploadedFileName(normalized);
    const blob = new Blob([JSON.stringify({ type: 'url', url: normalized })], { type: 'application/json' });
    const file = new File([blob], 'url_para_analise.json', { type: 'application/json' });
    try { await uploadSingleFile(file); setStatus('success'); }
    catch (err: any) { setError(err.message ?? 'Erro ao enviar link.'); setStatus('error'); }
  };

  // ── Handler envio de texto (linha digitável, código, etc.) ─────────────────
  const handleTextSubmit = async () => {
    if (!token || !textInput.trim()) return;
    setStatus('uploading'); setError(null); setUploadedFileName(textInput.trim());
    // Salva como JSON com type: 'text' — detectado pelo useCompanionUpload via onTextReceived
    const blob = new Blob(
      [JSON.stringify({ type: 'text', value: textInput.trim() })],
      { type: 'application/json' }
    );
    const file = new File([blob], 'texto_enviado.json', { type: 'application/json' });
    try { await uploadSingleFile(file); setStatus('success'); }
    catch (err: any) { setError(err.message ?? 'Erro ao enviar texto.'); setStatus('error'); }
  };

  // ── Estados de tela ────────────────────────────────────────────────────────
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
        <p className="text-slate-400 text-sm max-w-xs">Este QR Code expirou. Volte ao assistente e gere um novo.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'merging') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4 text-center">
        <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Mesclando {mergingCount} arquivos em 1 PDF...</p>
        <p className="text-slate-500 text-xs">Aguarde, não feche esta página.</p>
      </div>
    </PageWrapper>
  );

  if (status === 'uploading') return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Enviando...</p>
        {uploadedFileName && <p className="text-slate-500 text-xs font-mono">{uploadedFileName}</p>}
        <p className="text-slate-500 text-xs">Aguarde, não feche esta página.</p>
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
        <p className="text-slate-400 text-sm max-w-xs">O assistente já recebeu e está processando.</p>
        <p className="text-slate-500 text-xs mt-2">Pode fechar esta página.</p>
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

  // ── status === 'ready' ─────────────────────────────────────────────────────
  // Quantas abas extras existem além de 'file'
  const extraModes = (allowUrl ? 1 : 0) + (allowText ? 1 : 0);
  const showToggle = extraModes > 0;

  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-white">
            {companyName || 'minhAi - Uma IA pra chamar de sua!'}
          </h1>
          <p className="text-slate-400 text-sm">
            {allowText && !allowUrl
              ? `Envie um arquivo ou digite o ${textLabel}`
              : 'Envie um ou mais arquivos para o assistente'}
          </p>
        </div>

        {/* Toggle — só exibe quando há modos extras */}
        {showToggle && (
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800 w-full">
            <button
              onClick={() => { setInputMode('file'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                inputMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              Arquivo / Foto
            </button>
            {allowText && (
              <button
                onClick={() => { setInputMode('text'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  inputMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                {textLabel}
              </button>
            )}
            {allowUrl && (
              <button
                onClick={() => { setInputMode('url'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  inputMode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                Link / URL
              </button>
            )}
          </div>
        )}

        {/* ── Modo arquivo ── */}
        {inputMode === 'file' && (
          <>
            <label className="w-full cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
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
            <label className="w-full cursor-pointer">
              <input type="file" accept={ACCEPTED_TYPES} multiple className="hidden" onChange={handleFileChange} />
              <div className="w-full flex items-center justify-center gap-3 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl text-base font-semibold transition-all active:scale-95 border border-slate-600">
                <FileUp className="w-5 h-5" />
                <span>Escolher Arquivo(s)</span>
              </div>
            </label>
            <p className="text-slate-600 text-xs text-center">
              Imagens e PDFs podem ser enviados juntos e serão mesclados.
              <br />TXT, CSV, DOC, XLS — envie 1 por vez. Máx. 10MB/arquivo.
            </p>
          </>
        )}

        {/* ── Modo texto — só quando allowText=1 ── */}
        {allowText && inputMode === 'text' && (
          <div className="flex flex-col gap-3 w-full">
            <p className="text-slate-400 text-sm text-center">
              Digite o {textLabel} e envie para o assistente
            </p>
            <textarea
              value={textInput}
              onChange={e => { setTextInput(e.target.value); setError(null); }}
              placeholder={`Digite o ${textLabel} aqui...`}
              rows={4}
              autoFocus
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 rounded-2xl text-sm font-mono outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl text-base font-semibold transition-all active:scale-95"
            >
              Enviar {textLabel}
            </button>
          </div>
        )}

        {/* ── Modo URL — só quando allowUrl=1 ── */}
        {allowUrl && inputMode === 'url' && (
          <div className="flex flex-col gap-3 w-full">
            <p className="text-slate-400 text-sm text-center">Cole o link suspeito para análise</p>
            <input
              type="url"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setError(null); }}
              placeholder="https://site-suspeito.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 rounded-2xl text-sm font-mono outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl text-base font-semibold transition-all active:scale-95"
            >
              Enviar link para análise
            </button>
          </div>
        )}

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
