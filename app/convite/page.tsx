import Link from 'next/link';
import Image from 'next/image';

export default function PaginaInicialConvite() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-24 text-center bg-[#f7f7f8] text-[#1c1a1e]">
      
      {/* Logo Centralizado */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/public/brands/convite/marca-256.png"
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
        
        <Link
          href="/convite/entrar"
          className="flex items-center justify-center px-8 py-4 bg-white text-[#6b6b73] font-bold rounded-full shadow-sm border border-[#e4e4e7] hover:border-[#d9c2cc] hover:text-[#a04a63] transition-all duration-200"
        >
          Acessar meu painel
        </Link>
      </div>

    </main>
  );
}