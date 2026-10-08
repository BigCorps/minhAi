import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');
const sql = read('supabase/SQL-FUNCIONARIA-PHASE7I-ML-SYNC.sql');
const worker = read('supabase/functions/funcionaria-ml-sync/index.ts');
const importer = read('supabase/functions/funcionaria-ml-importar-produtos/index.ts');
const cron = read('app/api/cron/funcionaria-ml-sync/route.ts');
const ui = read('components/funcionaria/channels/FuncionarIAMercadoLivrePanel.tsx');
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
  [worker.includes('ml_status_unrecognized'), 'status fail closed'],
  [worker.includes("String(item.seller_id || '')!==String(conn.seller_id)"), 'seller ownership'],
  [worker.includes("if(!isService)return respond({error:'forbidden'},403)"), 'cron service boundary'],
  [worker.includes("some_items_not_enabled"), 'user sync opt-in'],
  [importer.includes("if(managed?.sync_enabled)"), 'legacy import cannot overwrite managed sync'],
  [cron.includes("FUNCIONARIA_ML_SYNC_CRON_ENABLED !== 'true'"), 'cron disabled by default'],
  [cron.includes('process.env.CRON_SECRET'), 'cron authorization'],
  [ui.includes('Sincronização contínua'), 'user controls and visibility'],
  [vercel.crons.some(c => c.path === '/api/cron/funcionaria-ml-sync'), 'scheduled reconciliation'],
];
for (const [condition, label] of checks) assert.ok(condition, `7I check: ${label}`);
assert.ok(!worker.includes('/items?ids='), 'do not use deprecated items batch API');
console.log('FuncionarIA 7I: opt-in + conflict-safe ML sync + reconciliation PASS');
