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
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.042 8.486C3.272 6.365 5.01 5 7 5c1.237 0 2.384.489 3.419 1.349.547.456 1.101 1.03 1.581 1.735.48-.705 1.034-1.279 1.581-1.735C14.616 5.49 15.763 5 17 5c1.99 0 3.728 1.365 4.958 3.486C23.224 10.58 24 13.225 24 16c0 .88-.1 1.67-.308 2.346-.214.694-.557 1.282-1.03 1.707-.487.437-1.077.647-1.712.647-1.09 0-2.147-.6-3.158-1.782-.566-.657-1.145-1.528-1.745-2.608l-.59-1.052-.42-.78-.26-.497-.3.497-.43.78-.59 1.052c-.6 1.08-1.179 1.951-1.745 2.608C11.001 19.8 9.944 20.4 8.854 20.4c-.79 0-1.488-.282-2.02-.79-.52-.497-.866-1.19-1.06-2.002A8.94 8.94 0 0 1 5.5 16c0-2.775.776-5.42 2.042-7.514H2.042z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
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