import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'wouter';

/**
 * Header Component - BigCorps
 * Design: Modernismo Corporativo com Gradientes Dinâmicos
 * - Logo e navegação horizontal
 * - Menu responsivo para mobile
 * - Estilo limpo com tipografia Poppins
 */

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Soluções', href: '/solucoes' },
    { label: 'Dúvidas', href: '/duvidas' },
    { label: 'Utilitários', href: '/utilitarios' },
    { label: 'Contato', href: '/contato' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 font-bold text-2xl md:text-3xl">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8C5A] flex items-center justify-center text-white font-bold text-lg">
              B
            </div>
            <span className="hidden sm:inline text-[#2C3E50]">BigCorps</span>
          </a>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className="text-[#2C3E50] font-medium hover:text-[#FF6B35] transition-colors duration-300 text-sm lg:text-base">
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        {/* CTA Button - Desktop */}
        <div className="hidden md:block">
          <a
            href="https://wa.me/5511987311425"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            WhatsApp
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6 text-[#2C3E50]" />
          ) : (
            <Menu className="w-6 h-6 text-[#2C3E50]" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white">
          <div className="container py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className="text-[#2C3E50] font-medium hover:text-[#FF6B35] transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              </Link>
            ))}
            <a
              href="https://wa.me/5511987311425"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-center mt-2"
              onClick={() => setIsMenuOpen(false)}
            >
              WhatsApp
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
