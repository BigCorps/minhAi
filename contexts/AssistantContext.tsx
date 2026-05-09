// contexts/AssistantContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Assistant {
  id: string;
  name: string;
  slug: string;
  assistant_type?: string;
}

interface AssistantContextType {
  selectedAssistantId: string | null;
  selectedAssistantName: string | null;
  setSelectedAssistant: (id: string | null, name: string | null) => void;
  loadingAssistants: boolean;
  availableAssistants: Assistant[];
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [selectedAssistantName, setSelectedAssistantName] = useState<string | null>(null);
  const [loadingAssistants, setLoadingAssistants] = useState(true);
  const [availableAssistants, setAvailableAssistants] = useState<Assistant[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadAssistants() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fonte 1: company_admins
        const { data: adminRelations } = await supabase
          .from('company_admins')
          .select('company_id')
          .eq('user_id', user.id);
        const adminCompanyIds = (adminRelations || []).map(r => r.company_id);

        // Fonte 2: companies.user_id
        const { data: ownedCompanies } = await supabase
            .from('companies')
            .select('id, name, slug, assistant_type')
            .eq('user_id', user.id)
            .order('name');
        const ownedIds = (ownedCompanies || []).map(c => c.id);

        let allCompanies: Assistant[] = ownedCompanies || [];

        // Busca empresas que estão em company_admins mas não em companies.user_id
        const missingIds = adminCompanyIds.filter(id => !ownedIds.includes(id));
        if (missingIds.length > 0) {
          const { data: adminOnlyCompanies } = await supabase
            .from('companies')
            .select('id, name, slug, assistant_type')
            .in('id', missingIds);
          allCompanies = [
            ...allCompanies,
            ...(adminOnlyCompanies || [])
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        setAvailableAssistants(allCompanies);

        // Tenta restaurar seleção do localStorage
        const storedId   = localStorage.getItem('selectedAssistantId');
        const storedName = localStorage.getItem('selectedAssistantName');

        if (storedId && storedName && allCompanies.some(a => a.id === storedId)) {
          setSelectedAssistantId(storedId);
          setSelectedAssistantName(storedName);
        } else if (allCompanies.length > 0) {
          // Seleciona o primeiro automaticamente
          setSelectedAssistantId(allCompanies[0].id);
          setSelectedAssistantName(allCompanies[0].name);
          localStorage.setItem('selectedAssistantId', allCompanies[0].id);
          localStorage.setItem('selectedAssistantName', allCompanies[0].name);
        }
      } catch (error) {
        console.error('Erro ao carregar assistentes:', error);
      } finally {
        setLoadingAssistants(false);
      }
    }

    loadAssistants();
  }, []);

  function setSelectedAssistant(id: string | null, name: string | null) {
    setSelectedAssistantId(id);
    setSelectedAssistantName(name);
    if (id && name) {
      localStorage.setItem('selectedAssistantId', id);
      localStorage.setItem('selectedAssistantName', name);
    } else {
      localStorage.removeItem('selectedAssistantId');
      localStorage.removeItem('selectedAssistantName');
    }
  }

  return (
    <AssistantContext.Provider value={{
      selectedAssistantId,
      selectedAssistantName,
      setSelectedAssistant,
      loadingAssistants,
      availableAssistants,
    }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant deve ser usado dentro de um AssistantProvider');
  }
  return context;
}
