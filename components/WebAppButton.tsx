'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface WebAppButtonProps {
  userId: string;
}

export function WebAppButton({ userId }: WebAppButtonProps) {
  const [state, setState] = useState<'loading' | 'eligible_inactive' | 'active' | 'ineligible'>('loading');
  const [webappSlug, setWebappSlug] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const supabase = createClient();

      // 1. Verificar plano Consulting ativo
      const { data: credits } = await supabase
        .from('user_credits')
        .select('has_active_plan, plan_expires_at, active_plan_id')
        .eq('user_id', userId)
        .single();

      if (!credits?.has_active_plan || !credits?.plan_expires_at) {
        setState('ineligible'); return;
      }
      if (new Date(credits.plan_expires_at) <= new Date()) {
        setState('ineligible'); return;
      }

      const { data: pkg } = await supabase
        .from('credits_packages')
        .select('has_consultoria')
        .eq('id', credits.active_plan_id)
        .single();

      if (!pkg?.has_consultoria) {
        setState('ineligible'); return;
      }

      // 2. Verificar se já tem webapp configurado
      const { data: company } = await supabase
        .from('companies')
        .select('slug, webapp_enabled')
        .eq('user_id', userId)
        .eq('webapp_enabled', true)
        .maybeSingle();

      if (company?.webapp_enabled) {
        setWebappSlug(company.slug);
        setState('active');
      } else {
        setState('eligible_inactive');
      }
    }
    check();
  }, [userId]);

  if (state === 'loading' || state === 'ineligible') return null;

  // WebApp já ativo — botão de acesso rápido
  if (state === 'active' && webappSlug) {
    return (
      <a
        href={`https://${webappSlug}.minhai.app`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
          marginTop: 8,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        {/* Globe SVG */}
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        {webappSlug}.minhai.app
        {/* External link SVG */}
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  // Elegível mas não configurado — CTA para configurar
  return (
    <a
      href="/dashboard/webapp"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#fff',
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 14,
        textDecoration: 'none',
        boxShadow: '0 2px 12px rgba(249,115,22,0.3)',
        marginTop: 8,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {/* Sparkle SVG */}
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
      Ativar seu WebApp
    </a>
  );
}