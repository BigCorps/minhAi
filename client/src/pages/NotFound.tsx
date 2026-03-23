import { Link } from 'wouter';
import { ArrowLeft, Home } from 'lucide-react';

/**
 * NotFound Page - 404
 * Design: Modernismo Corporativo com Gradientes Dinâmicos
 */

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-gray-50">
      <div className="container text-center">
        <div className="mb-8">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A]">
            404
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-[#2C3E50] mb-4">
          Página não encontrada
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Desculpe, a página que você está procurando não existe ou foi movida. Vamos ajudá-lo a voltar ao caminho certo.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/">
            <a className="btn-primary inline-flex items-center justify-center gap-2">
              <Home className="w-5 h-5" />
              Voltar para Home
            </a>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
