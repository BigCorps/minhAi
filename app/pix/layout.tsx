import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import PixWikiBrandFooter from '@/components/pix/PixWikiBrandFooter';
import { SEO, pixGraph, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const BASE = SEO.pix.baseUrl;
const TITLE = SEO.pix.title;
const DESCRIPTION = SEO.pix.description;

function isLandingPath(raw: string | null): boolean {
  const path = raw && raw.startsWith('/') ? raw : '/';
  return path === '/' || path === '/pix' || path === '/pix/';
}

function isPixApex(host: string): boolean {
  const clean = host.split(':')[0].toLowerCase();
  return clean === 'pix.wiki' || clean === 'www.pix.wiki';
}

function isPixWikiHost(host: string): boolean {
  const clean = host.split(':')[0].toLowerCase();
  return clean === 'pix.wiki' || clean === 'www.pix.wiki' || clean.endsWith('.pix.wiki');
}

function pixMetadata(indexable: boolean): Metadata {
  return {
    metadataBase: new URL(BASE),
    applicationName: 'PixWiki',
    title: TITLE,
    description: DESCRIPTION,
    category: 'finance',
    alternates: { canonical: BASE },
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      url: BASE,
      siteName: 'PixWiki',
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: SEO.pix.ogImage, width: 1200, height: 630, alt: SEO.pix.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [SEO.pix.ogImage],
    },
    icons: {
      icon: SEO.pix.favicon,
      apple: SEO.pix.appleIcon,
    },
    manifest: '/manifest.webmanifest',
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));

  if (isPixApex(host)) return pixMetadata(landing);

  const { brand } = resolveSeo(host);
  if (brand === 'pix') return pixMetadata(false);

  return {
    ...pixMetadata(false),
    manifest: undefined,
    alternates: { canonical: BASE },
  };
}

export default async function PixLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const landing = isPixApex(host) && isLandingPath(headersList.get('x-pathname'));
  const pixWikiHost = isPixWikiHost(host);

  return (
    <>
      {landing && <JsonLd data={pixGraph()} />}

      {pixWikiHost && (
        <style>{`
          footer:not([data-pixwiki-brand-footer]) {
            display: none !important;
          }
        `}</style>
      )}

      {children}

      {pixWikiHost && <PixWikiBrandFooter />}
    </>
  );
}
