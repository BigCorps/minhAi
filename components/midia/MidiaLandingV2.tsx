'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CloudOff,
  Gauge,
  Images,
  MapPin,
  MonitorPlay,
  MousePointerClick,
  Network,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Rocket,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TabletSmartphone,
  Tv,
  WalletCards,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type Props = {
  loginHref: string;
  signupHref: string;
};

const BLUE = '#003295';
const RED = '#EA0D16';

const heroCreatives = [
  {
    name: 'MonitorIA',
    badge: 'ANUNCIANTE PARCEIRO',
    src: '/brands/midia/ads/monitoria.png',
    alt: 'Criativo vertical da MonitorIA',
  },
  {
    name: 'ConviteIA',
    badge: 'ANUNCIANTE PARCEIRO',
    src: '/brands/midia/ads/conviteia.png',
    alt: 'Criativo vertical do ConviteIA',
  },
  {
    name: 'PixWiki',
    badge: 'ANUNCIANTE PARCEIRO',
    src: '/brands/midia/ads/pixwiki.png',
    alt: 'Criativo vertical do PixWiki',
  },
] as const;


const storySteps = [
  {
    eyebrow: '01 · SUA TELA',
    title: 'Você já tem a tela.',
    description:
      'Continue usando TV, tablet ou painel para cardápios, promoções, avisos e vídeos do seu próprio negócio.',
    visual: 'own',
  },
  {
    eyebrow: '02 · INVENTÁRIO',
    title: 'Abra só o espaço que quiser monetizar.',
    description:
      'No plano Parceiro, até 80% da programação continua sendo sua. A rede utiliza apenas os espaços disponibilizados.',
    visual: 'inventory',
  },
  {
    eyebrow: '03 · QR PRÓPRIO',
    title: 'A própria tela pode vender publicidade.',
    description:
      'Cada tela recebe um QR exclusivo. O anunciante escaneia, escolhe frequência, envia a peça e paga via PIX.',
    visual: 'qr',
  },
  {
    eyebrow: '04 · TEMPO REAL',
    title: 'A campanha entra na programação.',
    description:
      'Após pagamento e aprovação, o player recebe a nova programação e baixa o criativo sem interromper o que já está passando.',
    visual: 'campaign',
  },
  {
    eyebrow: '05 · ACOMPANHAMENTO',
    title: 'Pagou? Veja as exibições acontecendo.',
    description:
      'Cada reprodução paga é registrada. O saldo do parceiro é liberado conforme as exibições realmente são entregues.',
    visual: 'money',
  },
] as const;

const venues = [
  {
    title: 'Lojas',
    subtitle: 'vitrine, caixa, corredor e recepção',
    className: 'mp-venue-large',
    icon: Store,
    accent: 'blue',
  },
  {
    title: 'Motoristas',
    subtitle: 'tablet no carro e mídia durante a viagem',
    className: '',
    icon: TabletSmartphone,
    accent: 'red',
  },
  {
    title: 'Elevadores',
    subtitle: 'residencial, comercial e corporativo',
    className: '',
    icon: Building2,
    accent: 'navy',
  },
  {
    title: 'Painéis LED',
    subtitle: 'pontos premium e mídia externa',
    className: 'mp-venue-wide',
    icon: MonitorPlay,
    accent: 'red',
  },
  {
    title: 'Academias',
    subtitle: 'alto tempo de permanência',
    className: '',
    icon: Gauge,
    accent: 'blue',
  },
  {
    title: 'Clínicas',
    subtitle: 'salas de espera e recepção',
    className: '',
    icon: ShieldCheck,
    accent: 'navy',
  },
] as const;

const allPrices = [
  ['Experimente', '1 exibição em até 30 dias', 'R$ 4,90'],
  ['Dia Certo', '1 exibição no dia escolhido', 'R$ 7,90'],
  ['Hora Certa', '1 exibição em janela de 1 hora', 'R$ 14,90'],
  ['Momento Marcado', '1 exibição em janela de 15 min', 'R$ 24,90'],
  ['Presença Diária', '1x por dia durante 30 dias', 'R$ 59,90'],
  ['Diário Agendado', '1x por dia em horário definido', 'R$ 119,90'],
  ['Reforço', '4x por dia', 'R$ 149,90'],
  ['Hora em Hora', '1x a cada hora ativa', 'R$ 299,90'],
  ['Alta Frequência', '1x a cada 30 minutos', 'R$ 499,90'],
  ['Intensivo', '1x a cada 15 minutos', 'R$ 899,90'],
  ['Dominante', '1x a cada 5 minutos', 'R$ 1.990'],
] as const;

