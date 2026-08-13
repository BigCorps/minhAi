'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RendaBackground from '@/components/conviteria/RendaBackground';
import RodapeMarca from '@/components/conviteria/RodapeMarca';
import SuporteWhatsapp from '@/components/conviteria/SuporteWhatsapp';
import { createClient } from '@/lib/supabase-browser';

export default function PaginaInicialConvite() {
  // Sem isto a home fica identica antes e depois de entrar, e o usuario
  // conclui que o login falhou — foi exatamente o que aconteceu. Mesmo
  // padrao do /consultatec: getUser no mount + onAuthStateChange para
  // refletir login e logout feitos em outra aba.
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
      
      {/* Logo Centralizado */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/brands/convite/marca-256.png"
          alt="Logo Convite IA"
          width={128}
          height={128}
          className="object-contain"
          priority
        />
      </div>

      {/* Bloco de Título principal */}
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        Seu evento merece um <br className="hidden md:block" />
        <span className="text-[#d86090]">Convite Inteligente</span>
      </h1>
      
      {/* Subtítulo de apresentação usando a cor --wz-suave */}
      <p className="text-lg md:text-xl text-[#6b6b73] max-w-2xl mb-12 leading-relaxed">
        Crie convites digitais elegantes, gerencie confirmações de presença e 
        encante seus convidados em minutos com a ConviteIA.
      </p>

      {/* Botões de Ação alinhados ao estilo .wz-btn */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
        <Link
          href="/convite/criar"
          className="flex items-center justify-center px-8 py-4 bg-[#d86090] text-white font-bold rounded-full shadow-sm hover:brightness-95 transition-all duration-200"
        >
          Criar meu convite
        </Link>
        
        {/* `logado === null` = ainda verificando. Renderizar "Entrar" nesse
            intervalo faria o botao piscar para quem ja tem sessao. */}
        <Link
          href={logado ? '/convite/painel' : '/convite/entrar'}
          className="flex items-center justify-center px-8 py-4 bg-white text-[#6b6b73] font-bold rounded-full shadow-sm border border-[#e4e4e7] hover:border-[#d9c2cc] hover:text-[#a04a63] transition-all duration-200"
          style={{ visibility: logado === null ? 'hidden' : 'visible' }}
        >
          {logado ? 'Meus convites' : 'Entrar'}
        </Link>
      </div>

      <div className="mt-12">
        <SuporteWhatsapp assunto="Tenho uma dúvida sobre a ConviteIA" />
      </div>

      <div className="mt-6"><RodapeMarca /></div>
    </main>
  );
}