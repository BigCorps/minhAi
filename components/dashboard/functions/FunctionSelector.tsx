// components/dashboard/functions/FunctionSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronDown, Bot } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface FunctionSelectorProps {
  onCompanySelect: (companyId: string) => void;
  selectedCompanyId?: string;
  theme?: 'dark' | 'light';
}

export default function FunctionSelector({
  onCompanySelect,
  selectedCompanyId,
  theme = 'dark'
}: FunctionSelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // --- Fonte 1: company_admins ---
      const { data: adminRelations } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      const adminCompanyIds = (adminRelations || []).map(r => r.company_id);

      // --- Fonte 2: companies.user_id (cobre empresas criadas antes de company_admins) ---
      const { data: ownedCompanies } = await supabase
        .from('companies')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .order('name');

      const ownedIds = (ownedCompanies || []).map(c => c.id);

      // Une os dois conjuntos de IDs sem duplicatas
      const allIds = Array.from(new Set([...adminCompanyIds, ...ownedIds]));

      if (allIds.length === 0) {
        setCompanies([]);
        return;
      }

      // Se a busca por user_id já trouxe todas, evita query extra
      const missingIds = adminCompanyIds.filter(id => !ownedIds.includes(id));

      let allCompanies: Company[] = ownedCompanies || [];

      // Busca as empresas que estão em company_admins mas não em companies.user_id
      if (missingIds.length > 0) {
        const { data: adminOnlyCompanies } = await supabase
          .from('companies')
          .select('id, name, slug')
          .in('id', missingIds);

        allCompanies = [
          ...allCompanies,
          ...(adminOnlyCompanies || [])
        ].sort((a, b) => a.name.localeCompare(b.name));
      }

      setCompanies(allCompanies);

      // Seleciona automaticamente apenas quando há exatamente 1 assistente
      if (!selectedCompanyId && allCompanies.length === 1) {
        onCompanySelect(allCompanies[0].id);
      }

    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  
  if (loading) {
    return (
      <div className={`animate-pulse h-12 rounded-lg ${
        theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'
      }`} style={{ width: '300px' }} />
    );
  }
  
  if (companies.length === 0) {
    return (
      <div className={`px-4 py-3 rounded-lg border ${
        theme === 'dark'
          ? 'bg-yellow-900/20 border-yellow-800 text-yellow-200'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <p className="text-sm">
          Você não tem nenhum assistente criado.{' '}
          <a href="/dashboard/empresas/nova" className="underline font-semibold">
            Criar agora
          </a>
        </p>
      </div>
    );
  }
  
  // Caso de empresa única: renderiza display estático,
  // mas agora o useEffect já chamou onCompanySelect acima.
  if (companies.length === 1) {
    return (
      <div className={`px-4 py-3 rounded-lg border ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700 text-white'
          : 'bg-white border-gray-300 text-gray-900'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <Bot className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{companies[0].name}</p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Assistente selecionado
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-lg border flex items-center justify-between transition-all ${
          theme === 'dark'
            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        }`}
        style={{ minWidth: '300px' }}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <Bot className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">
              {selectedCompany?.name || 'Selecione um assistente'}
            </p>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {companies.length} {companies.length === 1 ? 'assistente' : 'assistentes'}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-xl z-20 overflow-hidden ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-300'
          }`}>
            <div className="max-h-80 overflow-y-auto">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    onCompanySelect(company.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                    company.id === selectedCompanyId
                      ? theme === 'dark'
                        ? 'bg-blue-500/20 text-white'
                        : 'bg-blue-50 text-blue-900'
                      : theme === 'dark'
                        ? 'hover:bg-slate-700 text-white'
                        : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    company.id === selectedCompanyId
                      ? 'bg-blue-500/30'
                      : theme === 'dark'
                        ? 'bg-slate-700'
                        : 'bg-gray-100'
                  }`}>
                    <Bot className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{company.name}</p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      /{company.slug}
                    </p>
                  </div>
                  {company.id === selectedCompanyId && (
                    <div className="text-blue-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}