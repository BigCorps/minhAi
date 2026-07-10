// components/analytics/ClarityInit.tsx
'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

export default function ClarityInit() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (typeof window !== 'undefined' && projectId) {
      Clarity.init(projectId);
    }
  }, []);

  return null;
}