'use client';

import { useEffect } from 'react';
import { ANALYTICS_CONSENT_CHANGED_EVENT } from '@/lib/meta-pixel';
import { ensureMelhoriaMetaPixel } from '@/lib/meta-pixel-melhoria';

export default function MelhoriaMetaPixel() {
  useEffect(() => {
    ensureMelhoriaMetaPixel();

    const onConsentChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ granted?: boolean }>;
      if (customEvent.detail?.granted) ensureMelhoriaMetaPixel();
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  return null;
}
