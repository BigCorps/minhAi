'use client';

// components/analytics/TrackedLink.tsx
// Link do Next.js que dispara um evento no Clarity ao ser clicado.
// Existe como componente próprio (client) pra permitir usar em Server
// Components (como InicioSection.tsx) sem precisar converter o arquivo
// inteiro pra 'use client' só por causa de um onClick.

import Link from 'next/link';
import Clarity from '@microsoft/clarity';
import { ReactNode } from 'react';

interface TrackedLinkProps {
  href: string;
  /** Nome do evento disparado no Clarity (ex: 'clique_demonstracao_ao_vivo_inicio') */
  event: string;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
}

export default function TrackedLink({ href, event, className, children, target, rel }: TrackedLinkProps) {
  const handleClick = () => {
    try {
      Clarity.event(event);
    } catch {
      // Clarity pode não estar inicializado ainda — falha silenciosa
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick} target={target} rel={rel}>
      {children}
    </Link>
  );
}