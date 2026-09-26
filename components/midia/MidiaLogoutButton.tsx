'use client';

import { LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function MidiaLogoutButton() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = window.location.hostname.endsWith('midia.pro') ? '/' : '/midia';
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" /> {loading ? 'Saindo…' : 'Sair'}
    </button>
  );
}
