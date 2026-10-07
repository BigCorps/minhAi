import type { Metadata } from 'next';
import { Exo_2 } from 'next/font/google';
import BigCorpsMetaPixel from '@/components/ajuda/BigCorpsMetaPixel';

const exo2 = Exo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bigcorps-ajuda',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ajuda.bigcorps.com.br'),
  title: 'Análise gratuita do seu negócio | BigCorps',
  description:
    'Responda um diagnóstico rápido e descubra onde tecnologia e IA podem ajudar sua empresa a vender mais, gerar novas receitas e reduzir despesas.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Análise gratuita do seu negócio | BigCorps',
    description:
      'Em cerca de 2 minutos, descubra oportunidades de vendas, automação, redução de custos e novas receitas para sua empresa.',
    url: 'https://ajuda.bigcorps.com.br/',
    siteName: 'BigCorps',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function AjudaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${exo2.className} ${exo2.variable} bg-white text-[#1F1F1F]`}>
      <BigCorpsMetaPixel />
      {children}
    </div>
  );
}