const productFillers = [
  {
    name: 'MonitorIA',
    text: 'Segurança com memória e pesquisa por IA',
    tone: 'blue',
    src: '/brands/midia/ads/monitoria.png',
    domain: 'monitoria.com',
  },
  {
    name: 'ConviteIA',
    text: 'Convites, presentes e memórias em um só lugar',
    tone: 'rose',
    src: '/brands/midia/ads/conviteia.png',
    domain: 'conviteia.com',
  },
  {
    name: 'PixWiki',
    text: 'Não dependa de print. Confirme o pagamento real',
    tone: 'navy',
    src: '/brands/midia/ads/pixwiki.png',
    domain: 'pix.wiki',
  },
  {
    name: 'minhAi',
    text: 'Atendimento, vendas e automações em um só lugar',
    tone: 'blue',
    src: '/brands/midia/ads/minhai.png',
    domain: 'minhai.app',
  },
  {
    name: 'ConsultaTec',
    text: 'Consulte CPF e CNPJ com mais informação',
    tone: 'cream',
    src: '/brands/midia/ads/consultatec.png',
    domain: 'consultatec.br',
  },
  {
    name: 'MelhorIA',
    text: 'Mais cuidado em cada detalhe',
    tone: 'mint',
    src: '/brands/midia/ads/melhoria.png',
    domain: 'melhoria.org',
  },
  {
    name: 'ArteFinal.app',
    text: 'Seu arte-finalista com IA',
    tone: 'light',
    src: '/brands/midia/ads/artefinal.png',
    domain: 'artefinal.app',
  },
] as const;


const techCards = [
  {
    icon: CloudOff,
    title: 'Continua offline',
    text: 'O player mantém a programação já baixada e segue exibindo mesmo quando a conexão cai.',
    className: 'mp-bento-wide',
  },
  {
    icon: Radio,
    title: 'Atualização em tempo real',
    text: 'Campanha nova entra sem precisar tocar no dispositivo.',
    className: '',
  },
  {
    icon: QrCode,
    title: 'QR por tela',
    text: 'Cada ponto pode originar sua própria venda e atribuição.',
    className: '',
  },
  {
    icon: ScanLine,
    title: 'Acompanhe cada exibição',
    text: 'Veja quantas exibições pagas já foram entregues e quanto ainda falta na campanha.',
    className: '',
  },
  {
    icon: Network,
    title: 'Vários locais, uma conta',
    text: 'Loja, carro, elevador, tablet e painel podem ser gerenciados juntos.',
    className: 'mp-bento-wide',
  },
  {
    icon: Images,
    title: 'Baixe suas mídias',
    text: 'Também funciona com equipamentos totalmente offline por download manual.',
    className: '',
  },
] as const;

