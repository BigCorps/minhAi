'use client';

import { useEffect } from 'react';
import { ANALYTICS_CONSENT_CHANGED_EVENT } from '@/lib/meta-pixel';
import { ensureBigCorpsMetaPixel } from '@/lib/meta-pixel-bigcorps';

export default function BigCorpsMetaPixel() {
  useEffect(() => {
    ensureBigCorpsMetaPixel();

    const onConsentChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ granted?: boolean }>;
      if (customEvent.detail?.granted) ensureBigCorpsMetaPixel();
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  return null;
}
