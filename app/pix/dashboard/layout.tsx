'use client';

import type { ReactNode } from 'react';
import PixWikiFastWatch from '@/components/pix/PixWikiFastWatch';

export default function PixWikiDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PixWikiFastWatch />
      {children}
    </>
  );
}
