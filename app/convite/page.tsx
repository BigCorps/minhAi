'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Palette,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import RendaBackground from '@/components/conviteria/RendaBackground';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import BriefingInteligente from '@/components/conviteria/BriefingInteligente';
import { createClient } from '@/lib/supabase-browser';

export default function PaginaInicialConvite() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [criando, setCriando] = useState(false);
  const [briefingTexto, setBriefingTexto] = useState('');
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLogado(!!data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      setLogado(!!sessao?.user);
      if (!sessao?.user) setCriando(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (logado === null) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <RendaBackground />
        <Image
          src="/brands/convite/icone-512.png"
          alt="Convite IA"
          width={72}
          height={72}
          className="animate-pulse"
          priority
        />
      </main>
    );
  }

  if (logado) {
    if (criando) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-5 md:p-10 text-[#40232c]">
          <RendaBackground />

          <div className="w-full max-w-3xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCriando(false)}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#7c5560]"
                style={{ borderColor: '#c0607833' }}
              >
                ← Voltar
              </button>

              <Link
                href="/convite/criar"
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#a04a63]"
                style={{ borderColor: '#c0607833' }}
              >
                Começar do zero
              </Link>
            </div>

            <BriefingInteligente />
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen grid place-items-center p-5 md:p-10 text-[#40232c]">
        <RendaBackground />

        <div className="w-full max-w-2xl">
          <div className="mb-7 flex justify-center">
            <Image
              src="/brands/convite/icone-512.png"
              alt="Convite IA"
              width={86}
              height={86}
              priority
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/convite/painel"
              className="group rounded-3xl border bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: '#c0607833' }}
            >
              <span
                className="mb-5 grid h-12 w-12 place-items-center rounded-2xl"
                style={{ backgroundColor: '#fdf0f3', color: '#a04a63' }}
              >
                <FileText className="h-6 w-6" />
              </span>

              <h1 className="text-xl font-semibold" style={{ color: '#40232c' }}>
                Ver meus convites
              </h1>

              <p className="mt-2 text-sm leading-6" style={{ color: '#7c5560' }}>
                Edite, compartilhe e acompanhe presenças, recados e saldo.
              </p>

              <span className="mt-5 inline-flex text-sm font-semibold" style={{ color: '#a04a63' }}>
                Abrir painel →
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setCriando(true)}
              className="group rounded-3xl border bg-white p-7 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: '#c0607833' }}
            >
              <span
                className="mb-5 grid h-12 w-12 place-items-center rounded-2xl"
                style={{ backgroundColor: '#fdf0f3', color: '#a04a63' }}
              >
                <Plus className="h-6 w-6" />
              </span>

              <h2 className="text-xl font-semibold" style={{ color: '#40232c' }}>
                Criar novo convite
              </h2>

              <p className="mt-2 text-sm leading-6" style={{ color: '#7c5560' }}>
                Conte sua ideia para a IA ou comece a personalização do zero.
              </p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#a04a63' }}>
                <Sparkles className="h-4 w-4" />
                Começar
              </span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cv-landing text-[#40232c]">
      <RendaBackground />

      {/* PRIMEIRA DOBRA: identidade + criação completa, sem os benefícios. */}
      <section className="cv-landing-hero" aria-labelledby="cv-landing-titulo">
        <div className="cv-landing-hero-conteudo">
          <Image
            src="/brands/convite/icone-512.png"
            alt="Convite IA"
            width={132}
            height={132}
            className="cv-landing-logo"
            priority
          />

          <h1 id="cv-landing-titulo">
            Seu evento merece um
            <span>Convite Inteligente</span>
          </h1>

          <p className="cv-landing-subtitulo">
            Conte como será seu evento. A IA prepara o começo do convite e
            você personaliza cada detalhe.
          </p>

          <BriefingInteligente
            modo="landing"
            texto={briefingTexto}
            aoTexto={setBriefingTexto}
          />

        </div>
      </section>

      {/* A partir daqui só aparece quando o usuário rolar. */}
      <section className="cv-landing-abaixo" aria-label="Conheça a ConviteIA">
        <div className="cv-landing-beneficios-cabecalho">
          <span>Do primeiro texto ao convite publicado</span>
          <h2>Você dá a ideia. A ConviteIA organiza o resto.</h2>
        </div>

        <div className="cv-landing-beneficios-grid">
          <article>
            <span className="cv-landing-beneficio-icone">
              <Sparkles className="h-6 w-6" />
            </span>
            <h3>Comece com IA</h3>
            <p>
              Conte sua ideia naturalmente. A IA adianta tipo, estilo, nomes,
              data, recursos e outras informações que conseguir identificar.
            </p>
          </article>

          <article>
            <span className="cv-landing-beneficio-icone">
              <Palette className="h-6 w-6" />
            </span>
            <h3>Personalize tudo</h3>
            <p>
              Escolha cores, fontes, textura, envelope, foto, música, selo,
              presentes e a ordem das seções.
            </p>
          </article>

          <article>
            <span className="cv-landing-beneficio-icone">
              <UsersRound className="h-6 w-6" />
            </span>
            <h3>Cuide dos convidados</h3>
            <p>
              Centralize confirmações de presença, lista de presentes e recados
              em um único convite e acompanhe tudo pelo painel.
            </p>
          </article>
        </div>

        <div className="cv-landing-pos-beneficios">
          <SuporteWhatsapp assunto="Tenho uma dúvida sobre a ConviteIA" />
          <RodapeMarca />
        </div>
      </section>
    </main>
  );
}
