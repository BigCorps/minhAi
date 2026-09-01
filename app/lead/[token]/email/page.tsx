// app/lead/[token]/email/page.tsx
//
// Passo 2 do funil /lead: captura o e-mail do lead e dispara a
// confirmação mock (PIX ou agendamento) via Edge Function
// enviar-email-demo. Depois do envio, mostra os 2 botões lado a lado
// (continuar para WhatsApp | banner de cadastro), conforme roteiro.
//
// Server component que busca a sessão (mesmo padrão de
// app/lead/[token]/page.tsx) e delega a interatividade para o client
// component EmailStepClient.

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-server';
import EmailStepClient from './EmailStepClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function LeadEmailStepPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from('demo_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  // Mesma decisão confirmada em /lead/[token]: sem recuperação parcial.
  if (error || !session) notFound();

  // Se o objetivo ainda não foi cumprido no Passo 1, não faz sentido
  // estar aqui — o e-mail de confirmação depende de saber o que
  // confirmar (pedido ou horário). Redireciona de volta ao Passo 1.
  if (!session.objetivo_cumprido) notFound();

  return (
    <EmailStepClient
      token={token}
      nomeNegocio={session.nome_negocio}
      produto={session.produto}
      preco={session.preco}
      ramo={session.ramo}
      nomeLead={session.nome_lead}
      horarioMarcado={session.horario_marcado}
      emailJaInformado={session.email}
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
    title: session ? `Confirmação por e-mail — ${session.nome_negocio}` : 'Demonstração — minhAi',
  };
}