export default function MidiaLandingV2({ loginHref, signupHref }: Props) {
  const [heroCreative, setHeroCreative] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showAllPrices, setShowAllPrices] = useState(false);
  const storyRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setHeroCreative((current) => (current + 1) % heroCreatives.length);
    }, 3600);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-mp-reveal]'));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const index = Number((visible.target as HTMLElement).dataset.storyIndex ?? 0);
        if (Number.isFinite(index)) setStoryIndex(index);
      },
      { rootMargin: '-25% 0px -35% 0px', threshold: [0.25, 0.5, 0.7] },
    );

    storyRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="mp-landing">
      <LandingHeader loginHref={loginHref} signupHref={signupHref} />

      <section className="mp-hero">
        <div className="mp-hero-grid" aria-hidden="true" />
        <div className="mp-hero-glow mp-hero-glow-blue" aria-hidden="true" />
        <div className="mp-hero-glow mp-hero-glow-red" aria-hidden="true" />

        <div className="mp-shell mp-hero-inner">
          <div className="mp-hero-copy" data-mp-reveal>
            <div className="mp-kicker">
              <span className="mp-kicker-dot" />
              Rede de mídia para qualquer tela
            </div>

            <h1 className="mp-hero-title">
              ESSA TELA
              <span className="mp-hero-title-blue"> PODE</span>
              <br />
              <span className="mp-hero-title-pay">PAGAR</span>{' '}
              <span className="mp-hero-title-red">A SI MESMA.</span>
            </h1>

            <p className="mp-hero-subtitle">
              Use sua TV, tablet ou painel para suas próprias campanhas.
              Abra espaços para a rede Midia.Pro e transforme tempo ocioso em receita.
            </p>

            <div className="mp-hero-actions">
              <Link href={signupHref} className="mp-button mp-button-primary">
                Quero monetizar minha tela
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#anuncie" className="mp-button mp-button-ghost">
                Quero anunciar
                <MousePointerClick className="h-4 w-4" />
              </a>
            </div>

            <div className="mp-hero-trust">
              <span><CheckCircle2 /> Parceiro pode começar por R$ 0</span>
              <span><CheckCircle2 /> Conteúdo próprio + publicidade</span>
              <span><CheckCircle2 /> PIX + acompanhe as exibições</span>
            </div>
          </div>

          <HeroNetwork creativeIndex={heroCreative} />
        </div>

        <a className="mp-scroll-cue" href="#como-funciona" aria-label="Ver como funciona">
          <span />
          role para descobrir
        </a>
      </section>

      <Marquee />

      <section id="como-funciona" className="mp-story-section">
        <div className="mp-shell">
          <SectionHeading
            eyebrow="A IDEIA EM 30 SEGUNDOS"
            title="A tela deixa de ser só custo. Ela vira inventário."
            text="Você controla a programação. A Midia.Pro conecta o espaço disponível a anunciantes, registra o que foi exibido e organiza a receita."
          />

          <div className="mp-story-grid">
            <div className="mp-story-stage">
              <div className="mp-story-stage-inner">
                <StoryScreen active={storyIndex} />
              </div>
            </div>

            <div className="mp-story-copy">
              {storySteps.map((step, index) => (
                <div
                  key={step.title}
                  ref={(node) => {
                    storyRefs.current[index] = node;
                  }}
                  data-story-index={index}
                  className={`mp-story-step ${storyIndex === index ? 'is-active' : ''}`}
                >
                  <span>{step.eyebrow}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mp-filler-section">
        <div className="mp-shell">
          <div className="mp-filler-head" data-mp-reveal>
            <div>
              <div className="mp-kicker mp-kicker-inverse">
                <Sparkles className="h-4 w-4" />
                Espaço livre nunca precisa ficar vazio
              </div>
              <h2>
                NÃO TEM ANÚNCIO?
                <br />
                <span>SUA TELA NÃO PARA.</span>
              </h2>
            </div>

            <p>
              Quando não houver campanha paga, a rede pode preencher o inventário disponível
              com campanhas de parceiros e anunciantes. Campanhas pagas sempre têm prioridade.
            </p>
          </div>
        </div>

        <div className="mp-product-rail">
          <div className="mp-product-track">
            {[...productFillers, ...productFillers].map((creative, index) => (
              <ProductCreative
                key={`${creative.name}-${index}`}
                name={creative.name}
                text={creative.text}
                tone={creative.tone}
                src={creative.src}
                domain={creative.domain}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mp-paths-section">
        <div className="mp-shell">
          <SectionHeading
            eyebrow="TRÊS JEITOS DE ENTRAR"
            title="Escolha o seu lado da rede."
            text="A Midia.Pro atende quem tem uma tela, quem quer apenas gerenciá-la e quem quer comprar mídia."
          />

          <div className="mp-path-grid">
            <PathCard
              number="01"
              icon={<BadgeDollarSign />}
              title="TENHO UMA TELA"
              lead="Quero usar e monetizar."
              price="R$ 0"
              suffix="/mês"
              text="Use suas próprias mídias e disponibilize parte da programação para campanhas da rede."
              cta="Cadastrar minha tela"
              href={signupHref}
              tone="blue"
              bullets={['Até 80% da programação para você', 'Participação na receita', 'QR próprio para vender anúncios']}
            />

            <PathCard
              number="02"
              icon={<Tv />}
              title="QUERO SÓ PARA MIM"
              lead="Quero controlar minhas propagandas."
              price="R$ 19,90"
              suffix="/tela/mês"
              text="Use a Midia.Pro como painel digital privado, sem publicidade externa."
              cta="Usar como painel digital"
              href={signupHref}
              tone="light"
              bullets={['100% da programação é sua', 'Gerenciamento remoto', 'Player online e offline']}
            />

            <PathCard
              number="03"
              icon={<Rocket />}
              title="QUERO ANUNCIAR"
              lead="Quero aparecer em telas."
              price="R$ 4,90"
              suffix="para começar"
              text="Compre uma exibição ou escolha frequências maiores quando quiser presença constante."
              cta="Ver como anunciar"
              href="#anuncie"
              tone="red"
              bullets={['Escolha quando aparecer', 'Imagem ou vídeo vertical', 'Pagamento por PIX']}
            />
          </div>
        </div>
      </section>

      <section className="mp-venues-section">
        <div className="mp-shell">
          <div className="mp-venues-title" data-mp-reveal>
            <span>UMA PLATAFORMA.</span>
            <h2>QUALQUER LUGAR ONDE EXISTE UMA TELA.</h2>
          </div>

          <div className="mp-venues-grid">
            {venues.map((venue, index) => {
              const Icon = venue.icon;
              return (
                <article
                  key={venue.title}
                  className={`mp-venue-card mp-venue-${venue.accent} ${venue.className}`}
                  data-mp-reveal
                  style={{ '--delay': `${index * 55}ms` } as CSSProperties}
                >
                  <div className="mp-venue-no">0{index + 1}</div>
                  <div className="mp-venue-screen">
                    <Icon />
                    <span>midia.pro</span>
                  </div>
                  <div>
                    <h3>{venue.title}</h3>
                    <p>{venue.subtitle}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="anuncie" className="mp-advertise-section">
        <div className="mp-shell mp-advertise-grid">
          <div className="mp-advertise-copy" data-mp-reveal>
            <div className="mp-kicker mp-kicker-inverse">
              <QrCode className="h-4 w-4" />
              Venda direto da própria tela
            </div>
            <h2>
              VIU A TELA?
              <br />
              <span>VOCÊ PODE ESTAR NELA.</span>
            </h2>
            <p>
              O QR individual leva o anunciante direto para aquela tela. Ele escolhe
              frequência, horário, envia a peça e paga por PIX.
            </p>

            <div className="mp-advertise-steps">
              {[
                ['01', 'Escaneie', 'o QR daquela tela'],
                ['02', 'Escolha', 'quando e quantas vezes aparecer'],
                ['03', 'Envie', 'imagem ou vídeo vertical'],
                ['04', 'Pague', 'com PIX'],
                ['05', 'Apareça', 'na programação após aprovação'],
              ].map(([no, title, text]) => (
                <div key={no}>
                  <span>{no}</span>
                  <div><strong>{title}</strong><small>{text}</small></div>
                </div>
              ))}
            </div>
          </div>

          <AdPhone />
        </div>
      </section>

      <section id="precos" className="mp-pricing-section">
        <div className="mp-shell">
          <SectionHeading
            eyebrow="PREÇO DE ENTRADA BAIXO. PRESENÇA VALE MAIS."
            title="Comece com R$ 4,90. Cresça conforme a frequência."
            text="Uma exibição serve para experimentar. Frequência, horário reservado e ocupação maior do inventário custam mais."
          />

          <div className="mp-price-featured">
            <PriceCard name="EXPERIMENTE" detail="1 exibição" price="R$ 4,90" badge="comece aqui" />
            <PriceCard name="PRESENÇA DIÁRIA" detail="todos os dias" price="R$ 59,90" badge="recorrência" featured />
            <PriceCard name="HORA EM HORA" detail="alta frequência" price="R$ 299,90" badge="presença forte" />
          </div>

          <div className="mp-price-note">
            <span>30s = preço base</span>
            <span>45s = ×1,5</span>
            <span>60s = ×2</span>
            <span>Telas premium podem ter fator próprio</span>
          </div>

          <button
            type="button"
            className="mp-price-toggle"
            onClick={() => setShowAllPrices((current) => !current)}
            aria-expanded={showAllPrices}
          >
            {showAllPrices ? 'Ocultar tabela completa' : 'Ver todas as frequências'}
            <ChevronDown className={showAllPrices ? 'is-open' : ''} />
          </button>

          <div className={`mp-price-table-wrap ${showAllPrices ? 'is-open' : ''}`}>
            <div className="mp-price-table">
              {allPrices.map(([name, detail, price]) => (
                <div key={name} className="mp-price-row">
                  <div><strong>{name}</strong><span>{detail}</span></div>
                  <b>{price}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mp-split-section">
        <div className="mp-shell">
          <div className="mp-split-header" data-mp-reveal>
            <span>RECEITA TRANSPARENTE</span>
            <h2>QUEM AJUDA A REDE A VENDER, PARTICIPA MAIS.</h2>
            <p>
              A Midia.Pro diferencia a venda originada pela própria tela das campanhas
              vendidas pela rede.
            </p>
          </div>

          <div className="mp-split-grid">
            <RevenueSplit
              title="Venda gerada pela sua tela"
              subtitle="Anunciante chegou pelo QR daquele ponto"
              partner={80}
              midia={20}
            />
            <RevenueSplit
              title="Campanha vendida pela rede"
              subtitle="Midia.Pro trouxe o anunciante"
              partner={50}
              midia={50}
            />
          </div>

          <div className="mp-proof-strip">
            <ScanLine />
            <div>
              <strong>Exibições confirmadas</strong>
              <span>Você acompanha a entrega e o saldo só é liberado conforme as exibições realmente acontecem.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mp-tech-section">
        <div className="mp-shell">
          <SectionHeading
            eyebrow="TECNOLOGIA QUE VOCÊ NÃO PRECISA ENTENDER"
            title="Por trás da tela, tudo continua trabalhando."
            text="O produto foi pensado para operação real: internet instável, vários locais, atualização remota e prestação de contas."
          />

          <div className="mp-bento-grid">
            {techCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className={`mp-bento-card ${card.className}`}
                  data-mp-reveal
                  style={{ '--delay': `${index * 55}ms` } as CSSProperties}
                >
                  <div className="mp-bento-icon"><Icon /></div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mp-network-section">
        <div className="mp-shell mp-network-grid">
          <div data-mp-reveal>
            <div className="mp-kicker">
              <Network className="h-4 w-4" />
              Rede em expansão
            </div>
            <h2>UMA REDE QUE CRESCE COM CADA TELA.</h2>
            <p>
              Hoje estamos construindo os primeiros pontos. Amanhã, o anunciante poderá
              comprar presença em grupos de telas, cidades, tipos de local e faixas de horário.
            </p>

            <div className="mp-network-pills">
              <span>Lojas</span>
              <span>Motoristas</span>
              <span>Elevadores</span>
              <span>Painéis LED</span>
              <span>Clínicas</span>
              <span>Academias</span>
            </div>
          </div>

          <NetworkVisual />
        </div>
      </section>

      <section className="mp-final-section">
        <div className="mp-final-lines" aria-hidden="true" />
        <div className="mp-shell mp-final-inner" data-mp-reveal>
          <Image
            src="/brands/midia/logo.png"
            alt="Midia.Pro"
            width={260}
            height={260}
            className="mp-final-logo"
          />
          <h2>
            A TELA JÁ ESTÁ AÍ.
            <br />
            <span>FAÇA ELA TRABALHAR.</span>
          </h2>
          <p>
            Cadastre seu primeiro ponto, publique sua própria mídia e prepare a tela
            para fazer parte de uma nova rede de publicidade.
          </p>
          <div className="mp-final-actions">
            <Link href={signupHref} className="mp-button mp-button-white">
              Cadastrar minha tela
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#anuncie" className="mp-button mp-button-outline-white">
              Quero anunciar
            </a>
          </div>
        </div>
      </section>

      <footer className="mp-footer">
        <div className="mp-shell">
          <div>
            <Image src="/brands/midia/logo.png" alt="Midia.Pro" width={120} height={120} />
            <span>Desenvolvido por BigCorps | Tecnologia minhAi</span>
          </div>
          <div>
            <Link href={loginHref}>Entrar</Link>
            <Link href={signupHref}>Cadastrar tela</Link>
            <a href="#precos">Preços</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function LandingHeader({ loginHref, signupHref }: Props) {
  return (
    <header className="mp-header">
      <div className="mp-shell mp-header-inner">
        <a href="#top" className="mp-header-logo" aria-label="Midia.Pro">
          <Image
            src="/brands/midia/logo.png"
            alt="Midia.Pro"
            width={160}
            height={160}
            priority
          />
        </a>

        <nav className="mp-header-nav">
          <a href="#como-funciona">Como funciona</a>
          <a href="#anuncie">Para anunciar</a>
          <a href="#precos">Preços</a>
        </nav>

        <div className="mp-header-actions">
          <Link href={loginHref} className="mp-header-login">Entrar</Link>
          <Link href={signupHref} className="mp-header-cta">
            Cadastrar tela
            <ArrowRight />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroNetwork({ creativeIndex }: { creativeIndex: number }) {
  const creative = heroCreatives[creativeIndex % heroCreatives.length];
  const leftCreative = productFillers[(creativeIndex + 1) % productFillers.length];
  const rightCreative = productFillers[(creativeIndex + 4) % productFillers.length];

  return (
    <div className="mp-hero-network" aria-label="Exemplo de uma rede de telas Midia.Pro">
      <div className="mp-network-orbit mp-network-orbit-one" aria-hidden="true" />
      <div className="mp-network-orbit mp-network-orbit-two" aria-hidden="true" />

      <div className="mp-float-screen mp-float-screen-left mp-float-screen-image">
        <Image
          src={leftCreative.src}
          alt={`Criativo ${leftCreative.name}`}
          fill
          sizes="220px"
          className="mp-float-screen-media"
        />
        <span>LOJA</span>
        <b>{leftCreative.name}</b>
        <small>campanha parceira</small>
      </div>

      <div className="mp-float-screen mp-float-screen-right mp-float-screen-image">
        <Image
          src={rightCreative.src}
          alt={`Criativo ${rightCreative.name}`}
          fill
          sizes="240px"
          className="mp-float-screen-media"
        />
        <span>EM EXIBIÇÃO</span>
        <b>{rightCreative.name}</b>
        <small>mídia da rede</small>
      </div>

      <div className="mp-main-device">
        <div className="mp-main-device-top">
          <span>ONLINE</span>
          <span>9:16</span>
        </div>

        <div className="mp-main-creative mp-main-creative-media" key={creative.name}>
          <Image
            src={creative.src}
            alt={creative.alt}
            fill
            priority={creativeIndex === 0}
            sizes="260px"
            className="mp-main-creative-image"
          />
          <div className="mp-main-creative-chip">{creative.badge}</div>
        </div>

        <div className="mp-main-device-bottom">
          <div>
            <span>PRÓXIMA TROCA</span>
            <b>00:12</b>
          </div>
          <div className="mp-main-device-bars">
            <i /><i /><i /><i />
          </div>
        </div>
      </div>

      <div className="mp-hero-money">
        <CircleDollarSign />
        <div><span>saldo parceiro</span><strong>+ R$ 2,40</strong></div>
      </div>

      <div className="mp-hero-live">
        <Radio />
        <span>programação atualizada</span>
      </div>
    </div>
  );
}

function Marquee() {
  const first = ['TV', 'TABLET', 'UBER', 'LOJA', 'ELEVADOR', 'ACADEMIA', 'CLÍNICA', 'PAINEL LED', 'RECEPÇÃO', 'RESTAURANTE'];
  const second = ['EXIBA', 'DIVULGUE', 'MONETIZE', 'CONTROLE', 'PROGRAME', 'GANHE', 'ATUALIZE', 'CONECTE'];

  return (
    <section className="mp-marquee" aria-label="Onde a Midia.Pro funciona">
      <div className="mp-marquee-line mp-marquee-line-blue">
        <div>
          {[...first, ...first].map((item, index) => (
            <span key={`${item}-${index}`}>{item}<i>●</i></span>
          ))}
        </div>
      </div>
      <div className="mp-marquee-line mp-marquee-line-red">
        <div>
          {[...second, ...second].map((item, index) => (
            <span key={`${item}-${index}`}>{item}<i>→</i></span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mp-section-heading" data-mp-reveal>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function StoryScreen({ active }: { active: number }) {
  const step = storySteps[active];

  return (
    <div className="mp-story-device">
      <div className="mp-story-device-head">
        <span><i /> MIDIA.PRO</span>
        <b>ONLINE</b>
      </div>

      <div className={`mp-story-visual mp-story-visual-${step.visual}`}>
        {step.visual === 'own' && (
          <>
            <small>CAFÉ AURORA</small>
            <strong>Combo<br />do dia</strong>
            <b>R$ 24,90</b>
            <span>seu conteúdo</span>
          </>
        )}

        {step.visual === 'inventory' && (
          <div className="mp-inventory-visual">
            <div className="mp-inventory-ring">
              <strong>80%</strong>
              <span>sua programação</span>
            </div>
            <div className="mp-inventory-caption">
              <span><i className="blue" /> próprio</span>
              <span><i className="red" /> rede</span>
            </div>
          </div>
        )}

        {step.visual === 'qr' && (
          <div className="mp-story-qr">
            <small>ANUNCIE NESTA TELA</small>
            <QrMock />
            <strong>A partir de R$ 4,90</strong>
            <span>testemidia.midia.pro</span>
          </div>
        )}

        {step.visual === 'campaign' && (
          <div className="mp-campaign-visual">
            <div className="mp-campaign-ad">
              <small>SUA MARCA</small>
              <strong>AGORA<br />NESTA TELA.</strong>
            </div>
            <div className="mp-campaign-status">
              <span><Check /> pagamento confirmado</span>
              <span><Check /> campanha aprovada</span>
              <span><Check /> programação atualizada</span>
            </div>
          </div>
        )}

        {step.visual === 'money' && (
          <div className="mp-money-visual">
            <span>SALDO DISPONÍVEL</span>
            <strong>R$ 184,72</strong>
            <div>
              <small>exibições confirmadas</small>
              <b>✓ 127 exibições entregues</b>
            </div>
          </div>
        )}
      </div>

      <div className="mp-story-device-foot">
        <span>PASSO {String(active + 1).padStart(2, '0')}</span>
        <div>{storySteps.map((_, index) => <i key={index} className={index === active ? 'active' : ''} />)}</div>
      </div>
    </div>
  );
}

function ProductCreative({
  name,
  text,
  tone,
  src,
  domain,
}: {
  name: string;
  text: string;
  tone: string;
  src: string;
  domain: string;
}) {
  return (
    <article className={`mp-product-card mp-product-${tone}`}>
      <Image
        src={src}
        alt={`Criativo ${name}`}
        fill
        sizes="260px"
        className="mp-product-card-image"
      />
      <div className="mp-product-card-shade" aria-hidden="true" />
      <div className="mp-product-card-top">
        <span>{name}</span>
        <Play />
      </div>
      <strong>{text}</strong>
      <div className="mp-product-card-foot">
        <small>PARCEIRO</small>
        <b>{domain}</b>
      </div>
    </article>
  );
}

function PathCard({
  number,
  icon,
  title,
  lead,
  price,
  suffix,
  text,
  cta,
  href,
  tone,
  bullets,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  lead: string;
  price: string;
  suffix: string;
  text: string;
  cta: string;
  href: string;
  tone: 'blue' | 'red' | 'light';
  bullets: string[];
}) {
  return (
    <article className={`mp-path-card mp-path-${tone}`} data-mp-reveal>
      <div className="mp-path-top">
        <span>{number}</span>
        <div>{icon}</div>
      </div>
      <div className="mp-path-label">{title}</div>
      <h3>{lead}</h3>
      <div className="mp-path-price">{price}<small>{suffix}</small></div>
      <p>{text}</p>
      <ul>
        {bullets.map((bullet) => <li key={bullet}><Check /> {bullet}</li>)}
      </ul>
      {href.startsWith('#') ? (
        <a href={href} className="mp-path-cta">{cta}<ArrowRight /></a>
      ) : (
        <Link href={href} className="mp-path-cta">{cta}<ArrowRight /></Link>
      )}
    </article>
  );
}

function AdPhone() {
  return (
    <div className="mp-ad-phone-wrap" data-mp-reveal>
      <div className="mp-ad-phone-pulse" />
      <div className="mp-ad-phone">
        <div className="mp-ad-phone-notch" />
        <div className="mp-ad-phone-screen">
          <div className="mp-ad-phone-head">
            <Image src="/brands/midia/logo.png" alt="" width={70} height={70} />
            <span>ANUNCIE AGORA</span>
          </div>

          <div className="mp-ad-phone-card">
            <div className="mp-ad-phone-card-top">
              <span>TELA</span>
              <b>Loja Centro · TV Caixa</b>
            </div>
            <div className="mp-ad-phone-preview">
              <small>SUA MARCA</small>
              <strong>PODE<br />APARECER<br />AQUI.</strong>
            </div>
          </div>

          <div className="mp-ad-phone-options">
            <button type="button" className="active">
              <span>1x</span>
              <b>R$ 4,90</b>
            </button>
            <button type="button">
              <span>Diário</span>
              <b>R$ 59,90</b>
            </button>
            <button type="button">
              <span>Hora em hora</span>
              <b>R$ 299,90</b>
            </button>
          </div>

          <div className="mp-ad-phone-pay">
            <QrCode />
            <span>Pagamento por PIX</span>
            <strong>Continuar →</strong>
          </div>
        </div>
      </div>

      <div className="mp-ad-phone-note mp-ad-phone-note-one">
        <Zap />
        <div><b>Próximo espaço</b><span>campanha pode entrar em minutos</span></div>
      </div>

      <div className="mp-ad-phone-note mp-ad-phone-note-two">
        <Clock3 />
        <div><b>Horário marcado</b><span>reserve uma janela específica</span></div>
      </div>
    </div>
  );
}

function PriceCard({
  name,
  detail,
  price,
  badge,
  featured = false,
}: {
  name: string;
  detail: string;
  price: string;
  badge: string;
  featured?: boolean;
}) {
  return (
    <article className={`mp-price-card ${featured ? 'is-featured' : ''}`} data-mp-reveal>
      <span>{badge}</span>
      <h3>{name}</h3>
      <p>{detail}</p>
      <strong>{price}</strong>
      <small>por tela · spot de 30s</small>
    </article>
  );
}

function RevenueSplit({
  title,
  subtitle,
  partner,
  midia,
}: {
  title: string;
  subtitle: string;
  partner: number;
  midia: number;
}) {
  return (
    <article className="mp-revenue-card" data-mp-reveal>
      <span>{subtitle}</span>
      <h3>{title}</h3>

      <div className="mp-revenue-bar">
        <div className="mp-revenue-partner" style={{ width: `${partner}%` }}>
          <strong>{partner}%</strong>
        </div>
        <div className="mp-revenue-midia" style={{ width: `${midia}%` }}>
          <strong>{midia}%</strong>
        </div>
      </div>

      <div className="mp-revenue-legend">
        <span><i className="partner" /> PARCEIRO</span>
        <span><i className="midia" /> MIDIA.PRO</span>
      </div>
    </article>
  );
}

function NetworkVisual() {
  const dots = useMemo(
    () => [
      [16, 22, 'Loja'],
      [31, 15, 'Painel'],
      [48, 28, 'Uber'],
      [69, 17, 'Elevador'],
      [84, 33, 'Clínica'],
      [23, 55, 'Academia'],
      [44, 62, 'Loja'],
      [66, 53, 'Tablet'],
      [82, 68, 'LED'],
      [52, 82, 'Recepção'],
    ],
    [],
  );

  return (
    <div className="mp-network-visual" data-mp-reveal>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M16 22 L31 15 L48 28 L69 17 L84 33 M16 22 L23 55 L44 62 L66 53 L82 68 L52 82 M48 28 L44 62 M69 17 L66 53 M23 55 L52 82" />
      </svg>
      {dots.map(([x, y, label], index) => (
        <div
          key={`${x}-${y}`}
          className={`mp-network-dot ${index % 3 === 1 ? 'red' : ''}`}
          style={{ left: `${x}%`, top: `${y}%`, '--delay': `${index * 130}ms` } as CSSProperties}
        >
          <i />
          <span>{label}</span>
        </div>
      ))}

      <div className="mp-network-center">
        <Image src="/brands/midia/logo.png" alt="Midia.Pro" width={110} height={110} />
      </div>
    </div>
  );
}

function QrMock() {
  const cells = [
    [0,0],[1,0],[2,0],[3,0],[4,0],[6,0],[8,0],[9,0],[10,0],[11,0],[12,0],
    [0,1],[4,1],[6,1],[8,1],[12,1],
    [0,2],[2,2],[4,2],[5,2],[6,2],[8,2],[10,2],[12,2],
    [0,3],[4,3],[7,3],[8,3],[12,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[6,4],[8,4],[9,4],[10,4],[11,4],[12,4],
    [6,5],[7,5],[9,5],[11,5],
    [0,6],[2,6],[3,6],[4,6],[5,6],[7,6],[8,6],[10,6],[12,6],
    [1,7],[3,7],[6,7],[9,7],[10,7],[11,7],
    [0,8],[1,8],[2,8],[3,8],[4,8],[6,8],[7,8],[8,8],[10,8],[12,8],
    [0,9],[4,9],[5,9],[7,9],[11,9],
    [0,10],[2,10],[4,10],[6,10],[8,10],[9,10],[10,10],[11,10],[12,10],
    [0,11],[4,11],[7,11],[9,11],[12,11],
    [0,12],[1,12],[2,12],[3,12],[4,12],[6,12],[8,12],[10,12],[11,12],[12,12],
  ];

  return (
    <svg className="mp-qr-mock" viewBox="0 0 13 13" aria-label="QR ilustrativo">
      <rect width="13" height="13" fill="white" />
      {cells.map(([x, y], index) => (
        <rect key={index} x={x} y={y} width="1" height="1" rx=".08" fill="#003295" />
      ))}
    </svg>
  );
}
