// components/analytics/ClarityInit.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Clarity from '@microsoft/clarity';

// O Clarity grava movimento, interação e conteúdo visual da página.
// MelhorIA autenticada e Admin são áreas deliberadamente excluídas.
const MELHORIA_HOSTS = ['melhoria.org', 'www.melhoria.org'];
const ADMIN_HOSTS = ['admin.minhai.app'];

function podeGravar(pathname: string): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.toLowerCase();

  // O painel administrativo contém e-mails, métricas internas e informações
  // operacionais. Nenhuma sessão do Admin é enviada ao Clarity.
  if (ADMIN_HOSTS.includes(host)) {
    return false;
  }

  const ehHostMelhoria = MELHORIA_HOSTS.includes(host);
  const ehCaminhoMelhoria =
    pathname === '/melhoria' || pathname.startsWith('/melhoria/');

  // Outras marcas continuam com a política que já existia.
  if (!ehHostMelhoria && !ehCaminhoMelhoria) return true;

  // Na MelhorIA, somente a landing pública pode ser gravada.
  return (
    pathname === '/' ||
    pathname === '/melhoria' ||
    pathname === '/melhoria/'
  );
}

export default function ClarityInit() {
  const pathname = usePathname();

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (typeof window === 'undefined' || !projectId) return;

    if (!podeGravar(pathname)) {
      try {
        Clarity.consentV2({
          ad_Storage: 'denied',
          analytics_Storage: 'denied',
        });
      } catch {
        // Clarity ainda não inicializado.
      }
      return;
    }

    Clarity.init(projectId);
  }, [pathname]);

  return null;
}
