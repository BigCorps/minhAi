// app/lead/[token]/page.tsx
//
// Passo 1 do funil /lead: demo ao vivo na página. Busca a demo_session
// via GET /api/demo/[token], renderiza o header com o nome do negócio
// e hospeda o LeadDemoAssistant.
//
// Diferenças propositais em relação a app/ia/[slug]/page.tsx (que
// serviu de referência visual/estrutural):
// - Sem checkUserAccess/checkWebappEligibility (demo é sempre livre)
// - Sem Kiosk mode, fullscreen, swipe entre modos, wake lock
// - Sem SlugHeaderWrapper/SlugFooter (acoplados a company real)
// - Sem layout.tsx próprio (decisão confirmada: tudo aqui)
// - Tema dark fixo, sem webapp_theme_color variável (decisão confirmada)
// - createAdminClient vem de '@/lib/supabase-server' (mesmo arquivo já
//   validado em lib/demo-token.ts), não de '@/lib/supabase-admin'

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-server';
import LeadDemoPageClient from './LeadDemoPageClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LeadDemoPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  // Decisão confirmada: sem recuperação parcial. Se não existe ou
  // expirou, 404 — o frontend (link /lead inicial) é o único caminho
  // de entrada válido para começar um novo funil.
  if (error || !session) notFound();

  return (
    <LeadDemoPageClient
      token={token}
      ramo={session.ramo}
      nomeNegocio={session.nome_negocio}
      produto={session.produto}
      preco={session.preco}
      nomeLead={session.nome_lead}
      objetivoCumprido={session.objetivo_cumprido}
      context={session.context || []}
      temEmail={!!session.email}
      temPhone={!!session.phone}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('demo_sessions')
    .select('nome_negocio')
    .eq('token', token)
    .maybeSingle();

  if (!session) {
    return { title: 'Demonstração — minhAi' };
  }

  return {
    title: `Demonstração: ${session.nome_negocio} — minhAi`,
    description: `Veja como seria o assistente de IA da ${session.nome_negocio} com a minhAi.`,
  };
}

// Tema dark fixo, sem cor de marca variável (decisão confirmada —
// diferente de /ia/[slug], que usa webapp_theme_color por empresa).
export const viewport = {
  themeColor: '#0A1628',
};