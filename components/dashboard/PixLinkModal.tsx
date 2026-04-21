'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { X, Copy, Check, ExternalLink, Link, ChevronDown } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  onClose: () => void;
  isDark?: boolean; // mantido por compatibilidade, mas o tema é controlado pelo Tailwind
}

export default function PixLinkModal({ onClose }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [valor, setValor] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCompanies();
  }, []);

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadCompanies() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');
    if (data?.length) {
      setCompanies(data);
      setSelectedCompany(data[0]);
    }
  }

  const baseUrl = selectedCompany
    ? `https://minhai.app/pix/${selectedCompany.slug}`
    : '';
  const fullUrl = valor && parseFloat(valor) > 0
    ? `${baseUrl}/${valor}`
    : baseUrl;

  function copy() {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-[460px] rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Link PIX
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Gere um PIX com ou sem o valor para compartilhar facilmente e já confirmar o pagamento via email e no dashboard
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

        <div className="p-6 space-y-5">

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

          {/* Valor opcional */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
              Valor <span className="normal-case font-normal text-gray-400 dark:text-slate-500">(opcional)</span>
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
                placeholder="Deixe vazio para o cliente digitar"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* URL gerada */}
          {fullUrl && (
            <div className="rounded-xl p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                Link gerado
              </p>
              <p className="text-sm font-mono text-blue-700 dark:text-blue-300 break-all leading-relaxed">
                {fullUrl}
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={copy}
              disabled={!fullUrl}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                copied
                  ? 'bg-green-500 dark:bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
              }`}
            >
              {copied
                ? <><Check className="w-4 h-4" /> Copiado!</>
                : <><Copy className="w-4 h-4" /> Copiar Link</>
              }
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
