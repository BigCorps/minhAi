'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface UserProfileProps {
  user: any;
}

export function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'https://itend.com.br';
  }

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();
  
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const showImage = avatarUrl && !imageError;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
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
          <p className="text-sm font-semibold text-gray-900">
            {displayName}
          </p>
          <p className="text-xs text-gray-500">
            {user.email}
          </p>
        </div>
        
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform hidden md:block ${isOpen ? 'rotate-180' : ''}`} 
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
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center space-x-3">
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
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
