'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import {
  X, Copy, Check, ExternalLink, Link, ChevronDown, Zap,
  MessageCircle, AlertCircle, Eye, EyeOff, Save, Pencil, CheckCircle,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  whatsapp_number?: string | null;
  infinitepay_handle?: string | null;
}

interface Props {
  onClose: () => void;
  isDark?: boolean;
}

type Tab = 'pix' | 'pay';

const MINHAI_WHATSAPP = '5511987311425';

export default function PixLinkModal({ onClose }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [valor, setValor] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pix');

  // ── Handle InfinitePay inline ─────────────────────────────────────────────
  const [handleInput, setHandleInput] = useState('');
  const [showHandle, setShowHandle] = useState(false);
  const [editingHandle, setEditingHandle] = useState(false);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  const [handleSaved, setHandleSaved] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => { loadCompanies(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setValor('');
    setCopied(false);
  }, [activeTab]);

  // Ao trocar empresa, sincroniza handleInput com o handle salvo
  useEffect(() => {
    setHandleInput(selectedCompany?.infinitepay_handle ?? '');
    setEditingHandle(false);
    setHandleSaved(false);
    setShowHandle(false);
  }, [selectedCompany?.id]);

  async function loadCompanies() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug, whatsapp_number, infinitepay_handle')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany(data[0]);
      setHandleInput(data[0]?.infinitepay_handle ?? '');
    }
  }

  async function saveHandle() {
    if (!selectedCompany || !handleInput.trim()) return;
    setIsSavingHandle(true);
    const { error } = await supabase
      .from('companies')
      .update({ infinitepay_handle: handleInput.trim() })
      .eq('id', selectedCompany.id);
    setIsSavingHandle(false);
    if (!error) {
      // Atualiza estado local sem recarregar
      const updated: Company = { ...selectedCompany, infinitepay_handle: handleInput.trim() };
      setSelectedCompany(updated);
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingHandle(false);
      setHandleSaved(true);
      setTimeout(() => setHandleSaved(false), 3000);
    }
  }

  // ── URLs ──────────────────────────────────────────────────────────────────
  const baseUrlPix = selectedCompany ? `https://minhai.app/pix/${selectedCompany.slug}` : '';
  const fullUrlPix = valor && parseFloat(valor) > 0 ? `${baseUrlPix}/${valor}` : baseUrlPix;

  const baseUrlPay = selectedCompany ? `https://minhai.app/pay/${selectedCompany.slug}` : '';
  const fullUrlPay = valor && parseFloat(valor) > 0 ? `${baseUrlPay}/${valor}` : '';

  const hasInfinitePayHandle = !!selectedCompany?.infinitepay_handle;
  const fullUrl = activeTab === 'pix' ? fullUrlPix : (hasInfinitePayHandle ? fullUrlPay : '');

  // ── WhatsApp — apenas aba PIX ─────────────────────────────────────────────
  const rawWhatsapp = selectedCompany?.whatsapp_number?.replace(/\D/g, '') ?? '';
  const whatsappWithDDI = rawWhatsapp
    ? rawWhatsapp.startsWith('55') ? rawWhatsapp : `55${rawWhatsapp}`
    : '';
  const whatsappFormatted = rawWhatsapp ? selectedCompany!.whatsapp_number! : null;
  const waLink = whatsappWithDDI
    ? `https://wa.me/${MINHAI_WHATSAPP}?text=Ol%C3%A1%2C+quero+receber+notifica%C3%A7%C3%B5es+de+pagamento`
    : null;

  function copy() {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function maskHandle(handle: string) {
    if (handle.length <= 6) return '••••••';
    return handle.slice(0, 3) + '•'.repeat(handle.length - 6) + handle.slice(-3);
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-[460px] rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Gerar Link de Cobrança
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Compartilhe um link para receber pagamentos facilmente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-white/10">
          <button
            onClick={() => setActiveTab('pix')}
            className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'pix'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            PIX
          </button>
          <button
            onClick={() => setActiveTab('pay')}
            className={`flex-1 py-3 text-sm font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'pay'
                ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50/50 dark:bg-violet-900/10'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Link InfinitePay
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Descrição da aba */}
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {activeTab === 'pix'
              ? 'Gere um PIX com ou sem valor. Sem valor, o cliente digita o valor ao abrir o link.'
              : 'Gera uma cobrança InfinitePay ao abrir o link. O valor é obrigatório.'}
          </p>

          {/* Selecionar assistente */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
              Assistente
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition flex items-center justify-between"
              >
                <span>{selectedCompany?.name ?? 'Selecione...'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                  {companies.map(c => (
                    <li
                      key={c.id}
                      onClick={() => { setSelectedCompany(c); setDropdownOpen(false); }}
                      className={`px-3.5 py-2.5 text-sm cursor-pointer transition
                        ${selectedCompany?.id === c.id
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Handle InfinitePay inline (apenas aba pay) ────────────────── */}
          {activeTab === 'pay' && selectedCompany && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                Handle InfinitePay
              </label>

              {/* Já tem handle e não está editando */}
              {hasInfinitePayHandle && !editingHandle ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <span className="font-mono text-gray-700 dark:text-gray-300 flex-1">
                      {showHandle
                        ? selectedCompany.infinitepay_handle
                        : maskHandle(selectedCompany.infinitepay_handle!)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHandle(v => !v)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                    >
                      {showHandle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditingHandle(true); setHandleInput(selectedCompany.infinitepay_handle ?? ''); }}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                    title="Editar handle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Sem handle ou editando */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showHandle ? 'text' : 'password'}
                        placeholder="$seu-handle-aqui"
                        value={handleInput}
                        onChange={(e) => setHandleInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveHandle(); }}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowHandle(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                      >
                        {showHandle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={saveHandle}
                      disabled={isSavingHandle || !handleInput.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {isSavingHandle
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Salvar
                    </button>
                    {editingHandle && (
                      <button
                        type="button"
                        onClick={() => { setEditingHandle(false); setHandleInput(selectedCompany.infinitepay_handle ?? ''); }}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                        title="Cancelar edição"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Encontre em <strong>Painel InfinitePay → Integrações → Token</strong>.
                    Formato: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">$meu-handle</code>
                  </p>
                </div>
              )}

              {/* Feedback salvo com sucesso */}
              {handleSaved && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Handle salvo com sucesso!
                </div>
              )}
            </div>
          )}

          {/* Valor — só exibe se PIX, ou se pay com handle configurado */}
          {(activeTab === 'pix' || (activeTab === 'pay' && hasInfinitePayHandle)) && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                Valor{' '}
                {activeTab === 'pix'
                  ? <span className="normal-case font-normal text-gray-400 dark:text-slate-500">(opcional)</span>
                  : <span className="normal-case font-normal text-red-400">*obrigatório</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-slate-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder={activeTab === 'pix' ? 'Deixe vazio para o cliente digitar' : 'Digite o valor da cobrança'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              {activeTab === 'pay' && (!valor || parseFloat(valor) <= 0) && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
                  Informe o valor para gerar o link de cobrança InfinitePay.
                </p>
              )}
            </div>
          )}

          {/* URL gerada */}
          {fullUrl && (
            <div className={`rounded-xl p-4 border ${
              activeTab === 'pix'
                ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10'
                : 'bg-violet-50 dark:bg-violet-500/5 border-violet-100 dark:border-violet-500/10'
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                activeTab === 'pix'
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-violet-500 dark:text-violet-400'
              }`}>
                Link gerado
              </p>
              <p className={`text-sm font-mono break-all leading-relaxed ${
                activeTab === 'pix'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-violet-700 dark:text-violet-300'
              }`}>
                {fullUrl}
              </p>
            </div>
          )}

          {/* ── Aviso WhatsApp — APENAS aba PIX ──────────────────────────── */}
          {activeTab === 'pix' && selectedCompany && (
            <div className={`rounded-xl p-4 border ${
              whatsappWithDDI
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40'
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 ${whatsappWithDDI ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {whatsappWithDDI
                    ? <MessageCircle className="w-4 h-4" />
                    : <AlertCircle className="w-4 h-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-1 ${
                    whatsappWithDDI
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}>
                    {whatsappWithDDI
                      ? 'Notificações WhatsApp configuradas'
                      : 'WhatsApp não configurado'}
                  </p>

                  {whatsappWithDDI ? (
                    <>
                      <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                        Ao confirmar um PIX, você receberá uma notificação no{' '}
                        <span className="font-semibold">{whatsappFormatted}</span>.
                      </p>
                      <div className="rounded-lg bg-green-100 dark:bg-green-900/20 px-3 py-2">
                        <p className="text-xs text-green-800 dark:text-green-300">
                          ⚠️ <strong>Importante:</strong> Caso não receba a notificação, basta enviar qualquer mensagem para o WhatsApp minhAi para reativar a janela de conversas.{' '}
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 font-semibold hover:text-green-900 dark:hover:text-green-200"
                            >
                              Clique aqui para abrir a conversa →
                            </a>
                          )}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                        Configure o número de WhatsApp do assistente para receber notificações de pagamento.
                      </p>
                      <a
                        href="/dashboard/functions"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                      >
                        Configurar em Funções → QR Code WhatsApp →
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={copy}
              disabled={!fullUrl}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                copied
                  ? 'bg-green-500 text-white'
                  : activeTab === 'pix'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/20'
              }`}
            >
              {copied
                ? <><Check className="w-4 h-4" />Copiado!</>
                : <><Copy className="w-4 h-4" />Copiar Link</>}
            </button>
            <button
              onClick={() => fullUrl && window.open(fullUrl, '_blank')}
              disabled={!fullUrl}
              title="Abrir em nova aba"
              className="px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
