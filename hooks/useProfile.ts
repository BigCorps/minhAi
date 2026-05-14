'use client';

// ============================================================
// hooks/useProfile.ts
//
// Hook global para gerenciar o perfil logado no slug.
// Lê o token de localStorage e valida via Edge Function.
//
// Uso:
//   const { profile, loading, login, logout, register } = useProfile(slug);
//
// O token fica em: localStorage['profile_session_{slug}']
// ============================================================

import { useState, useEffect, useCallback } from 'react';

export interface SlugProfile {
  id: string;
  company_id: string;
  tipo: 'cliente' | 'totem' | 'frentista' | 'atendente' | 'caixa' | 'gerente' | 'colaborador' | 'administrador';
  nome: string;
  email?: string | null;
  identificador?: string | null;
  telefone?: string | null; // ✅ ADICIONADO
  endereco?: string | null;
  metadata?: Record<string, any>;
}

interface UseProfileReturn {
  profile: SlugProfile | null;
  loading: boolean;
  token: string | null;
  login: (identifier: string, senha?: string) => Promise<{ success: boolean; error?: string; profileId?: string; nome?: string }>;
  register: (fields: Record<string, string>) => Promise<{ success: boolean; error?: string; profileId?: string; nome?: string }>;
  logout: () => Promise<void>;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useProfile(slug: string): UseProfileReturn {
  const [profile, setProfile] = useState<SlugProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `profile_session_${slug}`;

  // Chamar a Edge Function auth-profile
  const callAuthProfile = useCallback(async (body: Record<string, any>) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/auth-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  // Validar token salvo no localStorage ao montar
  useEffect(() => {
    async function validate() {
      setLoading(true);
      try {
        const savedToken = localStorage.getItem(storageKey);
        if (!savedToken) {
          setLoading(false);
          return;
        }

        const data = await callAuthProfile({ action: 'validate', token: savedToken });

        if (data.profile) {
          console.log('🔍 Profile recebido da Edge Function:', data.profile); // ✅ DEBUG
          setProfile(data.profile);
          setToken(savedToken);
        } else {
          // Token inválido ou expirado — limpar
          localStorage.removeItem(storageKey);
        }
      } catch (err) {
        console.error('useProfile validate error:', err);
        localStorage.removeItem(storageKey);
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [slug]);

  // Login com identificador (email ou telefone)
  const login = useCallback(async (
    identifier: string,
    senha?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await callAuthProfile({
        action: 'login',
        slug,
        identifier,
        senha,
      });

      if (data.error) return { success: false, error: data.error };

      console.log('🔍 Login - Profile recebido:', data.profile); // ✅ DEBUG

      localStorage.setItem(storageKey, data.token);
      setToken(data.token);
      setProfile(data.profile);

      // Emite evento global para que outros componentes saibam
      window.dispatchEvent(new CustomEvent('eai:profileLogin', { detail: data.profile }));

      return { success: true, profileId: data.profile?.id, nome: data.profile?.nome };
    } catch (err) {
      return { success: false, error: 'Erro ao fazer login' };
    }
  }, [slug]);

  // Cadastro de novo cliente
  const register = useCallback(async (
    fields: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await callAuthProfile({
        action: 'register',
        slug,
        fields,
      });

      if (data.error) return { success: false, error: data.error };

      console.log('🔍 Register - Profile recebido:', data.profile); // ✅ DEBUG

      localStorage.setItem(storageKey, data.token);
      setToken(data.token);
      setProfile(data.profile);

      window.dispatchEvent(new CustomEvent('eai:profileLogin', { detail: data.profile }));

      return { success: true, profileId: data.profile?.id, nome: data.profile?.nome };
    } catch (err) {
      return { success: false, error: 'Erro ao criar conta' };
    }
  }, [slug]);

  // Logout
  const logout = useCallback(async () => {
    try {
      const savedToken = localStorage.getItem(storageKey);
      if (savedToken) {
        await callAuthProfile({ action: 'logout', token: savedToken });
        localStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.error('useProfile logout error:', err);
    } finally {
      setProfile(null);
      setToken(null);
      window.dispatchEvent(new CustomEvent('eai:profileLogout'));
    }
  }, [slug]);

  return { profile, loading, token, login, logout, register };
}
