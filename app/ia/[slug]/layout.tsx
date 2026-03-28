// ============================================================
// app/ia/[slug]/layout.tsx
//
// Layout compartilhado entre todas as rotas do slug.
// Carrega dados da empresa via SSR e passa para o SlugHeader
// via Client Component wrapper (SlugHeaderWrapper).
//
// Estrutura de rotas que este layout cobre:
//   /ia/[slug]                 → hub principal (assistente)
//   /ia/[slug]/vendas          → modo venda
//   /ia/[slug]/kiosk           → modo kiosk fullscreen
//   /ia/[slug]/atendimento     → fila de atendimento
//   /ia/[slug]/propaganda      → slideshow/vitrine
//   /ia/[slug]/arquivos        → documentos
//   /ia/[slug]/login           → autenticação de perfil
//   /ia/[slug]/perfil/[tipo]/[id] → área do usuário logado
// ============================================================

import { createAdminClient } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import SlugHeaderWrapper from './SlugHeaderWrapper';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, assistant_role, webapp_theme_color')
    .eq('slug', slug)
    .single();

  if (error || !company) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      {/*
        SlugHeaderWrapper é um Client Component que gerencia:
        - estado de tema (dark/light)
        - estado de kiosk
        - estado de wake lock
        - orientação (portrait/landscape)
        E renderiza o SlugHeader com todos os handlers.
      */}
      <SlugHeaderWrapper company={company} />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
