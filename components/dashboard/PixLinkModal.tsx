// components/dashboard/PixLinkModal.tsx
'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PixLinkContent from './PixLinkContent';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  companies: Company[];
  onClose: () => void;
}

export default function PixLinkModal({ companies, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-[460px] rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10">
        
        {/* Botão fechar */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <PixLinkContent companies={companies} />
        </div>
      </div>
    </div>,
    document.body
  );
}