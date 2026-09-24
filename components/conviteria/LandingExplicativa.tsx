'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Gift,
  Images,
  LayoutGrid,
  MessageCircle,
  Palette,
  Play,
  QrCode,
  Shirt,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import styles from './LandingExplicativa.module.css';

const VIDEO_HORIZONTAL = 'SZISbf_KfGU';
const VIDEO_VERTICAL = 'A6WXYii8Eo0';
const QUERY_VERTICAL = '(max-width: 900px) and (orientation: portrait)';

const recursos = [
  {
    Icon: Sparkles,
    titulo: 'Criação com IA e personalização',
    texto: 'Conte como será o evento e deixe a IA adiantar o começo. Depois, ajuste cada detalhe até o convite ficar com a sua cara.',
    itens: ['Briefing em texto livre', 'Cores, fontes e textura', 'Envelope, lacre, fotos e música', 'Endereço próprio do convite'],
  },
  {
    Icon: UsersRound,
    titulo: 'Convidados e confirmações',
    texto: 'Organize famílias e convidados individuais, acompanhe o RSVP e mantenha a lista pronta para todos os outros recursos do evento.',
    itens: ['Famílias ou convidados individuais', 'Prazo para confirmação', 'Lista, grade e ordenação', 'Central de convidados integrada'],
  },
  {
    Icon: MessageCircle,
    titulo: 'WhatsApp do Evento',
    texto: 'Envie a primeira comunicação e programe um lembrete usando a mesma lista de convidados e a confirmação do próprio convite.',
    itens: ['1ª comunicação', 'Lembrete programado', 'Até 2 comunicações por contato/família', 'Confirmação pelo convite'],
  },
  {
    Icon: Images,
    titulo: 'Memórias do Evento',
    texto: 'Transforme os celulares dos convidados em parte do evento com fotos e vídeos enviados por QR Code para um álbum em tempo real.',
    itens: ['QR para fotos e vídeos', 'Até 300 fotos e 30 vídeos', 'Álbum em tempo real', 'Slideshow e Modo Festa'],
  },
  {
    Icon: QrCode,
    titulo: 'Check-in e organização',
    texto: 'Use a mesma base de convidados para controlar a entrada e apoiar recepção, buffet e organização do salão sem listas paralelas.',
    itens: ['QR individual ou por família', 'Equipe de recepção', 'Organização de mesas', 'Exportação CSV e PDF'],
  },
  {
    Icon: Gift,
    titulo: 'Papelaria, presentes e financeiro',
    texto: 'Complete a experiência antes e durante o evento com materiais para impressão, padrinhos, recados e presentes reunidos no mesmo painel.',
    itens: ['Papelaria com QR', 'Padrinhos e recados', 'Lista de presentes', 'PIX, saldo e saques'],
  },
];

const passos = [
  {
    numero: '01',
    titulo: 'Crie',
    texto: 'Conte sua ideia para a IA ou comece do zero. Escolha o visual, as informações e as seções do convite vendo o resultado enquanto edita.',
  },
  {
    numero: '02',
    titulo: 'Publique',
    texto: 'Escolha seu endereço, publique o convite e compartilhe com os convidados. O convite publicado continua no ar e pode ser editado depois.',
  },
  {
    numero: '03',
    titulo: 'Gerencie',
    texto: 'Acompanhe convidados, confirmações, comunicações, Memórias, financeiro, mesas, check-in, Papelaria, padrinhos e recados em um só lugar.',
  },
];

function escolherVideoAtual() {
  if (typeof window === 'undefined') return VIDEO_HORIZONTAL;
  return window.matchMedia(QUERY_VERTICAL).matches ? VIDEO_VERTICAL : VIDEO_HORIZONTAL;
}

