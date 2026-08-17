import { headers } from 'next/headers';
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { organizationNode, resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const BASE = 'https://pix.wiki';
const TITLE = 'PixWiki — Confirmação automática de Pix com Mercado Pago';
const DESCRIPTION = 'Receba Pix pela sua chave ou Pix Link e acompanhe as confirmações automaticamente. Painel em tempo real, avisos por e-mail e Push, WhatsApp, multiempresa e relatórios. Comece grátis.';

function isLandingPath(raw: string | null): boolean {
  const path = raw && raw.startsWith('/') ? raw : '/';
  return path === '/' || path === '/pix' || path === '/pix/';
}

function isPixApex(host: string): boolean {
  const clean = host.split(':')[0].toLowerCase();
  return clean === 'pix.wiki' || clean === 'www.pix.wiki';
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
      images: [{ url: '/brands/pix/og.png', width: 1200, height: 630, alt: 'PixWiki — confirmação automática de Pix com Mercado Pago' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: ['/brands/pix/og.png'],
    },
    icons: {
      icon: '/brands/pix/favicon.png',
      apple: '/brands/pix/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
  };
}

function pixWikiGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${BASE}/#software`,
        name: 'PixWiki',
        alternateName: ['pix.wiki', 'Pix Wiki'],
        url: BASE,
        description: DESCRIPTION,
        applicationCategory: 'FinanceApplication',
        applicationSubCategory: 'Confirmação e acompanhamento de recebimentos Pix',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
        creator: { '@id': 'https://bigcorps.com.br/#organization' },
        publisher: { '@id': 'https://bigcorps.com.br/#organization' },
        offers: [
          {
            '@type': 'Offer',
            name: 'Pix Grátis',
            price: '0',
            priceCurrency: 'BRL',
            description: 'Confirmação automática, painel de recebimentos, histórico, e-mail e Push.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Pix Link',
            price: '29.90',
            priceCurrency: 'BRL',
            description: 'Tudo do Pix Grátis, mais endereço próprio em pix.wiki, página de cobrança, link com valor e QR Code.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Pix Pro',
            price: '99.90',
            priceCurrency: 'BRL',
            description: 'Tudo do Pix Link, mais WhatsApp, multiempresa, relatórios, exportação e integrações com outros sistemas.',
            availability: 'https://schema.org/InStock',
          },
        ],
        featureList: [
          'Acompanhamento automático de recebimentos Pix em conta Mercado Pago conectada',
          'Chave Pix no plano gratuito',
          'Painel com atualização em tempo real e atualização manual sob demanda',
          'Histórico com o valor que efetivamente entrou na conta',
          'Avisos por e-mail e Web Push',
          'Pix Link com endereço no formato seunome.pix.wiki',
          'Link com valor preenchido e QR Code',
          'Avisos por WhatsApp no Pix Pro',
          'Várias empresas na mesma conta no Pix Pro',
          'Relatórios e exportação no Pix Pro',
          'Integrações por API e Webhooks no Pix Pro',
          'WebApp instalável no celular',
        ],
        audience: {
          '@type': 'Audience',
          audienceType: ['Pessoa física', 'Autônomo', 'MEI', 'Prestador de serviços', 'Loja', 'Pequena empresa'],
          geographicArea: { '@type': 'Country', name: 'Brasil' },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${BASE}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'O dinheiro fica no PixWiki?',
            acceptedAnswer: { '@type': 'Answer', text: 'Não. O dinheiro continua entrando diretamente na conta Mercado Pago do recebedor. O PixWiki acompanha os recebimentos e organiza as confirmações.' },
          },
          {
            '@type': 'Question',
            name: 'O PixWiki cobra uma porcentagem de cada Pix?',
            acceptedAnswer: { '@type': 'Answer', text: 'Não. O PixWiki não cobra percentual por transação. Eventuais tarifas do Mercado Pago dependem do tipo de recebimento utilizado, e o painel mostra o valor que efetivamente entrou.' },
          },
          {
            '@type': 'Question',
            name: 'Posso usar o PixWiki como pessoa física?',
            acceptedAnswer: { '@type': 'Answer', text: 'Sim. O PixWiki pode ser usado por pessoa física, autônomo, MEI ou empresa que receba Pix em uma conta Mercado Pago compatível.' },
          },
          {
            '@type': 'Question',
            name: 'O cliente precisa instalar o PixWiki?',
            acceptedAnswer: { '@type': 'Answer', text: 'Não. O cliente paga pelo aplicativo do próprio banco. No Pix Link, basta abrir a página de cobrança e usar o QR Code ou o código Pix.' },
          },
          {
            '@type': 'Question',
            name: 'Como recebo aviso de um novo Pix?',
            acceptedAnswer: { '@type': 'Answer', text: 'O painel atualiza automaticamente. E-mail e Push estão disponíveis desde o Pix Grátis; avisos por WhatsApp fazem parte do Pix Pro.' },
          },
          {
            '@type': 'Question',
            name: 'Qual a diferença entre Chave Pix e Pix Link?',
            acceptedAnswer: { '@type': 'Answer', text: 'Na Chave Pix o cliente informa a chave e o valor no banco. No Pix Link o recebedor envia uma página profissional com nome, QR Code e, se desejar, o valor já preenchido.' },
          },
        ],
      },
      organizationNode(),
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: 'PixWiki',
        alternateName: 'pix.wiki',
        description: DESCRIPTION,
        inLanguage: 'pt-BR',
        publisher: { '@id': 'https://bigcorps.com.br/#organization' },
      },
    ],
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

  return <>{landing && <JsonLd data={pixWikiGraph()} />}{children}</>;
}
