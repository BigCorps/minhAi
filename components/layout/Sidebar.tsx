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
  MessageSquare,
  Menu,
  X,
  HelpCircle,
  Share2,
  Calendar,  // ← NOVO: Calendário
  Mail,      // ← NOVO: Emails
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard',              label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/dashboard/assistentes',  label: 'Assistentes',        icon: Bot },
  { href: '/dashboard/functions',    label: 'Funções',            icon: Settings },
  { href: '/dashboard/faqs',         label: 'Perguntas/Respostas',icon: HelpCircle },
  { href: '/dashboard/atendimentos', label: 'Atendimentos Meta',  icon: Share2 },
  { href: '/dashboard/calendario',   label: 'Calendário',         icon: Calendar }, // ← NOVO
  { href: '/dashboard/emails',       label: 'Emails',             icon: Mail },      // ← NOVO
  { href: '/dashboard/saldo',        label: 'Recebimentos',       icon: Wallet },
  { href: '/dashboard/historico',    label: 'Histórico',          icon: MessageSquare },
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
              className={`px-4 py-3 border-b mb-2 ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-100'
              }`}
            >
              <h3
                className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Menu Principal
              </h3>
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
