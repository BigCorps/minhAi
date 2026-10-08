const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

const read = (path) => readFileSync(require.resolve("../" + path), "utf8");

test("WhatsApp comercial exige opt-in, template aprovado e snapshot imutável", () => {
  const sql = read("supabase/migrations/20261008193000_sdr_whatsapp_optin_inbound.sql");
  assert.match(sql, /sdr_record_whatsapp_consent/);
  assert.match(sql, /explicit_whatsapp_optin/);
  assert.match(sql, /whatsapp_template_not_approved/);
  assert.match(sql, /sdr_whatsapp_queue_valid/);
  assert.match(sql, /sdr_enqueue_optin_whatsapp/);
  assert.match(sql, /public\.sdr_normalize_phone\(l\.phone\) is distinct from q\.recipient_address/);
  assert.match(sql, /queue_snapshot_immutable/);
  assert.match(sql, /public\.sdr_normalize_phone\(phone\)=v_phone/);
});

test("envio usa destinatário congelado e template local aprovado", () => {
  const source = read("lib/sdr/channels.ts");
  assert.match(source, /q\.recipient_address/);
  assert.match(source, /whatsapp_template_not_approved/);
  assert.match(source, /saved\.body !== t\.body/);
  assert.match(source, /metaConnection\(false\)/);
  assert.match(source, /metaConnection\(true\)/);
  assert.doesNotMatch(source, /to: l\.phone/);
});

test("inbound comercial gera confirmação contextual e handoff sem IA", () => {
  const route = read("app/api/internal/bigcorps-whatsapp-inbound/route.ts");
  const helper = read("lib/sdr/whatsapp-inbound.ts");
  assert.match(route, /findCommercialWhatsappContext/);
  assert.match(route, /commercialWhatsappAutoReply/);
  assert.match(helper, /A prospecção automática foi pausada/);
  assert.match(helper, /não enviaremos novas mensagens comerciais/);
  assert.doesNotMatch(helper, /openai|chatgpt|responses\.create/i);
});

test("Admin e qualificação usam o RPC de consentimento e fila opt-in", () => {
  const admin = read("app/api/admin/comercial/route.ts");
  const qualify = read("app/api/public/sdr/qualify/route.ts");
  assert.match(admin, /sdr_record_whatsapp_consent/);
  assert.match(admin, /sdr_enqueue_optin_whatsapp/);
  assert.match(qualify, /sdr_record_whatsapp_consent/);
  assert.doesNotMatch(qualify, /from\("sdr_consents"\)\s*\.insert/);
});
