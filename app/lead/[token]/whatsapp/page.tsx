// app/lead/[token]/whatsapp/page.tsx
//
// Passo 3 do funil /lead: captura o telefone do lead, persiste em
// demo_sessions.phone (usado por meta-demo-router para identificar a
// sessão quando a mensagem chegar no WhatsApp real), e mostra o
// QR code/link wa.me com o número real conectado via meta_connections
// (BigCorps, 551139519468 — confirmado pelo usuário), com mensagem
// pré-preenchida variando conforme ramo (Vendas/Agenda) e nome do
// lead (se já capturado).

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-server';
import WhatsappStepClient from './WhatsappStepClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LeadWhatsappStepPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !session) notFound();

  // Mesma decisão do Passo 2: só faz sentido estar aqui se o objetivo
  // já foi cumprido no Passo 1.
  if (!session.objetivo_cumprido) notFound();

  return (
    <WhatsappStepClient
      token={token}
      nomeNegocio={session.nome_negocio}
      produto={session.produto}
      ramo={session.ramo}
      nomeLead={session.nome_lead}
      phoneJaInformado={session.phone}
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

  return {
    title: session ? `Testar no WhatsApp — ${session.nome_negocio}` : 'Demonstração — minhAi',
  };
}