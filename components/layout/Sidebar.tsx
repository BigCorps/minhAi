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
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973.14.604.375 1.153.693 1.604.278.395.609.704.979.904.37.2.785.3 1.219.3 1.089 0 2.058-.542 2.979-1.452.823-.812 1.642-1.995 2.494-3.323l.925-1.482.033-.053.228-.367.153-.245.393-.634.468-.752.01-.017c.002.002.003.004.005.006l.16.252.193.305.229.364.038.06.47.753.386.622.15.24.243.39c.836 1.329 1.634 2.49 2.432 3.29.902.905 1.862 1.449 2.936 1.449.434 0 .849-.1 1.219-.3.37-.2.701-.509.979-.904.318-.451.553-1 .693-1.604.14-.604.21-1.267.21-1.973 0-2.566-.704-5.241-2.044-7.306-1.188-1.833-2.903-3.113-4.871-3.113-.547 0-1.062.104-1.539.308a5.012 5.012 0 0 0-1.285.871c-.372.337-.694.726-.961 1.149A7.647 7.647 0 0 0 12 6.586a7.647 7.647 0 0 0-.961-1.149 5.012 5.012 0 0 0-1.285-.871C9.277 4.262 8.761 4.03 8.085 4.03H6.915zm3.1 8.003c-.007-.01-.013-.02-.02-.03l-.237-.38c-.573-.918-1.086-1.69-1.583-2.308-.724-.903-1.44-1.52-2.16-1.76a2.4 2.4 0 0 0-.5-.085H5.34c-.114 0-.228.01-.34.029-1.043.173-1.91.918-2.48 2.017C1.953 11.213 1.5 12.829 1.5 14.449c0 .558.056 1.074.167 1.524.11.45.278.835.496 1.123.156.22.34.392.545.504.204.111.434.168.676.168.619 0 1.292-.35 2.042-1.092.699-.69 1.458-1.79 2.279-3.076l.592-.949.03-.048.25-.4.157-.252.268-.43.384-.618c.02-.033.04-.065.063-.097zm1.985.123.38.607.27.432.158.253.25.398.03.048.59.946c.82 1.286 1.58 2.386 2.279 3.075.75.742 1.423 1.092 2.042 1.092.242 0 .472-.057.676-.168.205-.112.389-.284.545-.504.218-.288.386-.673.496-1.123.11-.45.167-.966.167-1.524 0-1.62-.453-3.236-1.02-4.308-.57-1.099-1.437-1.844-2.48-2.017a2.68 2.68 0 0 0-.34-.029h-.175a2.4 2.4 0 0 0-.5.085c-.72.24-1.437.857-2.16 1.76-.498.618-1.01 1.39-1.584 2.308l-.237.38c-.007.01-.013.02-.02.03z" fill="#0081FB"/>
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