'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PIXWIKI_PLAY_URL =
  'https://play.google.com/store/apps/details?id=wiki.pix.twa';

const GREEN_DASHBOARD_LINK_CLASS =
  'rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70';

export default function PixWikiPlayStoreBadge() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let styledLink: HTMLAnchorElement | null = null;
    let originalClassName = '';

    const locateHeaderActions = () => {
      const dashboardLink = document.querySelector<HTMLAnchorElement>(
        'header a[href="/dashboard"]',
      );
      const actions = dashboardLink?.parentElement ?? null;

      if (!disposed && actions) {
        setTarget(actions);
      }

      if (dashboardLink && dashboardLink !== styledLink) {
        if (styledLink && originalClassName) {
          styledLink.className = originalClassName;
        }

        styledLink = dashboardLink;
        originalClassName = dashboardLink.className;
        dashboardLink.className = GREEN_DASHBOARD_LINK_CLASS;
      }
    };

    locateHeaderActions();

    const observer = new MutationObserver(locateHeaderActions);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      disposed = true;
      observer.disconnect();

      if (styledLink && originalClassName) {
        styledLink.className = originalClassName;
      }
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <a
      href={PIXWIKI_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Baixar PixWiki no Google Play"
      title="Disponível no Google Play"
      className="order-first inline-flex shrink-0 items-center justify-center rounded-md transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
    >
      <Image
        src="/cards/play.png"
        alt="Disponível no Google Play"
        width={1760}
        height={134}
        sizes="(max-width: 639px) 62px, 108px"
        className="h-auto w-[62px] max-w-none sm:w-[108px]"
        priority
      />
    </a>,
    target,
  );
}
