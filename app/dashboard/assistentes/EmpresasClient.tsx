'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Settings, ExternalLink, QrCode, Zap, Plus, Copy, Check,
  Lock, Globe, X, Download, Mail, MessageSquare, Users,
  Sparkles, Globe2,
} from 'lucide-react';

interface AssistentesClientProps {
  companies: any[];
  user: any;
  hasConsultingPlan: boolean;
  activeWebappCompanyId: string | null;
}

export default function AssistentesClient({
  companies,
  user,
  hasConsultingPlan,
  activeWebappCompanyId,
}: AssistentesClientProps) {
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<any | null>(null);

  const handleCopy = (slug: string, id: string) => {
    navigator.clipboard.writeText(`https://minhai.app/ia/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateQrUrl = (
    slug: string,
    isPublic: boolean,
    privateSlug: string,
    companyId: string,
  ) => {
    const baseUrl = isPublic
      ? `https://minhai.app/ia/${slug}`
      : `https://minhai.app/ia/private/${privateSlug}`;
    return `/api/qrcode?size=300&data=${encodeURIComponent(baseUrl)}&color=%23000080&company_id=${companyId}`;
  };

  return (
    <div className="min-h-screen bg-transparent">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assistentes</h1>
            <p className="mt-1 text-gray-600 dark:text-white/60">
              Gerencie seus assistentes virtuais e configurações personalizadas
            </p>
          </div>
          <Link
            href="/dashboard/assistentes/create"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 font-semibold active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Assistente
          </Link>
        </div>

        {/* Lista */}
        <div className="space-y-6">
          {companies.map((assistant) => {
            const isWebappActive = assistant.id === activeWebappCompanyId;
            const webappUrl = isWebappActive
              ? `https://${assistant.slug}.${assistant.webapp_domain || 'minhai.app'}`
              : null;

            return (
              <div
                key={assistant.id}
                className="group relative rounded-2xl border transition-all duration-300 p-6
                  bg-white/80 border-gray-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5
                  dark:bg-white/5 dark:border-white/10 dark:hover:border-blue-500/30 backdrop-blur-sm"
              >
                {/* Linha principal — info + ações */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 items-center md:items-stretch">

                  {/* Info do Assistente */}
                  <div className="flex items-center space-x-4 flex-1 justify-center md:justify-start">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300
                      bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 overflow-hidden border border-gray-100 dark:border-white/5">
                      {assistant.logo_url ? (
                        <img
                          src={assistant.logo_url}
                          alt={assistant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).parentElement!.innerHTML =
                              '<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';
                          }}
                        />
                      ) : (
                        <Zap className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {assistant.name}
                        </h3>
                        {assistant.is_public ? (
                          <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                            <Globe className="w-3 h-3 mr-1" /> Público
                          </span>
                        ) : (
                          <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <Lock className="w-3 h-3 mr-1" /> Privado
                          </span>
                        )}
                        {assistant.assistant_type === 'vendas' && (
                          <span className="flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold">
                            <Zap className="w-3 h-3 mr-1" /> Versão Vendas · 10% comissão
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono text-gray-500 dark:text-white/40">
                        ID: {assistant.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* Ações — 2 linhas */}
                  <div className="flex flex-col gap-2 items-center md:items-end">
                    {/* Linha 1 */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                      {assistant.is_public && (
                        <button
                          onClick={() => handleCopy(assistant.slug, assistant.id)}
                          className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                            bg-gray-100 text-gray-700 hover:bg-gray-200
                            dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
                        >
                          {copiedId === assistant.id
                            ? <Check className="w-4 h-4 mr-2 text-green-500" />
                            : <Copy className="w-4 h-4 mr-2" />}
                          Copiar Link
                        </button>
                      )}
                      {assistant.is_public && (
                        <button
                          onClick={() => setShowQrModal(assistant)}
                          className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                            bg-gray-100 text-gray-700 hover:bg-gray-200
                            dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR Code
                        </button>
                      )}
                      <Link
                        href={`/dashboard/google-connect?companyId=${assistant.id}`}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                          bg-red-50 text-red-600 hover:bg-red-100
                          dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Serviços Google
                      </Link>
                      <Link
                        href={`/dashboard/atendimentos?companyId=${assistant.id}`}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                          bg-green-50 text-green-600 hover:bg-green-100
                          dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 border border-green-100 dark:border-green-500/20"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Whatsapp / Instagram / Facebook
                      </Link>
                    </div>

                    {/* Linha 2 */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                      <Link
                        href={`/dashboard/cadastros?companyId=${assistant.id}`}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                          bg-purple-50 text-purple-600 hover:bg-purple-100
                          dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 border border-purple-100 dark:border-purple-500/20"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Usuários / Totens
                      </Link>
                      <Link
                        href={`/dashboard/functions?companyId=${assistant.id}`}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                          bg-blue-50 text-blue-600 hover:bg-blue-100
                          dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20 border border-blue-100 dark:border-blue-500/20"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Funções
                      </Link>
                      <Link
                        href={`/dashboard/assistentes/${assistant.id}`}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all
                          bg-gray-100 text-gray-700 hover:bg-gray-200
                          dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </Link>

                      <a
                        href={
                          assistant.is_public
                            ? `https://minhai.app/ia/${assistant.slug}`
                            : `https://minhai.app/ia/private/${assistant.private_slug || assistant.id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                        >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir
                      </a>
                    </div>
                  </div>
                </div>

                {/* ── Indicador WebApp ── */}
                <WebAppIndicator
                  assistant={assistant}
                  isActive={isWebappActive}
                  webappUrl={webappUrl}
                  hasConsultingPlan={hasConsultingPlan}
                  activeWebappCompanyId={activeWebappCompanyId}
                />
              </div>
            );
          })}

          {companies.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed rounded-2xl
              border-gray-200 bg-white/50 dark:border-white/10 dark:bg-white/5 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gray-100 dark:bg-white/10">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhum assistente encontrado</p>
              <p className="text-gray-500 dark:text-white/40">Crie seu primeiro assistente para começar.</p>
            </div>
          )}
        </div>

        {/* Modal de QR Code — igual ao original */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-white/10 relative">
              <button
                onClick={() => setShowQrModal(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">QR Code do Assistente</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{showQrModal.name}</p>
                <div className="bg-white p-4 rounded-xl inline-block mb-6 border border-gray-100 shadow-inner">
                  <img
                    src={generateQrUrl(showQrModal.slug, showQrModal.is_public, showQrModal.private_slug, showQrModal.id)}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Aponte a câmera para o código para abrir o assistente.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQrModal(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm"
                  >
                    Fechar
                  </button>

                  <a
                    href={generateQrUrl(showQrModal.slug, showQrModal.is_public, showQrModal.private_slug, showQrModal.id)}
                    download={`qrcode-${showQrModal.slug}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Sub-componente: indicador de WebApp no rodapé do card
───────────────────────────────────────────────────────── */
function WebAppIndicator({
  assistant,
  isActive,
  webappUrl,
  hasConsultingPlan,
  activeWebappCompanyId,
}: {
  assistant: any;
  isActive: boolean;
  webappUrl: string | null;
  hasConsultingPlan: boolean;
  activeWebappCompanyId: string | null;
}) {
  // ── Estado 1: WebApp ativo neste assistente ──────────────
  if (isActive && webappUrl) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
            bg-green-100 text-green-700 border border-green-200
            dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            WebApp ativo
          </span>

          <a
            href={webappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[240px]"
          >
            {webappUrl.replace('https://', '')}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={webappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              bg-gray-100 text-gray-600 hover:bg-gray-200
              dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </div>
      </div>
    );
  }

  // ── Estado 2: tem plano Consulting, mas outro assistente tem o webapp
  //    (apenas 1 webapp por conta — informar qual está ativo)
  if (hasConsultingPlan && activeWebappCompanyId && activeWebappCompanyId !== assistant.id) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-white/30 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5" />
          Outro assistente usa o WebApp desta conta
        </span>
      </div>
    );
  }

  // ── Estado 3: tem plano Consulting, nenhum webapp ativo ainda ──
  if (hasConsultingPlan && !activeWebappCompanyId) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
            bg-amber-100 text-amber-700 border border-amber-200
            dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            <Sparkles className="w-3 h-3" />
            WebApp disponível
          </span>
          <span className="text-xs text-gray-500 dark:text-white/40">
            Ative seu subdomínio próprio
          </span>
        </div>
        <Link
          href={`/dashboard/webapp?companyId=${assistant.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
            bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200
            dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Configurar WebApp
        </Link>
      </div>
    );
  }

  // ── Estado 4: sem plano Consulting — upsell sutil ──────────
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
          bg-gray-100 text-gray-500 border border-gray-200
          dark:bg-white/5 dark:text-white/30 dark:border-white/5">
          <Lock className="w-3 h-3" />
          WebApp — Plano Consulting
        </span>
        <span className="text-xs text-gray-400 dark:text-white/30 hidden sm:block">
          Subdomínio próprio + PWA instalável
        </span>
      </div>
      <Link
        href="/dashboard/credits"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
          bg-gray-100 text-gray-600 hover:bg-gray-200
          dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
      >
        Ver planos
      </Link>
    </div>
  );
}
