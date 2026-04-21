'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Link } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  companies: Company[];
}

export default function PixLinkContent({ companies }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [valor, setValor] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies]);

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

  return (
    <div className="space-y-5">

      {/* Header interno */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            Link PIX
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Gere um PIX com ou sem valor para compartilhar e confirmar pagamentos automaticamente
          </p>
        </div>
      </div>

      {/* Selecionar assistente */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
          Assistente
        </label>
        <select
          value={selectedCompany?.id ?? ''}
          onChange={(e) => setSelectedCompany(companies.find(c => c.id === e.target.value) ?? null)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
          }`}
        >
          {copied
            ? <><Check className="w-4 h-4" />Copiado!</>
            : <><Copy className="w-4 h-4" />Copiar Link</>}
        </button>
        <button
          onClick={() => fullUrl && window.open(fullUrl, '_blank')}
          disabled={!fullUrl}
          className="px-4 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
