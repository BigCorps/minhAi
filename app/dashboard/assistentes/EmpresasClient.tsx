// app/dashboard/assistentes/EmpresasClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

interface EmpresasClientProps {
  companies: any[];
  user: any;
}

export default function EmpresasClient({ companies, user }: EmpresasClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <DashboardHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assistentes</h1>
            <p className="text-white/60">Gerencie seus assistentes virtuais e configurações</p>
          </div>
          <Link
            href="/dashboard/assistentes/novo"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            + Novo Assistente
          </Link>
        </div>

        {/* Barra de Busca */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar assistente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-white/30"
            />
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="bg-slate-800/50 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <CopyLinkButton slug={company.id} />
                </div>
              </div>

              <h3 className="text-xl font-bold mb-1">{company.name}</h3>
              <p className="text-sm text-white/40 mb-6 line-clamp-1">
                ID: {company.id}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/dashboard/assistentes/${company.id}`}
                  className="flex items-center justify-center px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  ⚙️ Configurar
                </Link>
                <Link
                  href={`/dashboard/assistentes/${company.id}/chat`}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                >
                  💬 Testar Chat
                </Link>
              </div>
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-800/30 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/40">Nenhum assistente encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
