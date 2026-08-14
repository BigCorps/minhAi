'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RendaBackground from '@/components/conviteria/RendaBackground';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import BriefingInteligente from '@/components/conviteria/BriefingInteligente';
import { createClient } from '@/lib/supabase-browser';

export default function PaginaInicialConvite() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLogado(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      setLogado(!!sessao?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

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
          href={logado ? '/convite/painel' : '/convite/entrar'}
          className="flex items-center justify-center px-7 py-3.5 bg-white text-[#6b6b73] font-bold rounded-full shadow-sm border border-[#e4e4e7] hover:border-[#d9c2cc] hover:text-[#a04a63] transition-all duration-200"
          style={{ visibility: logado === null ? 'hidden' : 'visible' }}
        >
          {logado ? 'Meus convites' : 'Entrar'}
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
