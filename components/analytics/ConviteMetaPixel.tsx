'use client';

import { useEffect } from 'react';
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ensureConviteIAMetaPixel,
} from '@/lib/meta-pixel';

export default function ConviteMetaPixel() {
  useEffect(() => {
    ensureConviteIAMetaPixel();

    const onConsentChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ granted?: boolean }>;
      if (customEvent.detail?.granted) ensureConviteIAMetaPixel();
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onConsentChanged);
    };
  }, []);

  return null;
}
