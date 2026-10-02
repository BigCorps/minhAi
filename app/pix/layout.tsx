import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import JsonLd from '@/components/JsonLd';
import PixWikiBrandFooter from '@/components/pix/PixWikiBrandFooter';
import PixWikiPlayStoreBadge from '@/components/pix/PixWikiPlayStoreBadge';

export const dynamic = 'force-dynamic';

const BASE = 'https://pix.wiki';
const TITLE = 'PixWiki — Infraestrutura Pix para empresas';
const DESCRIPTION = 'Receba Pix na sua própria conta Mercado Pago, confirme automaticamente e conecte Pix Link, Checkout, API, Webhooks e notificações. 0% de taxa PixWiki sobre o valor recebido.';

const PUBLIC_PAGES: Record<string, { title: string; description: string; index: boolean }> = {
  '/': { title: TITLE, description: DESCRIPTION, index: true },
  '/calculadora': { title: 'Calculadora Pix — compare sua taxa com a PixWiki', description: 'Compare o custo atual dos seus recebimentos Pix com o modelo de automações da PixWiki.', index: true },
  '/docs': { title: 'API V2 e Webhooks — PixWiki', description: 'Documentação pública da API PixWiki V2, Checkouts, idempotência, Webhooks e assinatura HMAC.', index: true },
  '/seguranca': { title: 'Segurança — PixWiki', description: 'Arquitetura de segurança da PixWiki: dinheiro na conta do cliente, tokens no servidor, Checkout opaco, HMAC e papéis de equipe.', index: true },
  '/aviso': { title: 'Aviso de Privacidade — PixWiki', description: 'Como a PixWiki trata dados pessoais e operacionais.', index: false },
  '/termos': { title: 'Termos de Uso — PixWiki', description: 'Termos de uso da plataforma PixWiki.', index: false },
  '/exclusao': { title: 'Exclusão de dados — PixWiki', description: 'Como solicitar a exclusão de dados da PixWiki.', index: false },
};

function cleanHost(host: string) { return host.split(':')[0].toLowerCase(); }
function visiblePath(raw: string | null) {
  let path = raw && raw.startsWith('/') ? raw : '/';
  if (path === '/pix') path = '/';
  else if (path.startsWith('/pix/')) path = path.slice(4) || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}
function isApex(host: string) { const h = cleanHost(host); return h === 'pix.wiki' || h === 'www.pix.wiki'; }
function isPixHost(host: string) { const h = cleanHost(host); return isApex(h) || h.endsWith('.pix.wiki'); }

function metadataFor(path: string, apex: boolean): Metadata {
  const pub = apex ? PUBLIC_PAGES[path] : undefined;
  const indexable = pub?.index === true;
  const canonical = pub ? `${BASE}${path === '/' ? '' : path}` : undefined;
  const title = pub?.title ?? TITLE;
  const description = pub?.description ?? DESCRIPTION;

  return {
    metadataBase: new URL(BASE),
    applicationName: 'PixWiki',
    title: { absolute: title },
    description,
    category: 'finance',
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: indexable ? {
      index: true, follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    } : {
      index: false, follow: false,
      googleBot: { index: false, follow: false },
    },
    openGraph: {
      type: 'website', locale: 'pt_BR', url: canonical ?? BASE, siteName: 'PixWiki', title, description,
      images: [{ url: '/brands/pix/og.png', width: 1200, height: 630, alt: 'PixWiki — infraestrutura Pix para empresas' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/brands/pix/og.png'] },
    icons: { icon: '/brands/pix/favicon.png', apple: '/brands/pix/apple-touch-icon.png' },
    manifest: '/manifest.webmanifest',
  };
}

function pixGraphV2() {
  const offers = [
    ['PIX GRÁTIS','0','100 automações/mês'],
    ['PIX LINK','490','1.000 automações/mês'],
    ['PIX PRO','2900','10.000 automações/mês'],
    ['PIX VIP','19000','100.000 automações/mês'],
  ].map(([name, price, description]) => ({ '@type': 'Offer', name, price, priceCurrency: 'BRL', description, availability: 'https://schema.org/InStock' }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication', '@id': `${BASE}/#software`, name: 'PixWiki', alternateName: 'pix.wiki', url: BASE,
        description: DESCRIPTION, applicationCategory: 'FinanceApplication', applicationSubCategory: 'Infraestrutura de automação Pix',
        operatingSystem: 'Web, Android', inLanguage: 'pt-BR', creator: { '@type': 'Organization', name: 'BigCorps' },
        offers: { '@type': 'AggregateOffer', priceCurrency: 'BRL', lowPrice: '0', highPrice: '19000', offerCount: 4, offers },
        featureList: [
          'Confirmação de Pix recebidos na própria conta Mercado Pago',
          'Pix Link e Checkout com QR Code',
          'API e Webhooks para ERP e e-commerce',
          'Notificações Push, e-mail e WhatsApp',
          'Equipe com papéis owner, manager e cashier',
          'Relatórios e conciliação',
          '0% de taxa PixWiki sobre o valor recebido',
        ],
      },
      {
        '@type': 'FAQPage', '@id': `${BASE}/#faq`, mainEntity: [
          { '@type': 'Question', name: 'O dinheiro passa pela PixWiki?', acceptedAnswer: { '@type': 'Answer', text: 'Não. O dinheiro permanece na conta Mercado Pago conectada. A PixWiki atua na confirmação, automação e conciliação.' } },
          { '@type': 'Question', name: 'A PixWiki cobra percentual sobre a venda?', acceptedAnswer: { '@type': 'Answer', text: 'A PixWiki não cobra percentual sobre o valor recebido. A cobrança é baseada em automações e planos; tarifas do Mercado Pago são independentes.' } },
          { '@type': 'Question', name: 'O que conta como uma Automação PixWiki?', acceptedAnswer: { '@type': 'Answer', text: 'Um pagamento automatizado consome no máximo uma automação, mesmo quando mais de um canal pago é usado no mesmo recebimento.' } },
        ],
      },
      { '@type': 'WebSite', '@id': `${BASE}/#website`, url: BASE, name: 'PixWiki', description: DESCRIPTION, inLanguage: 'pt-BR' },
    ],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get('host') || '';
  if (!isPixHost(host)) return { robots: { index: false, follow: false } };
  return metadataFor(visiblePath(h.get('x-pathname')), isApex(host));
}

export default async function PixLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const host = h.get('host') || '';
  const path = visiblePath(h.get('x-pathname'));
  const apex = isApex(host);
  const landing = apex && path === '/';
  const pixHost = isPixHost(host);

  return <>
    {landing && <JsonLd data={pixGraphV2()} />}
    {pixHost && <style>{`footer:not([data-pixwiki-brand-footer]){display:none!important}`}</style>}
    {children}
    {landing && <PixWikiPlayStoreBadge />}
    {pixHost && <PixWikiBrandFooter />}
  </>;
}
