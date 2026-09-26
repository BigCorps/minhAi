import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  MonitorPlay,
  QrCode,
  Smartphone,
  Store,
  Tv,
} from 'lucide-react';

const BLUE = '#003295';
const RED = '#EA0D16';

const benefits = [
  ['Sua mídia', 'Use a tela para promoções, cardápios, avisos e vídeos do seu próprio negócio.'],
  ['Sua renda', 'No modo Parceiro, os espaços disponíveis podem receber campanhas da rede Midia.Pro.'],
  ['Seu endereço', 'Cada parceiro recebe seu próprio endereço no formato seunome.midia.pro.'],
] as const;

export default async function MidiaLandingPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').split(':')[0].toLowerCase();
  const productHost = host === 'midia.pro' || host === 'www.midia.pro';
  const loginHref = productHost ? '/login' : '/midia/login';
  const signupHref = `${loginHref}?mode=signup`;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Midia.Pro">
          <Image
            src="/brands/midia/logo.png"
            alt="Midia.Pro"
            width={190}
            height={190}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link href={loginHref} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
            Entrar
          </Link>
          <Link href={signupHref} className="rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{ backgroundColor: BLUE }}>
            Cadastrar tela
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-y border-blue-50 bg-[#F7F9FF]">
        <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-red-200/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black" style={{ color: BLUE }}>
              <MonitorPlay className="h-4 w-4" /> Sua tela pode trabalhar por você
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              Use sua tela. <span style={{ color: BLUE }}>Divulgue.</span>{' '}
              <span style={{ color: RED }}>Monetize.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Transforme TVs, tablets, telas em carros, elevadores e painéis LED em mídia digital gerenciada pela internet — sem perder o controle da sua própria programação.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={signupHref} className="inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-950/15" style={{ backgroundColor: BLUE }}>
                Quero cadastrar minha tela <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#modelo" className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700">
                Como funciona
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
              {['Parceiro pode começar sem mensalidade', 'Conteúdo próprio', 'Endereço próprio', 'Participação na receita'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" style={{ color: RED }} /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-950/10 sm:p-7">
            <div className="rounded-[28px] bg-slate-950 p-5 text-white">
              <div className="mx-auto aspect-[9/16] max-h-[540px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#003295] via-[#073B9C] to-[#061A42] p-6 shadow-2xl">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[.14em] text-white/70">
                    <span>Midia.Pro</span><span className="rounded-full bg-white/10 px-2 py-1">9:16</span>
                  </div>
                  <div className="text-center">
                    <Tv className="mx-auto h-16 w-16 text-white" />
                    <div className="mt-5 text-3xl font-black">Seu anúncio aqui.</div>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/70">Imagens e vídeos verticais para TVs, tablets, painéis e outras telas.</p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white p-3 text-slate-900">
                    <div><div className="text-[10px] font-black uppercase tracking-wide" style={{ color: RED }}>Anuncie nesta tela</div><div className="mt-0.5 text-xs font-bold">A partir de R$ 4,90</div></div>
                    <QrCode className="h-10 w-10" style={{ color: BLUE }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modelo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[.18em]" style={{ color: RED }}>Duas formas de usar</div>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">Você escolhe quanto da tela quer monetizar</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Quem aceita anúncios da rede pode usar a plataforma sem mensalidade. Quem quer 100% da programação privada paga pelo software.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border-2 border-blue-100 bg-[#F7F9FF] p-6 sm:p-8">
            <div className="flex items-center gap-3"><BadgeDollarSign className="h-7 w-7" style={{ color: BLUE }} /><div className="text-xl font-black">Parceiro Midia.Pro</div></div>
            <div className="mt-5 text-4xl font-black" style={{ color: BLUE }}>R$ 0<span className="text-base text-slate-400">/mês</span></div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Use suas próprias mídias e disponibilize inicialmente 20% da programação para a rede. Quando uma campanha paga for entregue na sua tela, você participa da receita.</p>
            <div className="mt-5 space-y-2 text-sm font-bold text-slate-600">
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: RED }} />Até 80% da programação para conteúdo próprio</div>
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: RED }} />50% da receita das campanhas vendidas pela rede, conforme entrega</div>
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: RED }} />Venda originada pela própria tela com regra comercial 80/20</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3"><Store className="h-7 w-7" style={{ color: RED }} /><div className="text-xl font-black">Uso Próprio</div></div>
            <div className="mt-5 text-4xl font-black" style={{ color: RED }}>R$ 19,90<span className="text-base text-slate-400">/tela/mês</span></div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Para quem quer usar a Midia.Pro apenas como painel digital. Nenhuma publicidade da rede entra na programação.</p>
            <div className="mt-5 space-y-2 text-sm font-bold text-slate-600">
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: BLUE }} />100% da programação é sua</div>
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: BLUE }} />Gerenciamento remoto e endereço próprio</div>
              <div className="flex gap-2"><Check className="h-5 w-5 shrink-0" style={{ color: BLUE }} />Plano Pro preparado para programação avançada</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map(([title, description], index) => {
              const Icon = [Smartphone, BadgeDollarSign, QrCode][index];
              return (
                <div key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <Icon className="h-7 w-7" style={{ color: index === 1 ? RED : BLUE }} />
                  <h3 className="mt-4 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-[36px] p-8 text-white sm:p-12" style={{ background: `linear-gradient(135deg, ${BLUE}, #001B52)` }}>
          <div className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Rede em construção</div>
          <h2 className="mt-3 text-3xl font-black">Cadastre sua tela desde o começo.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75">Cadastre TV, tablet, carro, elevador, comércio ou painel LED. O player funciona online e offline, e cada tela parceira recebe um QR próprio para vender publicidade a partir de R$ 4,90.</p>
          <Link href={signupHref} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black" style={{ color: BLUE }}>
            Criar minha conta <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-4 py-8 text-center text-xs font-bold text-slate-400">
        Midia.Pro · Tecnologia BigCorps
      </footer>
    </main>
  );
}
