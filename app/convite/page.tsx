import Link from 'next/link';

export default function PaginaInicialConvite() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-24 text-center">
      
      {/* Bloco de Título principal */}
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        Seu evento merece um{' '}
        <span className="text-orange-500">Convite IA</span>
      </h1>
      
      {/* Subtítulo de apresentação */}
      <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-12 leading-relaxed">
        Crie convites digitais elegantes, gerencie confirmações de presença e 
        encante seus convidados em minutos com a ajuda da Inteligência Artificial.
      </p>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
        <Link
          href="/convite/criar"
          className="flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-semibold rounded-xl shadow-sm hover:bg-orange-600 transition-colors duration-200"
        >
          Criar meu convite
        </Link>
        
        <Link
          href="/convite/entrar"
          className="flex items-center justify-center px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors duration-200"
        >
          Acessar meu painel
        </Link>
      </div>

    </main>
  );
}