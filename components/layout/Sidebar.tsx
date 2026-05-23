'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Bot,
  Settings,
  Wallet,
  ClipboardList,
  MessageSquare,
  Menu,
  Receipt,
  X,
  HelpCircle,
  Share2,
  FolderOpen,
  UserPlus,
  ShoppingCart,
} from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 0" fillOpacity="0"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M4.5 9.5c1-1.833 2.5-3 4-3 .9 0 1.8.4 2.65 1.1.5.42.98.95 1.35 1.6.37-.65.85-1.18 1.35-1.6C14.7 6.9 15.6 6.5 16.5 6.5c1.5 0 3 1.167 4 3 .833 1.4 1.25 3.2 1.25 5 0 .7-.083 1.35-.27 1.88-.196.558-.5 1-.9 1.27-.367.25-.783.35-1.23.35-.883 0-1.75-.55-2.6-1.65-.463-.607-.937-1.4-1.43-2.4l-.48-.98c-.12-.25-.23-.48-.34-.69-.11.21-.22.44-.34.69l-.48.98c-.493 1-.967 1.793-1.43 2.4-.85 1.1-1.717 1.65-2.6 1.65-.447 0-.863-.1-1.23-.35-.4-.27-.704-.712-.9-1.27C4.333 15.85 4.25 15.2 4.25 14.5c0-1.8.417-3.6 1.25-5zm2.1.95C5.7 12.05 5.25 13.35 5.25 14.5c0 .55.063 1.02.2 1.4.117.343.283.567.45.68.133.09.3.12.6.12.517 0 1.083-.367 1.75-1.25.4-.52.833-1.233 1.3-2.167l.48-.98.42-.86c-.3-.58-.617-1.05-.933-1.383C8.817 9.457 8.15 9 7.5 9c-.367 0-.617.15-.9.45zm7.7 3.5.48.98c.467.934.9 1.647 1.3 2.167.667.883 1.233 1.25 1.75 1.25.3 0 .467-.03.6-.12.167-.113.333-.337.45-.68.137-.38.2-.85.2-1.4 0-1.15-.45-2.45-1.35-4.05-.283-.3-.533-.45-.9-.45-.65 0-1.317.457-1.917 1.06-.316.333-.633.804-.933 1.384l.42.86-.1-.001z"/>
    </svg>
  );
}

const menuItems = [
  { href: '/dashboard',              label: 'Dashboard',                        icon: LayoutDashboard },
  { href: '/dashboard/assistentes',  label: 'Assistentes',                      icon: Bot },
  { href: '/dashboard/functions',    label: 'Funções',                          icon: Settings },
  { href: '/dashboard/vendas',       label: 'Vendas e Produtos',                icon: ShoppingCart },
  { href: '/dashboard/cadastros',    label: 'Controle de Usuários',             icon: UserPlus },
  { href: '/dashboard/producao',     label: 'Linha de Produção',                icon: ClipboardList },
  { href: '/dashboard/agenda',       label: 'Serviços Google',                  icon: GoogleIcon },
  { href: '/dashboard/atendimentos', label: 'Serviços Meta',                    icon: MetaIcon },
  { href: '/dashboard/faqs',         label: 'Respostas Rápidas',                icon: HelpCircle },
  { href: '/dashboard/fiscal',       label: 'Notas Fiscais',                    icon: Receipt },
  { href: '/dashboard/arquivos',     label: 'Arquivos',                         icon: FolderOpen },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted ? (resolvedTheme || 'dark') : 'dark';

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
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className={`absolute left-0 top-full mt-2 w-64 rounded-lg shadow-xl border py-2 z-50 ${
              theme === 'dark'
                ? 'bg-slate-800 border-white/10'
                : 'bg-white border-gray-200'
            }`}
          >
            <div
              className={`px-4 py-2 border-b mb-1 ${
                theme === 'dark' ? 'border-white/5' : 'border-gray-100'
              }`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Menu Assistentes
              </p>
            </div>

            <nav className="flex flex-col">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`w-full px-4 py-3 text-left text-sm transition flex items-center space-x-3 ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400'
                          : 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                        : theme === 'dark'
                          ? 'text-white hover:bg-white/5 border-l-2 border-transparent'
                          : 'text-gray-700 hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
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