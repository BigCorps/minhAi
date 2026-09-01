'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { useAssistant } from '@/contexts/AssistantContext';
import { createClient } from '@/lib/supabase-browser';

interface Props {
  title: string;
  subtitle?: string;
  showHome?: boolean;
}

export default function FuncionarIAHeader({ title, subtitle, showHome = true }: Props) {
  const router = useRouter();
  const {
    selectedAssistantId,
    selectedAssistantName,
    setSelectedAssistant,
    loadingAssistants,
    availableAssistants,
  } = useAssistant();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-violet-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {showHome ? (
            <Link href="/" className="shrink-0 rounded-2xl transition hover:scale-[1.02]" aria-label="Voltar para o início">
              <Image
                src="/brands/funcionaria/logo.png"
                alt="FuncionarIA"
                width={56}
                height={56}
                className="h-12 w-12 object-contain"
                priority
              />
            </Link>
          ) : (
            <Image
              src="/brands/funcionaria/logo.png"
              alt="FuncionarIA"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain"
              priority
            />
          )}

          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6D28D9]">
              FuncionarIA
            </p>
            <h1 className="truncate text-xl font-black text-slate-950">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Building2 className="h-4 w-4 shrink-0 text-[#6D28D9]" />
            <select
              value={selectedAssistantId || ''}
              disabled={loadingAssistants || availableAssistants.length === 0}
              onChange={(event) => {
                const empresa = availableAssistants.find((item) => item.id === event.target.value);
                setSelectedAssistant(empresa?.id || null, empresa?.name || null);
              }}
              className="min-w-0 max-w-[260px] bg-transparent text-sm font-bold text-slate-700 outline-none disabled:opacity-60"
              aria-label="Empresa selecionada"
            >
              {availableAssistants.length === 0 && <option value="">Nenhuma empresa</option>}
              {availableAssistants.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={sair}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {selectedAssistantName && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:hidden">
          <p className="truncate text-xs text-slate-400">Empresa ativa: {selectedAssistantName}</p>
        </div>
      )}
    </header>
  );
}
