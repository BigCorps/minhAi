'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeDollarSign,
  Bot,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Puzzle,
  Sparkles,
  UserRoundCog,
  X,
} from 'lucide-react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAssistant } from '@/contexts/AssistantContext';
import { FUNCIONARIA_MODULES, type FuncionarIAState } from '@/lib/funcionaria-skills';
import { clearFuncionarIAOnboardingDraft } from '@/lib/funcionaria-onboarding-draft';

const EMPTY_STATE: FuncionarIAState = {
  company: null,
  settings: null,
  skills: [],
  active_skill_keys: [],
  selected_skill_keys: [],
  active_modules: [],
  quote: { skill_count: 0, subtotal_cents: 0, discount_percent: 0, discount_cents: 0, total_cents: 0, items: [] },
};

type ContextValue = {
  state: FuncionarIAState;
  loading: boolean;
  reload: () => Promise<void>;
};

const FuncionarIAStateContext = createContext<ContextValue>({ state: EMPTY_STATE, loading: true, reload: async () => {} });
export const useFuncionarIAState = () => useContext(FuncionarIAStateContext);

const permanent = [
  { href: '/dashboard', label: 'Minha FuncionarIA', icon: Bot },
  { href: '/dashboard/habilidades', label: 'Habilidades', icon: Puzzle },
  { href: '/dashboard/conta', label: 'Conta e Créditos', icon: CircleDollarSign },
];

const moduleIcon: Record<string, typeof LayoutDashboard> = {
  atendimentos: UserRoundCog,
  fila: LayoutDashboard,
  agenda: LayoutDashboard,
  produtos: LayoutDashboard,
  pedidos: LayoutDashboard,
  caixa: BadgeDollarSign,
  recebimentos: CircleDollarSign,
  canais: LayoutDashboard,
  whatsapp: LayoutDashboard,
  mercado_livre: LayoutDashboard,
  fiscal: LayoutDashboard,
};

export default function FuncionarIADashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const { selectedAssistantId, selectedAssistantName, availableAssistants, setSelectedAssistant, loadingAssistants } = useAssistant();
  const [state, setState] = useState<FuncionarIAState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  async function reload() {
    if (!selectedAssistantId) {
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await supabase.rpc('funcionaria_bootstrap_company', { p_company_id: selectedAssistantId });
      const { data, error } = await supabase.rpc('funcionaria_get_state', { p_company_id: selectedAssistantId });
      if (error) throw error;
      setState((data || EMPTY_STATE) as FuncionarIAState);
    } catch (error) {
      console.error('FuncionarIA dashboard:', error);
      setState(EMPTY_STATE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, [selectedAssistantId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function startNewFuncionarIA() {
    setCompanyOpen(false);

    // "Nova FuncionarIA" é um comando explícito de criação: descarta somente
    // um rascunho antigo e não altera a empresa atualmente selecionada.
    // A empresa atual continua intacta até o onboarding terminar; no finish,
    // o próprio fluxo seleciona automaticamente a nova empresa criada.
    await clearFuncionarIAOnboardingDraft();
    router.push('/onboarding?new=1');
  }

  const dynamicItems = state.active_modules
    .filter(key => FUNCIONARIA_MODULES[key])
    .map(key => ({
      href: `/dashboard/${key}`,
      label: FUNCIONARIA_MODULES[key].label,
      icon: moduleIcon[key] || LayoutDashboard,
    }));

  const navItems = [...permanent, ...dynamicItems];

  const nav = (
    <nav className="space-y-1.5">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-extrabold transition ${
              active ? 'bg-[#6D28D9] text-white shadow-lg shadow-violet-900/15' : 'text-slate-600 hover:bg-violet-50 hover:text-[#6D28D9]'
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <FuncionarIAStateContext.Provider value={{ state, loading, reload }}>
      <div className="min-h-screen bg-[#F7F7FB] text-slate-950">
        <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-violet-100 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMenuOpen(true)} className="rounded-xl p-2 text-slate-700 hover:bg-violet-50 lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">
                  {state.company?.logo_url ? (
                    <img src={state.company.logo_url} alt={state.company.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-sm font-black text-[#6D28D9]">{String(selectedAssistantName || 'F').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="max-w-[260px] truncate text-sm font-black text-slate-900">{selectedAssistantName || 'Minha empresa'}</div>
                  <div className="text-[10px] font-bold text-slate-400">painel da FuncionarIA</div>
                </div>
              </Link>
            </div>

            <div className="relative flex items-center gap-2">
              <button type="button" onClick={() => setCompanyOpen(v => !v)} className="flex max-w-[230px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-extrabold text-slate-700 hover:border-violet-200">
                <span className="truncate">{selectedAssistantName || (loadingAssistants ? 'Carregando…' : 'Escolher empresa')}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              {companyOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  {availableAssistants.map(company => (
                    <button key={company.id} type="button" onClick={() => { setSelectedAssistant(company.id, company.name); setCompanyOpen(false); }} className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold ${company.id === selectedAssistantId ? 'bg-violet-50 text-[#6D28D9]' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {company.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => void startNewFuncionarIA()} className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-slate-100 px-3 py-2.5 text-left text-sm font-black text-[#6D28D9]">
                    <Sparkles className="h-4 w-4" /> Nova FuncionarIA
                  </button>
                </div>
              )}
              <Link href="/dashboard" className="hidden items-center gap-2 rounded-xl px-2 py-1.5 lg:flex" aria-label="FuncionarIA">
                <Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={36} height={36} className="h-8 w-8 object-contain" />
                <div className="hidden xl:block">
                  <div className="text-xs font-black text-slate-900">FuncionarIA</div>
                  <div className="text-[9px] font-bold text-slate-400">veste a camisa da empresa</div>
                </div>
              </Link>
              <button type="button" onClick={logout} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Sair">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <aside className="fixed bottom-0 left-0 top-16 hidden w-64 border-r border-violet-100 bg-white p-4 lg:block">
          {nav}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-violet-50 to-lime-50 p-4">
            <div className="text-xs font-black text-[#6D28D9]">Quer que ela faça mais?</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Adicione uma habilidade e o novo módulo aparece aqui automaticamente.</p>
            <Link href="/dashboard/habilidades" className="mt-3 inline-flex text-xs font-black text-[#6D28D9]">Ver habilidades →</Link>
          </div>
        </aside>

        {menuOpen && (
          <>
            <button type="button" className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
            <aside className="fixed bottom-0 left-0 top-0 z-[60] w-[280px] bg-white p-4 shadow-2xl lg:hidden">
              <div className="mb-5 flex items-center justify-between">
                <Image src="/brands/funcionaria/logo.png" alt="FuncionarIA" width={46} height={46} className="h-11 w-11 object-contain" />
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              {nav}
            </aside>
          </>
        )}

        <main className="min-h-screen pt-16 lg:pl-64">
          <div className="mx-auto w-full max-w-[1360px] p-4 sm:p-6 lg:p-8">
            {!loading && !selectedAssistantId ? (
              <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto h-10 w-10 text-[#6D28D9]" />
                <h1 className="mt-4 text-2xl font-black">Crie sua primeira FuncionarIA</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">A base é grátis. Você escolhe as habilidades e só vê no painel o que realmente contratou.</p>
                <Link href="/onboarding?new=1" className="mt-6 inline-flex rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-black text-white">Começar grátis</Link>
              </div>
            ) : children}
          </div>
        </main>
      </div>
    </FuncionarIAStateContext.Provider>
  );
}
