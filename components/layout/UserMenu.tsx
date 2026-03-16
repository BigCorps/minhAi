'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import Link from 'next/link';
import { User, CreditCard, LogOut } from 'lucide-react';

interface UserMenuProps {
  user: any;
  theme: 'dark' | 'light';
}

export function UserMenu({ user, theme }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'https://minhai.app';
  }

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();
  
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const showImage = avatarUrl && !imageError;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
          theme === 'dark'
            ? 'hover:bg-white/5'
            : 'hover:bg-gray-100'
        }`}
      >
        {showImage ? (
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-2 ring-orange-500">
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">
              {initial}
            </span>
          </div>
        )}
        
        <div className="hidden md:block text-left">
          <p className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {displayName}
          </p>
          <p className={`text-xs ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-500'
          }`}>
            {user.email}
          </p>
        </div>
        
        <svg 
          className={`w-4 h-4 transition-transform hidden md:block ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-500'
          } ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl border py-2 z-50 ${
            theme === 'dark'
              ? 'bg-slate-800 border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            {/* User Info */}
            <div className={`px-4 py-3 border-b flex items-center space-x-3 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-100'
            }`}>
              {showImage ? (
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-orange-500">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {initial}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {displayName}
                </p>
                <p className={`text-xs truncate ${
                  theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                }`}>
                  {user.email}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/perfil"
                onClick={() => setIsOpen(false)}
                className={`w-full px-4 py-3 text-left text-sm transition flex items-center space-x-3 ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Perfil</span>
              </Link>

              <Link
                href="/credits"
                onClick={() => setIsOpen(false)}
                className={`w-full px-4 py-3 text-left text-sm transition flex items-center space-x-3 ${
                  theme === 'dark'
                    ? 'text-white hover:bg-white/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Pacotes</span>
              </Link>
            </div>

            {/* Logout */}
            <div className={`border-t pt-2 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-100'
            }`}>
              <button
                onClick={handleLogout}
                className={`w-full px-4 py-3 text-left text-sm transition flex items-center space-x-3 ${
                  theme === 'dark'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
