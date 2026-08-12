import Link from 'next/link';
import Image from 'next/image';

export default function PaginaInicialConvite() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-24 text-center bg-slate-950 text-white">
      
      {/* Logo Centralizado */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/icones/marca-256.png"
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
        <span className="text-slate-300">Convite Inteligente</span>
      </h1>
      
      {/* Subtítulo de apresentação */}
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
        Crie convites digitais elegantes, gerencie confirmações de presença e 
        encante seus convidados em minutos com a ajuda da ConviteIA.
      </p>

      {/* Botões de Ação alinhados ao tema escuro */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
        <Link
          href="/convite/criar"
          className="flex items-center justify-center px-8 py-4 bg-white text-slate-950 font-semibold rounded-xl shadow-sm hover:bg-slate-200 transition-colors duration-200"
        >
          Criar meu convite
        </Link>
        
        <Link
          href="/convite/entrar"
          className="flex items-center justify-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl shadow-sm border border-slate-800 hover:bg-slate-800 transition-colors duration-200"
        >
          Acessar meu painel
        </Link>
      </div>

    </main>
  );
}