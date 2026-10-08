import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = p => readFileSync(resolve(process.cwd(),p),'utf8');
const middleware=read('middleware.ts');
const assetlinks=read('app/.well-known/assetlinks.json/route.ts');
const manifest=JSON.parse(read('public/brands/funcionaria/manifest.webmanifest'));
const shell=read('components/funcionaria/public/FuncionarIAPublicShell.tsx');
const sales=read('components/funcionaria/public/FuncionarIAPublicSales.tsx');

assert.ok(middleware.includes("suffix: '.funcionaria.net'"),'FuncionarIA subdomain routing missing');
assert.ok(middleware.includes("pathname = '/brands/funcionaria/manifest.webmanifest'"),'FuncionarIA manifest rewrite missing');
assert.ok(assetlinks.includes("package_name: 'net.funcionaria.twa'"),'FuncionarIA TWA package missing');
assert.ok(assetlinks.includes("['.funcionaria.net', FUNCIONARIA_ENTRY]"),'FuncionarIA subdomains need Digital Asset Links');
assert.ok(assetlinks.includes("'funcionaria.net': FUNCIONARIA_ENTRY"),'FuncionarIA apex Digital Asset Links missing');
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'/');
assert.equal(manifest.start_url,'/');
assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&String(i.purpose).includes('maskable')),'512 maskable icon missing');

assert.ok(shell.includes("workplace === 'online'"),'online public mode missing');
assert.ok(shell.includes("workplace === 'ambos'"),'ambos public mode missing');
assert.ok(shell.includes("settings.storefront_enabled === true"),'presencial opt-in storefront missing');
assert.ok(shell.includes("sm:h-[720px] sm:max-h-[86vh] sm:w-[410px]"),'desktop widget bounds missing');
assert.ok(shell.includes("fixed inset-x-3 bottom-3 top-16"),'mobile widget viewport bounds missing');
assert.ok(sales.includes("sm:grid-cols-2 xl:grid-cols-3"),'responsive catalog grid missing');
assert.ok(sales.includes("lg:grid-cols-[minmax(0,1fr)_380px]"),'desktop cart layout missing');
assert.ok(sales.includes("inputMode=\"tel\""),'mobile delivery phone input missing');

console.log('FuncionarIA 9A: desktop + mobile + PWA/TWA structural QA PASS');
