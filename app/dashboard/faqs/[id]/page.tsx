// app/dashboard/faqs/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FAQManagerClient } from '@/components/FAQManager';

interface Company {
  id: string;
  name: string;
  user_id: string | null;
}

export default function CompanyFAQsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { resolvedTheme } = useTheme();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router, supabase]);

  // Carregar empresa e verificar acesso
  useEffect(() => {
    const loadCompany = async () => {
      if (!user || !companyId) return;

      try {
        // Buscar empresa
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          console.error('Empresa não encontrada:', companyError);
          router.push('/dashboard/faqs');
          return;
        }

        setCompany(companyData);

        // Verificar acesso via company_admins
        const { data: adminAccess } = await supabase
          .from('company_admins')
          .select('*')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .single();

        // Verificar se é dono direto
        const hasDirectOwnership = companyData.user_id === user.id;
        const hasAdminAccess = !!adminAccess;

        if (!hasAdminAccess && !hasDirectOwnership) {
          console.error('Acesso negado');
          router.push('/dashboard/faqs');
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        router.push('/dashboard/faqs');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [user, companyId, router, supabase]);

  if (!mounted || loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-slate-800/50"></div>
        <div className="h-96 rounded-2xl bg-gray-200 dark:bg-slate-800/50"></div>
      </div>
    );
  }

  if (!hasAccess || !company) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-8">
      {/* Header com Info da Empresa */}
      <div className={`rounded-3xl shadow-lg p-8 border transition-all ${
        isDark
          ? 'bg-slate-900/40 border-white/10 backdrop-blur-xl'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col gap-6">
          <Link
            href="/dashboard/faqs"
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors w-fit ${
              isDark
                ? 'text-green-400 hover:text-green-300'
                : 'text-green-600 hover:text-green-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para lista
          </Link>

          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {company.name}
            </h1>
            <p className={`text-lg ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              Configure perguntas frequentes e suas respostas automáticas
            </p>
          </div>
        </div>
      </div>

      {/* Componente de Gerenciamento de FAQs */}
      <FAQManagerClient companyId={companyId} isDark={isDark} />
    </div>
  );
}