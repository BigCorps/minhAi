import "server-only";
import { adminConviteria, adminPublic } from './servidor';

export const CONVITEIA_PARTNER_COOKIE = 'conviteia_partner';
export const CONVITEIA_PARTNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[a-f0-9]{24}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;

export async function parceiroConviteiaPorSlug(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  const d = adminPublic();
  const { data: program } = await d.from('partner_programs').select('id').eq('product', 'conviteia').eq('status', 'active').maybeSingle();
  if (!program) return null;
  const { data: link } = await d.from('partner_links').select('id,code,slug,membership_id').eq('program_id', program.id).eq('slug', slug).eq('status', 'active').maybeSingle();
  if (!link || !CODE_RE.test(String(link.code))) return null;
  const { data: membership } = await d.from('partner_memberships').select('partner_id,status').eq('id', link.membership_id).eq('program_id', program.id).maybeSingle();
  if (!membership || membership.status !== 'active') return null;
  const { data: partner } = await d.from('partners').select('company_name').eq('id', membership.partner_id).maybeSingle();
  if (!partner) return null;
  return { code: String(link.code), slug: String(link.slug), partnerName: String(partner.company_name) };
}

export async function registrarAtribuicaoParceiroConvite(eventoId: string, code: string) {
  if (!UUID_RE.test(eventoId) || !CODE_RE.test(code)) return null;
  const d = adminPublic();
  const { data: referralId, error } = await d.rpc('partner_record_referral', {
    p_code: code,
    p_referred_reference: `conviteia:event:${eventoId}`,
  });
  if (error || typeof referralId !== 'string' || !UUID_RE.test(referralId)) return null;

  const admin = adminConviteria();
  const { error: insertError } = await admin.from('evento_partner_attributions').insert({
    evento_id: eventoId,
    referral_id: referralId,
  });
  if (insertError && insertError.code !== '23505') throw insertError;
  if (!insertError) return referralId;
  const { data: existing } = await admin.from('evento_partner_attributions').select('referral_id').eq('evento_id', eventoId).maybeSingle();
  return existing?.referral_id ?? null;
}

export async function beneficioMemoriasParceiro(eventoId: string) {
  if (!UUID_RE.test(eventoId)) return { eligible: false, referralId: null as string | null, benefitStatus: 'none' };
  const admin = adminConviteria();
  const { data: attribution } = await admin.from('evento_partner_attributions').select('referral_id').eq('evento_id', eventoId).maybeSingle();
  if (!attribution?.referral_id) return { eligible: false, referralId: null as string | null, benefitStatus: 'none' };

  const d = adminPublic();
  const { data: referral } = await d.from('partner_referrals').select('id,program_id,status,benefit_id,benefit_status').eq('id', attribution.referral_id).maybeSingle();
  if (!referral || referral.status === 'cancelled') return { eligible: false, referralId: attribution.referral_id as string, benefitStatus: referral?.benefit_status ?? 'none' };
  const { data: program } = await d.from('partner_programs').select('id,product,status').eq('id', referral.program_id).maybeSingle();
  if (!program || program.product !== 'conviteia' || program.status !== 'active') return { eligible: false, referralId: referral.id as string, benefitStatus: referral.benefit_status };
  const { data: benefit } = await d.from('partner_benefits').select('id').eq('program_id', program.id).eq('code', 'memorias_free').eq('enabled', true).maybeSingle();
  if (!benefit) return { eligible: false, referralId: referral.id as string, benefitStatus: referral.benefit_status };
  if (referral.benefit_id && referral.benefit_id !== benefit.id) return { eligible: false, referralId: referral.id as string, benefitStatus: referral.benefit_status };
  return {
    eligible: ['referred', 'qualified'].includes(String(referral.status)) || (referral.status === 'converted' && ['pending', 'granted'].includes(String(referral.benefit_status))),
    referralId: referral.id as string,
    benefitStatus: String(referral.benefit_status || 'none'),
  };
}

export async function converterIndicacaoParceiroConvite(eventoId: string) {
  if (!UUID_RE.test(eventoId)) return null;
  const admin = adminConviteria();
  const { data: attribution } = await admin.from('evento_partner_attributions').select('referral_id').eq('evento_id', eventoId).maybeSingle();
  if (!attribution?.referral_id) return null;
  const { data: evento } = await admin.from('eventos').select('origem_plano,publicado_em,pix_transaction_id').eq('id', eventoId).maybeSingle();
  if (!evento || evento.origem_plano !== 'avulso' || !evento.publicado_em || !evento.pix_transaction_id) return null;
  const d = adminPublic();
  const { data: transaction } = await d.from('pix_transactions').select('status,amount_cents').eq('id', evento.pix_transaction_id).maybeSingle();
  if (!transaction || transaction.status !== 'confirmed' || Number(transaction.amount_cents) <= 0) return null;
  const { data, error } = await d.rpc('partner_convert_referral', {
    p_referral: attribution.referral_id,
    p_value_cents: Number(transaction.amount_cents),
    p_benefit_code: 'memorias_free',
  });
  if (error || !data) throw error ?? new Error('partner_conversion_failed');
  const value = data as Record<string, unknown>;
  return {
    referralId: String(value.referralId || attribution.referral_id),
    status: String(value.status || ''),
    benefitStatus: String(value.benefitStatus || 'none'),
  };
}

export async function marcarBeneficioParceiroConcedido(referralId: string) {
  if (!UUID_RE.test(referralId)) return false;
  const { data, error } = await adminPublic().rpc('partner_mark_benefit_granted', {
    p_referral: referralId,
    p_benefit_code: 'memorias_free',
  });
  if (error) throw error;
  return Boolean(data);
}
