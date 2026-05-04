// app/dashboard/assistentes/page.tsx
import { createClient, getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AssistentesClient from './AssistentesClient';
export const revalidate = 0;

export default async function AssistentesPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = createClient();

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Nova query: plano do usuário
  const { data: credits } = await supabase
    .from('user_credits')
    .select('has_active_plan, plan_expires_at, active_plan_id, active_plan_name')
    .eq('user_id', user.id)
    .single();

  // Verificar se tem plano Consulting ativo
  const planOk =
    credits?.has_active_plan &&
    credits?.plan_expires_at &&
    new Date(credits.plan_expires_at) > new Date();

  let hasConsultingPlan = false;
  if (planOk && credits?.active_plan_id) {
    const { data: pkg } = await supabase
      .from('credits_packages')
      .select('has_consultoria')
      .eq('id', credits.active_plan_id)
      .single();
    hasConsultingPlan = pkg?.has_consultoria === true;
  }

  // ID do assistente com webapp ativo (apenas 1 por conta)
  const activeWebappCompany = (companies || []).find(c => c.webapp_enabled === true);
  const activeWebappCompanyId = activeWebappCompany?.id ?? null;

  return (
    <AssistentesClient
      companies={companies || []}
      user={user}
      hasConsultingPlan={hasConsultingPlan}
      activeWebappCompanyId={activeWebappCompanyId}
    />
  );
}
