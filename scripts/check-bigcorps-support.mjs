import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const check = (condition, label) => checks.push([Boolean(condition), label]);

const route = read('app/api/support/route.ts');
const widget = read('components/support/BigCorpsSupportWidget.tsx');
const server = read('lib/support/server.ts');
const knowledge = read('lib/support/knowledge.ts');
const productContext = read('lib/support/product-context.ts');
const catalog = read('lib/sdr/catalog.ts');

check(route.includes('httpOnly: true'), 'support token cookie is HttpOnly');
check(route.includes("sameSite: 'lax'"), 'support cookie is SameSite=Lax');
check(!route.includes("searchParams.get('token')"), 'support token is not accepted from URL');
check(!widget.includes('localStorage'), 'support token is not stored in localStorage');
check(server.includes('SUPPORT_TOKEN_SECRET || process.env.SDR_TOKEN_SECRET'), 'support hash requires server secret');
check(server.includes('support_secret_missing'), 'support secret fails closed');
check(server.includes('SENSITIVE_PLACEHOLDER'), 'possible credentials are redacted before persistence');
check(server.includes("thread.status === 'waiting_human' || thread.status === 'human'"), 'bot stays silent during human handoff');
check(server.includes('reopenIfResolved'), 'resolved threads reopen on new inbound');
check(server.includes('supportKnowledgeReply'), 'grounded knowledge answers are wired');
check(server.includes("BIGCORPS_SUPPORT_AI_ENABLED !== 'true'"), 'generative support remains feature gated');
check(server.includes('Use somente os fatos do contexto de produto'), 'AI prompt is grounded');
check(knowledge.includes('Convites já publicados continuam no ar'), 'ConviteIA support knowledge present');
check(knowledge.includes('dinheiro permanece na conta Mercado Pago'), 'PixWiki support knowledge present');
check(productContext.includes('clientSubdomain'), 'widget stays off customer subdomains');
check(catalog.includes('BigCorps | ConviteIA'), 'approved ConviteIA Meta template copy is in catalog');
check(catalog.includes('espaços de eventos, buffets e cerimonialistas'), 'approved partnership copy is aligned');

const failures = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
}
if (failures.length) {
  process.exitCode = 1;
  throw new Error(`BigCorps Support gate failed: ${failures.map(([, label]) => label).join('; ')}`);
}
console.log(`BigCorps Support: ${checks.length} structural guardrails PASS`);
