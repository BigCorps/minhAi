'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FuncionarIAOnboarding from '@/components/funcionaria/FuncionarIAOnboarding';

function FuncionarIAOnboardingEntry() {
  const router = useRouter();
  const search = useSearchParams();

  const editMode = search.get('edit');
  const isEditMode = editMode === 'visual' || editMode === 'skills' || editMode === 'setup';
  const isNewMode = search.get('new') === '1';
  const invalidEditMode = !!editMode && !isEditMode;
  const missingMode = !isNewMode && !isEditMode;

  useEffect(() => {
    if (invalidEditMode || missingMode) {
      router.replace('/onboarding?new=1');
      return;
    }

    // Se alguém montar uma URL ambígua manualmente, edição vence e removemos
    // o sinal de criação para que o modo fique explícito e previsível.
    if (isNewMode && isEditMode) {
      router.replace(`/onboarding?edit=${editMode}`);
    }
  }, [editMode, invalidEditMode, isEditMode, isNewMode, missingMode, router]);

  if (invalidEditMode || missingMode || (isNewMode && isEditMode)) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] py-24 text-center text-sm font-bold text-slate-400">
        Preparando sua FuncionarIA…
      </div>
    );
  }

  return <FuncionarIAOnboarding />;
}

export default function FuncionarIAOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7FB] py-24 text-center text-sm font-bold text-slate-400">
          Carregando…
        </div>
      }
    >
      <FuncionarIAOnboardingEntry />
    </Suspense>
  );
}
