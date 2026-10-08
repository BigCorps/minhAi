import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import './test-funcionaria-ml-orders.mjs';

const root = process.cwd();
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');
const sql = read('supabase/SQL-FUNCIONARIA-PHASE7I-ML-SYNC.sql');
const worker = read('supabase/functions/funcionaria-ml-sync/index.ts');
const importer = read('supabase/functions/funcionaria-ml-importar-produtos/index.ts');
const cron = read('app/api/cron/funcionaria-ml-sync/route.ts');
const ui = read('components/funcionaria/channels/FuncionarIAMercadoLivrePanel.tsx');
const funnel = read('components/funcionaria/channels/FuncionarIAMLQuestionsFunnel.tsx');
const orderPanel = read('components/funcionaria/channels/FuncionarIAMLOrdersPreview.tsx');
const orderModule = read('supabase/functions/funcionaria-ml-sync/normalize-order.mjs');
const vercel = JSON.parse(read('vercel.json'));

const checks = [
  [sql.includes('sync_enabled boolean not null default false'), 'sync opt-in'],
  [sql.includes('security invoker'), 'invoker RPC'],
  [sql.includes('pg_advisory_xact_lock'), 'atomic import and sync coordination'],
  [sql.includes("sync_last_state='conflict'"), 'local-edit conflict protection'],
  [sql.includes("sync_source <> 'mercadolivre'"), 'direction guard'],
  [sql.includes("ml_stock_source','') <> 'user_product'"), 'stock authority'],
  [sql.includes('revoke all on function public.funcionaria_apply_ml_sync'), 'RPC grant boundary'],
  [worker.includes('/items/bulk'), 'non-deprecated bulk API'],
  [worker.includes('/prices'), 'authoritative price endpoint'],
  [worker.includes('/stock'), 'user product stock'],
  [worker.includes('ml_variations_changed'), 'variations review gate'],
  [worker.includes('previous.length > 0 || current.length > 0'), 'new variations review gate'],
  [worker.includes('ml_status_unrecognized'), 'status fail closed'],
  [worker.includes("String(item.seller_id || '')!==String(conn.seller_id)"), 'seller ownership'],
  [worker.includes("if(!isService)return respond({error:'forbidden'},403)"), 'cron service boundary'],
  [worker.includes("some_items_not_enabled"), 'user sync opt-in'],
  [importer.includes("if(managed?.sync_enabled)"), 'legacy import cannot overwrite managed sync'],
  [cron.includes("FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true'"), 'cron disabled by default'],
  [cron.includes('process.env.CRON_SECRET'), 'cron authorization'],
  [cron.includes('process.env.SUPABASE_SECRET_KEY'), 'cron supports current secret key'],
  [worker.includes('SUPABASE_SECRET_KEYS'), 'worker validates secret keys server side'],
  [worker.includes('questions_preview'), '7J read-only questions'],
  [worker.includes('questions/search'), '7J official questions search'],
  [worker.includes("canAccess(admin,user.id,companyId)"), 'company ownership boundary'],
  [ui.includes('Sincronização Mercado Livre'), 'user controls and visibility'],
  [ui.includes('FuncionarIAMLQuestionsFunnel'), '7J mounted in product panel'],
  [funnel.includes('Não integrado'), '7J no invented order conversions'],
  [funnel.includes("action:'questions_preview'"), '7J no user-triggered automated reply'],
  [worker.includes("action==='orders_preview'"), '7J orders read only action'],
  [worker.includes("'https://api.mercadolibre.com/orders/search'"), '7J official orders API'],
  [worker.includes("url.searchParams.set('order.status','paid')"), '7J paid status enforced at source'],
  [worker.includes('uniqueMLOrders(page.results,String(conn.seller_id))'), '7J seller ownership and deduplication'],
  [worker.includes("return respond({\n        success:true,read_only:true,items,offset,limit,"), '7J orders preview sanitized'],
  [orderModule.includes("raw.status !== 'paid'"), 'orders status is paid'],
  [orderModule.includes("raw.currency_id !== 'BRL'"), 'Brazilian real only'],
  [orderModule.includes('String(raw.seller?.id'), 'seller ID matched in normalized result'],
  [orderPanel.includes("action: 'orders_preview'"), 'orders panel manually fetches data'],
  [orderPanel.includes("Não atribuímos estas compras"), 'no unsupported conversion attribution'],
  [funnel.includes('<FuncionarIAMLOrdersPreview companyId={companyId} />'), 'orders UI mounted'],
  [vercel.crons.some(c => c.path === '/api/cron/funcionaria-ml-sync'), 'scheduled reconciliation'],
];
for (const [condition, label] of checks) assert.ok(condition, `7I check: ${label}`);
assert.ok(!worker.includes('/items?ids='), 'do not use deprecated items batch API');
console.log('FuncionarIA 7I: opt-in + conflict-safe ML sync + reconciliation PASS');
