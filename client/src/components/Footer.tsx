import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react';

/**
 * Footer Component - BigCorps
 * Design: Modernismo Corporativo
 * - Informações de contato e links
 * - Redes sociais integradas
 * - Design responsivo
 */

export default function Footer() {
  return (
    <footer className="bg-[#2C3E50] text-white py-12 md:py-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center font-bold">
                B
              </div>
              <span className="font-bold text-lg">BigCorps</span>
            </div>
            <p className="text-gray-300 text-sm">
              Automações com Agentes de IA para sua empresa
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-4">Navegação</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/" className="hover:text-[#FF6B35] transition-colors">Home</a></li>
              <li><a href="/solucoes" className="hover:text-[#FF6B35] transition-colors">Soluções</a></li>
              <li><a href="/duvidas" className="hover:text-[#FF6B35] transition-colors">Dúvidas</a></li>
              <li><a href="/utilitarios" className="hover:text-[#FF6B35] transition-colors">Utilitários</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-bold text-white mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FF6B35]" />
                <a href="tel:+5511987311425" className="hover:text-[#FF6B35] transition-colors">
                  (11) 98731-1425
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FF6B35]" />
                <a href="mailto:contato@bigcorps.com.br" className="hover:text-[#FF6B35] transition-colors">
                  contato@bigcorps.com.br
                </a>
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h4 className="font-bold text-white mb-4">Redes Sociais</h4>
            <div className="flex gap-4">
              <a
                href="https://wa.me/5511987311425"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#FF6B35] flex items-center justify-center hover:bg-[#FF8C5A] transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/bigcorps"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#FF6B35] flex items-center justify-center hover:bg-[#FF8C5A] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>
              BigCorps Tecnologia | CNPJ: 14.282.244/0001-19
            </p>
            <p className="mt-4 md:mt-0">
              © {new Date().getFullYear()} Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
