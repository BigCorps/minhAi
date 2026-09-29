'use client';

import { useEffect } from 'react';
import { ANALYTICS_CONSENT_CHANGED_EVENT } from '@/lib/meta-pixel';
import { ensureMidiaMetaPixel } from '@/lib/meta-pixel-midia';

export default function MidiaMetaPixel() {
  useEffect(() => {
    ensureMidiaMetaPixel();

    const onConsentChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ granted?: boolean }>;
      if (customEvent.detail?.granted) ensureMidiaMetaPixel();
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  return null;
}
