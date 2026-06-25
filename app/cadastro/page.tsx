'use client';

// app/cadastro/page.tsx
//
// Passo 4 do funil /lead (entrada). Único propósito: capturar o
// token da demo (?demo=<token>) e persistir em sessionStorage —
// que sobrevive ao possível desvio de login (usuário pode não estar
// logado ainda, e a navegação real até /dashboard/assistentes/create
// passa pelo SetupBanner.tsx no dashboard, que hoje faz só
// router.push('/dashboard/assistentes/create') sem query string).
//
// Decisão confirmada: não tentamos propagar via URL através do login
// (mais simples manter no sessionStorage, lido por
// app/dashboard/assistentes/create/page.tsx quando a pessoa chegar lá,
// de qualquer caminho que for).
//
// Se a pessoa já estiver logada, o middleware/layout do dashboard
// deve permitir acesso direto; se não, presumimos que será
// redirecionada para login normalmente pelo fluxo de auth já
// existente — não adicionamos lógica de redirecionamento de login
// aqui (decisão confirmada: login sempre vai para /dashboard).

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEMO_TOKEN_STORAGE_KEY = 'minhai:demo_token';

export default function CadastroPage() {
  return (
    <Suspense fallback={<CadastroPageFallback />}>
      <CadastroPageInner />
    </Suspense>
  );
}

function CadastroPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
  );
}

function CadastroPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('demo');
    if (token) {
      try {
        sessionStorage.setItem(DEMO_TOKEN_STORAGE_KEY, token);
      } catch {
        // sessionStorage pode falhar em modo privado restrito — não é
        // crítico, o pior caso é só não ter o pré-preenchimento.
      }
    }
    router.replace('/dashboard');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <p className="text-white/50 text-sm">Redirecionando...</p>
    </div>
  );
}