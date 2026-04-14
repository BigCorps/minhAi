// components/dashboard/LinkNaBioModalWrapper.tsx
// Client component: engrenagem | toggle | ícone de abrir link
'use client';

import { useState } from 'react';
import ModoToggle from './ModoToggle';
import dynamic from 'next/dynamic';

const LinkNaBioModal = dynamic(
  () => import('./LinkNaBioModal'),
  { ssr: false }
);

interface Props {
  companyId: string;
  slug: string;
  initialEnabled: boolean;
}

export default function LinkNaBioModalWrapper({ companyId, slug, initialEnabled }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);

  const btnClass = `
    flex-shrink-0 p-2 rounded-lg border border-gray-200 dark:border-white/10
    bg-white dark:bg-slate-900
    text-gray-500 dark:text-white/50
    hover:text-violet-600 dark:hover:text-violet-400
    hover:border-violet-300 dark:hover:border-violet-500/40
    transition-colors
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Engrenagem → abre modal */}
        <button
          onClick={() => setShowModal(true)}
          className={btnClass}
          title="Gerenciar links"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Toggle ativar/desativar */}
        <ModoToggle
          companyId={companyId}
          modoType="link"
          initialEnabled={initialEnabled}
          onToggle={setEnabled}
        />

        {/* Ícone de abrir página (só visível quando ativo) */}
        {enabled && (
          <a
            href={`/link/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
            title="Ver página de links"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {showModal && (
        <LinkNaBioModal
          companyId={companyId}
          slug={slug}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
