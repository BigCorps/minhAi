'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-3">
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.name || 'User'}
            className="w-10 h-10 rounded-full border-2 border-gray-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {user.user_metadata?.name || user.email}
          </p>
          <p className="text-xs text-gray-500">
            {user.email}
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saindo...' : 'Sair'}
      </button>
    </div>
  );
}