// app/dashboard/assistentes/page.tsx
import { createAdminClient, createClient, getUser } from '@/lib/supabase-server';
import { stripCompanySecrets } from '@/lib/company-security';
import { redirect } from 'next/navigation';
import AssistentesClient from './EmpresasClient';

export const revalidate = 0;

export default async function AssistentesPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // A lista pertence ao usuário autenticado. O admin é usado somente no servidor
  // para não depender de SELECT * do papel authenticated; segredos são removidos
  // antes de serializar qualquer empresa para o Client Component.
  const admin = createAdminClient();
  const { data: rawCompanies } = await admin
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const companies = (rawCompanies || []).map((company) => stripCompanySecrets(company));

  const supabase = createClient();

  const { data: credits } = await supabase
    .from('user_credits')
    .select('has_active_plan, plan_expires_at, active_plan_id, active_plan_name')
    .eq('user_id', user.id)
    .single();

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

  const activeWebappCompany = companies.find((c: any) => c.webapp_enabled === true);
  const activeWebappCompanyId = activeWebappCompany?.id ?? null;

  return (
    <AssistentesClient
      companies={companies}
      user={user}
      hasConsultingPlan={hasConsultingPlan}
      activeWebappCompanyId={activeWebappCompanyId}
    />
  );
}
