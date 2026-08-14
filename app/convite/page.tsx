'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, Plus, Sparkles } from 'lucide-react';
import RendaBackground from '@/components/conviteria/RendaBackground';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import BriefingInteligente from '@/components/conviteria/BriefingInteligente';
import { createClient } from '@/lib/supabase-browser';

export default function PaginaInicialConvite() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [criando, setCriando] = useState(false);
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-24 text-center text-[#40232c]">
      <RendaBackground />

      <div className="mb-8 flex justify-center">
        <Image
          src="/brands/convite/icone-512.png"
          alt="Logo Convite IA"
          width={128}
          height={128}
          className="object-contain"
          priority
        />
      </div>

      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        Seu evento merece um <br className="hidden md:block" />
        <span className="text-[#d86090]">Convite Inteligente</span>
      </h1>

      <p className="text-lg md:text-xl text-[#6b6b73] max-w-2xl mb-8 leading-relaxed">
        Crie convites digitais elegantes, gerencie confirmações de presença e
        encante seus convidados em minutos com a ConviteIA.
      </p>

      <BriefingInteligente />

      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
        <Link
          href="/convite/criar"
          className="flex items-center justify-center px-7 py-3.5 bg-white text-[#a04a63] font-bold rounded-full shadow-sm border border-[#e7ccd5] hover:border-[#c06078] transition-all duration-200"
        >
          Prefiro começar do zero
        </Link>

        <Link
          href="/convite/entrar"
          className="flex items-center justify-center px-7 py-3.5 bg-white text-[#6b6b73] font-bold rounded-full shadow-sm border border-[#e4e4e7] hover:border-[#d9c2cc] hover:text-[#a04a63] transition-all duration-200"
        >
          Entrar
        </Link>
      </div>

      <div className="mt-12">
        <SuporteWhatsapp assunto="Tenho uma dúvida sobre a ConviteIA" />
      </div>

      <div className="mt-6">
        <RodapeMarca />
      </div>
    </main>
  );
}
