'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Bot, 
  Settings, 
  DollarSign, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  theme: 'dark' | 'light';
}

const menuItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/assistentes', label: 'Assistentes', icon: Bot },
  { href: '/funcoes', label: 'Funções', icon: Settings },
  { href: '/saldo', label: 'Saldo', icon: DollarSign },
  { href: '/historico', label: 'Histórico', icon: MessageSquare },
];

export function Sidebar({ theme }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative">
      {/* Botão Hambúrguer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition ${
          theme === 'dark'
            ? 'hover:bg-white/5 text-white'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Dropdown */}
          <div className={`absolute left-0 top-full mt-2 w-64 rounded-lg shadow-xl border py-2 z-50 ${
            theme === 'dark'
              ? 'bg-slate-800 border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            {/* Header do Menu */}
            <div className={`px-4 py-2 border-b ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-500'
              }`}>
                Menu de Navegação
              </h3>
            </div>

            {/* Menu Items */}
            <nav className="py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 transition ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-blue-50 text-blue-600'
                        : theme === 'dark'
                          ? 'text-white/70 hover:bg-white/5 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}