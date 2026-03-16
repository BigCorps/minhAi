import { createClient } from '@/lib/supabase-server';
import ReferralLandingPage from '@/components/indicacoes/ReferralLandingPage';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function IndicaPage({ params }: PageProps) {
  const { username } = await params;
  const supabase = createClient();

  // Tentar por referral_code primeiro
  let profile = null;

  const { data: byCode } = await supabase
    .from('user_profiles')
    .select('user_id, referral_code, username')
    .eq('referral_code', username.toUpperCase())
    .maybeSingle();

  if (byCode) {
    profile = byCode;
  } else {
    const { data: byUsername } = await supabase
      .from('user_profiles')
      .select('user_id, referral_code, username')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    profile = byUsername;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-2">Link inválido</p>
          <p className="text-slate-400">Este link de indicação não existe.</p>
        </div>
      </div>
    );
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
  const referrerName = authUser?.user?.user_metadata?.name ||
                       authUser?.user?.email?.split('@')[0] ||
                       'um usuário minhAi';

  return (
    <ReferralLandingPage
      referralCode={profile.referral_code}
      referrerName={referrerName}
    />
  );
}