export default function LandingExplicativa() {
  const [videoId, setVideoId] = useState<string | null>(null);

  const iniciarVideo = useCallback(() => {
    setVideoId(escolherVideoAtual());
  }, []);

  useEffect(() => {
    const media = window.matchMedia(QUERY_VERTICAL);
    const aoMudar = () => {
      setVideoId((atual) => (atual ? escolherVideoAtual() : atual));
    };

    media.addEventListener?.('change', aoMudar);
    window.addEventListener('orientationchange', aoMudar);
    return () => {
      media.removeEventListener?.('change', aoMudar);
      window.removeEventListener('orientationchange', aoMudar);
    };
  }, []);

  return (
    <section className={styles.abaixo} aria-label="Conheça tudo que a ConviteIA oferece">
      <div className={styles.videoSecao}>
        <div className={styles.cabecalho}>
          <span>Veja na prática</span>
          <h2>Seu convite é só o começo.</h2>
          <p>
            Veja como a ConviteIA transforma a criação do convite em uma experiência completa para organizar o evento e cuidar dos convidados.
          </p>
        </div>

        <div className={styles.videoPalco}>
          <div className={styles.videoMoldura}>
            {videoId ? (
              <iframe
                key={videoId}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                title="Demonstração da ConviteIA"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button type="button" className={styles.videoCapa} onClick={iniciarVideo} aria-label="Reproduzir vídeo de demonstração da ConviteIA">
                <span className={styles.videoMarca}>
                  <Image src="/brands/convite/icone-512.png" alt="" width={88} height={88} aria-hidden="true" />
                </span>
                <span className={styles.videoTexto}>
                  <strong>Veja o ConviteIA funcionando</strong>
                  <small>O vídeo se adapta automaticamente à orientação da sua tela.</small>
                </span>
                <span className={styles.play}><Play className="h-7 w-7" fill="currentColor" /></span>
              </button>
            )}
          </div>
          <p className={styles.videoNota}>Celular em pé usa a versão vertical. Desktop, tablet largo ou celular deitado usam a versão horizontal.</p>
        </div>
      </div>

      <div className={styles.recursosSecao}>
        <div className={styles.cabecalho}>
          <span>Do convite à gestão do evento</span>
          <h2>Mais do que criar uma página bonita.</h2>
          <p>
            A ConviteIA reúne criação, convidados, comunicação, organização do dia e lembranças do evento sem obrigar você a montar vários sistemas separados.
          </p>
        </div>

        <div className={styles.recursosGrid}>
          {recursos.map(({ Icon, titulo, texto, itens }) => (
            <article key={titulo} className={styles.recursoCard}>
              <span className={styles.icone}><Icon className="h-6 w-6" /></span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
              <ul>
                {itens.map((item) => <li key={item}><Check className="h-3.5 w-3.5" />{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.destaquesLinha} aria-label="Recursos adicionais do convite">
        <span><Palette className="h-4 w-4" />Visual totalmente personalizável</span>
        <span><CalendarDays className="h-4 w-4" />Data, contagem, calendário e mapa</span>
        <span><Shirt className="h-4 w-4" />Padrinhos e dress code</span>
        <span><LayoutGrid className="h-4 w-4" />Mesas e operação do evento</span>
        <span><WalletCards className="h-4 w-4" />Presentes e financeiro</span>
      </div>

      <div className={styles.comoFunciona}>
        <div className={styles.cabecalho}>
          <span>Simples do começo ao fim</span>
          <h2>Crie. Publique. Gerencie.</h2>
        </div>
        <div className={styles.passosGrid}>
          {passos.map((passo) => (
            <article key={passo.numero}>
              <span>{passo.numero}</span>
              <h3>{passo.titulo}</h3>
              <p>{passo.texto}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.precosSecao}>
        <div className={styles.cabecalho}>
          <span>Escolha só o que fizer sentido</span>
          <h2>Um convite completo, com adicionais opcionais.</h2>
          <p>Você pode publicar apenas o convite ou acrescentar Memórias e WhatsApp ao evento.</p>
        </div>

        <div className={styles.precosGrid}>
          <article className={`${styles.precoCard} ${styles.precoPrincipal}`}>
            <span>Convite completo</span>
            <strong>R$ 29,90</strong>
            <p>Pagamento único por convite. Publicado para sempre.</p>
            <ul>
              <li><CheckCircle2 className="h-4 w-4" />Criação e personalização</li>
              <li><CheckCircle2 className="h-4 w-4" />RSVP, presentes e recados</li>
              <li><CheckCircle2 className="h-4 w-4" />Gestão do Evento</li>
            </ul>
          </article>

          <article className={styles.precoCard}>
            <span>Memórias do Evento</span>
            <strong>+ R$ 19,90</strong>
            <p>Adicional por convite.</p>
            <ul>
              <li><CheckCircle2 className="h-4 w-4" />Fotos e vídeos por QR</li>
              <li><CheckCircle2 className="h-4 w-4" />Álbum e slideshow</li>
              <li><CheckCircle2 className="h-4 w-4" />Modo Festa</li>
            </ul>
          </article>

          <article className={styles.precoCard}>
            <span>WhatsApp do Evento</span>
            <strong>+ R$ 19,90</strong>
            <p>Adicional por convite.</p>
            <ul>
              <li><CheckCircle2 className="h-4 w-4" />Primeira comunicação</li>
              <li><CheckCircle2 className="h-4 w-4" />Lembrete programado</li>
              <li><CheckCircle2 className="h-4 w-4" />Até 2 comunicações por contato/família</li>
            </ul>
          </article>
        </div>

        <div className={styles.mensal}>
          <div>
            <span>Cria convites com frequência?</span>
            <strong>Convites à vontade · R$ 149,90/mês</strong>
            <p>Convites ilimitados enquanto o plano estiver ativo. Os convites já publicados continuam no ar mesmo se o plano for cancelado.</p>
          </div>
          <Link href="/convite/criar" className={styles.botaoSecundario}>Criar convite <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className={styles.ctaFinal}>
        <Image src="/brands/convite/icone-512.png" alt="Convite IA" width={74} height={74} />
        <span>Seu evento começa antes da festa.</span>
        <h2>Crie o convite. Organize o evento. Guarde as memórias.</h2>
        <p>Comece contando sua ideia para a IA ou monte cada detalhe do zero.</p>
        <div className={styles.ctaBotoes}>
          <a href="#cv-landing-titulo" className={styles.botaoPrincipal}><Sparkles className="h-4 w-4" />Começar com IA</a>
          <Link href="/convite/criar" className={styles.botaoSecundario}>Criar do zero <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className={styles.rodape}>
        <SuporteWhatsapp assunto="Tenho uma dúvida sobre a ConviteIA" />
        <RodapeMarca />
      </div>
    </section>
  );
}
