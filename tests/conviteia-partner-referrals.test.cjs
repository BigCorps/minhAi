const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
let PGlite; try { ({ PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')); } catch {}
const base = require.resolve('../supabase/migrations/20261007005406_sdr_partner_programs.sql');
const migration = require.resolve('../supabase/migrations/20261007013000_conviteia_partner_referrals.sql');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function dbSetup() {
  const d = new PGlite();
  await d.exec(`create role anon; create role authenticated; create role service_role;
    create schema conviteria;
    create table sdr_leads(id uuid primary key,company_name text,domain text,cnpj text,source text,email text);
    create table sdr_opportunities(id uuid primary key,lead_id uuid,stage text,qualification jsonb,product text);
    create table conviteria.eventos(id uuid primary key);
    create table conviteria.evento_memorias_config(evento_id uuid primary key references conviteria.eventos(id),status text not null default 'nao_contratado',compra_valor_centavos integer not null default 1990);
    insert into sdr_leads values('${uuid(1)}','Buffet Teste','buffet.com.br',null,'web_research',null);
    insert into sdr_opportunities values('${uuid(1)}','${uuid(1)}','new','{"commercial_classification":{"type":"partner","source":"manual"}}','conviteia');
    insert into conviteria.eventos values('${uuid(20)}');`);
  await d.exec(readFileSync(base,'utf8')); await d.exec(readFileSync(migration,'utf8')); return d;
}
test('ConviteIA referral migration enables durable attribution and idempotent conversion/benefit', { skip: !PGlite }, async () => {
  const d=await dbSetup(); try {
    const program=(await d.query("select id from partner_programs where product='conviteia'")).rows[0].id;
    const promoted=(await d.query("select partner_promote_opportunity($1,$2,'buffet-teste','0123456789abcdef01234567','buffet.com.br') r",[uuid(1),program])).rows[0].r;
    await d.query("select partner_set_membership_status($1,'active')",[promoted.membershipId]);
    const ref=(await d.query("select partner_record_referral('0123456789abcdef01234567',$1) id",[`conviteia:event:${uuid(20)}`])).rows[0].id;
    await d.query('insert into conviteria.evento_partner_attributions(evento_id,referral_id) values($1,$2)',[uuid(20),ref]);
    let converted=(await d.query("select partner_convert_referral($1,2990,'memorias_free') r",[ref])).rows[0].r;
    assert.equal(converted.status,'converted'); assert.equal(converted.benefitStatus,'pending'); assert.equal(Number(converted.convertedValueCents),2990);
    converted=(await d.query("select partner_convert_referral($1,9999,'memorias_free') r",[ref])).rows[0].r; assert.equal(Number(converted.convertedValueCents),2990);
    let granted=(await d.query("select partner_mark_benefit_granted($1,'memorias_free') r",[ref])).rows[0].r; assert.equal(granted.benefitStatus,'granted');
    granted=(await d.query("select partner_mark_benefit_granted($1,'memorias_free') r",[ref])).rows[0].r; assert.equal(granted.benefitStatus,'granted');
    const benefit=(await d.query("select enabled,config from partner_benefits where program_id=$1 and code='memorias_free'",[program])).rows[0];
    assert.equal(benefit.enabled,true); assert.equal(benefit.config.automaticGrant,true);
    assert.equal((await d.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='conviteria' and c.relname='evento_partner_attributions'")).rows[0].relrowsecurity,true);
    for(const sig of ['partner_convert_referral(uuid,bigint,text)','partner_mark_benefit_granted(uuid,text)']) {
      assert.equal((await d.query("select has_function_privilege('anon',$1,'EXECUTE') ok",[sig])).rows[0].ok,false);
      assert.equal((await d.query("select has_function_privilege('authenticated',$1,'EXECUTE') ok",[sig])).rows[0].ok,false);
      assert.equal((await d.query("select has_function_privilege('service_role',$1,'EXECUTE') ok",[sig])).rows[0].ok,true);
    }
  } finally { await d.close(); }
});
test('referral integration keeps cookie opaque and free Memories tied to confirmed invite purchase', () => {
  const route=readFileSync(require.resolve('../app/p/[slug]/route.ts'),'utf8');
  const publicar=readFileSync(require.resolve('../app/api/conviteria/publicar/route.ts'),'utf8');
  const cobrar=readFileSync(require.resolve('../app/api/conviteria/cobrar-convite/route.ts'),'utf8');
  const webhook=readFileSync(require.resolve('../app/api/conviteria/webhook-pix/route.ts'),'utf8');
  const ui=readFileSync(require.resolve('../app/convite/pagar/page.tsx'),'utf8');
  assert.match(route,/httpOnly:\s*true/); assert.match(route,/sameSite:\s*'lax'/); assert.match(route,/maxAge:\s*CONVITEIA_PARTNER_COOKIE_MAX_AGE/);
  assert.match(publicar,/registrarAtribuicaoParceiroConvite/);
  assert.match(cobrar,/memoriasCortesiaParceiro/); assert.match(cobrar,/compra_valor_centavos:\s*memoriasCentavos/);
  assert.match(webhook,/converterIndicacaoParceiroConvite/); assert.match(webhook,/concederMemoriasCortesiaParceiro/);
  assert.match(ui,/Grátis por indicação/); assert.ok(!route.includes('partnerId'));
});
