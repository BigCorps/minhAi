import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const fail = message => { console.error('[pix-cancel-boundary]', message); process.exitCode = 1 }

const cancelV2 = read('supabase/functions/cancelar-pix-assistente-v2/index.ts')
for (const required of [
  'verifyPixCancelCapability',
  'isInternalServiceRequest',
  'app_can_manage_company',
  ".eq('company_id', companyId)",
  ".eq('status', 'pending')",
]) if (!cancelV2.includes(required)) fail('V2 missing ownership control: ' + required)
if (cancelV2.includes('proxyLegacy')) fail('V2 must not proxy to legacy cancellation')
if (/select\([^)]*user_id/.test(cancelV2)) fail('transaction.user_id must not be used as payer ownership')


const authIndex = cancelV2.indexOf("const internal = isInternalServiceRequest(req)")
const lookupIndex = cancelV2.indexOf("from('pix_transactions')")
if (authIndex < 0 || lookupIndex < 0 || authIndex > lookupIndex) fail('authorization must happen before transaction lookup')
for (const required of ['SUPABASE_SECRET_KEYS', 'SUPABASE_PUBLISHABLE_KEYS']) {
  if (!cancelV2.includes(required)) fail('V2 must support modern Supabase API keys: ' + required)
}

const legacy = read('supabase/functions/cancelar-pix-assistente/index.ts')
if (!legacy.includes('/functions/v1/cancelar-pix-assistente-v2')) fail('legacy cancel must delegate to V2')
for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', "from('pix_transactions')"]) {
  if (legacy.includes(forbidden)) fail('legacy wrapper must not auto-elevate or mutate: ' + forbidden)
}

const generator = read('supabase/functions/gerar-pix-assistente-v2/index.ts')
if (!generator.includes('issuePixCancelCapability')) fail('generator must issue cancellation capability')
if ((generator.match(/cancel_capability/g) || []).length < 2) fail('direct and legacy generation paths must return capability')

const directCallers = [
  'components/VoiceAssistant/functions/payment/pix-cancel.ts',
  'components/VoiceAssistant/handlers/pixHandlers.ts',
  'components/assistant/PixConfirmationModal.tsx',
]
for (const file of directCallers) {
  const source = read(file)
  if (!source.includes("cancelar-pix-assistente-v2")) fail(file + ' must call V2')
  if (source.includes("functions.invoke('cancelar-pix-assistente',")) fail(file + ' still calls legacy cancel directly')
  if (!source.includes('company_id') || !source.includes('cancel_capability')) fail(file + ' must send company + capability')
}

const modalCallers = [
  'components/assistant/ConsultarCpfModal.tsx',
  'components/assistant/ConsultarCnpjModal.tsx',
  'components/assistant/ConsultarPlacaModal.tsx',
  'components/assistant/RegistrarVendaDisplay.tsx',
  'components/assistant/RestricoesCPFDisplay.tsx',
  'components/assistant/RestricoesCNPJDisplay.tsx',
  'components/assistant/ConsultarProtestosModal.tsx',
  'components/assistant/ImpressaoLocalDisplay.tsx',
  'components/assistant/ImpressaoReciboDisplay.tsx',
  'components/assistant/ImpressaoRemotaDisplay.tsx',
]
for (const file of modalCallers) {
  const source = read(file)
  if (source.includes("functions.invoke('gerar-pix-assistente',")) fail(file + ' must generate through V2')
  if (!source.includes("functions.invoke('gerar-pix-assistente-v2',")) fail(file + ' missing V2 generator')
  if (!source.includes('cancel_capability') || !source.includes('cancelCapability={')) fail(file + ' drops cancellation capability')
}

console.log('PIX cancel boundary: ownership + capability guardrails PASS')