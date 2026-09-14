'use client';

import { useState } from 'react';
import PreAtendimentoTab from '@/components/dashboard/PreAtendimentoTab';
import EditarPreAtendimentoModal from '@/components/dashboard/EditarPreAtendimentoModal';

export default function FuncionarIAPreServicePanel({ companyId }: { companyId: string }) {
  const [editor, setEditor] = useState<{ open: boolean; formId: string | null }>({
    open: false,
    formId: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-[.16em] text-[#6D28D9]">
          Pré-atendimento & Cadastro
        </div>
        <h2 className="mt-1 text-xl font-black text-slate-950">Formulários antes do atendimento</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Esta é a mesma estrutura de pré-atendimento já usada pela minhAi, vinculada à empresa atual.
        </p>
      </div>

      <PreAtendimentoTab
        key={`${companyId}:${refreshKey}`}
        companyId={companyId}
        onOpenModal={(formId) => setEditor({ open: true, formId })}
      />

      {editor.open && (
        <EditarPreAtendimentoModal
          formId={editor.formId}
          companyId={companyId}
          onClose={() => setEditor({ open: false, formId: null })}
          onSave={() => setRefreshKey(value => value + 1)}
        />
      )}
    </section>
  );
}
