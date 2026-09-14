#!/usr/bin/env node
/**
 * FuncionarIA Parity P1
 * Base: f4c926be3b89de8c55e9f8e3ef12b6b4778d9dd2
 *
 * Objetivo:
 * - ligar FuncionarIA às ações/modais já validados na minhAi;
 * - não recriar pagamentos, agenda, cadastro ou pré-atendimento;
 * - não alterar SQL/RLS;
 * - não usar o detector legado inteiro nem register_function_usage.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const EXPECTED_HEAD = 'f4c926be3b89de8c55e9f8e3ef12b6b4778d9dd2';

const INTERACTION = 'components/funcionaria/interaction/FuncionarIAInteraction.tsx';
const DASHBOARD = 'app/funcionaria/dashboard/[module]/page.tsx';

function git(cmd, trim = true) {
  const value = execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
  return trim ? value.trim() : value;
}

function file(rel) {
  return path.join(ROOT, rel);
}

function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}

function write(rel, value) {
  fs.writeFileSync(file(rel), value, 'utf8');
  console.log(`✓ ${rel}`);
}

function replaceOnce(value, from, to, label) {
  const count = value.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: esperado 1, encontrado ${count}`);
  }
  return value.replace(from, to);
}

function replaceRegexOnce(value, regex, replacement, label) {
  const matches = [...value.matchAll(regex)];
  if (matches.length !== 1) {
    throw new Error(`${label}: esperado 1, encontrado ${matches.length}`);
  }
  return value.replace(regex, replacement);
}

const head = git('rev-parse HEAD');
if (head !== EXPECTED_HEAD) {
  throw new Error(
    `HEAD inesperado.\nEsperado: ${EXPECTED_HEAD}\nAtual:    ${head}\n` +
    'Este pacote foi preparado sobre a produção validada após o hotfix R4A2.'
  );
}

const allowedDirty = new Set([
  'README-FUNCIONARIA-PARITY-P1.md',
  'lib/funcionaria-function-parity.ts',
  'components/funcionaria/management/FuncionarIAPreServicePanel.tsx',
  'scripts/apply-funcionaria-parity-p1.mjs',
  'scripts/verify-funcionaria-parity-p1.mjs',
]);

const status = git('status --porcelain', false);
const unexpected = status
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => line.length >= 4 ? line.slice(3).trim() : '')
  .filter(Boolean)
  .filter(rel => !allowedDirty.has(rel));

if (unexpected.length) {
  throw new Error(
    'Há alterações locais fora do pacote P1:\n' +
    unexpected.map(rel => ` - ${rel}`).join('\n')
  );
}

// ---------------------------------------------------------------------------
// 1. FuncionarIAInteraction: pluga ações/modais legados com entitlement.
// Tudo é construído em memória e só gravado após auditoria final.
// ---------------------------------------------------------------------------
let interaction = read(INTERACTION);

if (!interaction.includes("from 'next/dynamic'")) {
  interaction = replaceOnce(
    interaction,
    "import { FormEvent, useMemo, useRef, useState } from 'react';",
    "import { FormEvent, useMemo, useRef, useState } from 'react';\nimport dynamic from 'next/dynamic';",
    'import dynamic',
  );
}

interaction = replaceOnce(
  interaction,
  `import {
  functionKeyRoute,
  resolveFuncionarIADeterministic,
  type FuncionarIACompanyPublicInfo,
} from '@/lib/funcionaria-deterministic';`,
  `import {
  resolveFuncionarIADeterministic,
  type FuncionarIACompanyPublicInfo,
} from '@/lib/funcionaria-deterministic';`,
  'remove functionKeyRoute import',
);

if (!interaction.includes("from '@/lib/funcionaria-function-parity'")) {
  interaction = replaceOnce(
    interaction,
    "import { contrastTextColor, rgbaFromHex } from '@/lib/funcionaria-visual';",
    `import { contrastTextColor, rgbaFromHex } from '@/lib/funcionaria-visual';
import {
  detectFuncionarIAFunctionIntent,
  getFuncionarIAFunctionAction,
  getFuncionarIAQuickActions,
  type FuncionarIAParityAction,
} from '@/lib/funcionaria-function-parity';

const LegacyActionModals = dynamic(
  () => import('@/components/VoiceAssistant/ActionModals').then(mod => mod.ActionModals),
  { ssr: false },
);`,
    'parity imports',
  );
}

if (!interaction.includes('const [activeModal, setActiveModal]')) {
  interaction = replaceOnce(
    interaction,
    "  const [voiceError, setVoiceError] = useState<string | null>(null);",
    `  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{ type: string; data: any } | null>(null);`,
    'activeModal state',
  );
}

if (!interaction.includes('async function runParityAction(')) {
  interaction = replaceOnce(
    interaction,
    `  async function speak(text: string) {
    try { await playText(text); } catch (error) { console.warn('[FuncionarIA] TTS:', error); }
  }`,
    `  async function speak(text: string) {
    try { await playText(text); } catch (error) { console.warn('[FuncionarIA] TTS:', error); }
  }

  async function runParityAction(action: FuncionarIAParityAction) {
    setPendingAction(null);
    setAnswer(action.text);
    setLastSource(action.kind === 'human' ? 'human' : 'skill');

    if (action.kind === 'route') {
      setPendingAction({ href: action.href, label: action.label });
      await speak(action.text);
      return;
    }

    if (action.kind === 'modal') {
      setActiveModal({
        type: action.modalType,
        data: { companyId: company.id },
      });
      await speak(action.text);
      return;
    }

    await speak(action.text);
    onCallHuman(action.text);
  }`,
    'runParityAction',
  );
}

interaction = replaceOnce(
  interaction,
  `    const route = functionKeyRoute(faq.function_key);
    if (route) setPendingAction(route);

    const text = faq.answer || (route ? 'Posso abrir essa opção para você.' : 'Encontrei essa informação.');
    setAnswer(text);
    setLastSource('faq');
    await speak(text);`,
  `    const action = getFuncionarIAFunctionAction(faq.function_key);
    if (action?.kind === 'route') {
      setPendingAction({ href: action.href, label: action.label });
    } else if (action?.kind === 'modal') {
      setActiveModal({
        type: action.modalType,
        data: { companyId: company.id },
      });
    } else if (action?.kind === 'human') {
      onCallHuman(action.text);
    }

    const text = faq.answer || action?.text || 'Encontrei essa informação.';
    setAnswer(text);
    setLastSource(action?.kind === 'human' ? 'human' : 'faq');
    await speak(text);`,
  'FAQ parity action',
);

interaction = replaceOnce(
  interaction,
  `      const faq = findMatchingFAQLocal(faqs, question);`,
  `      const parityAction = detectFuncionarIAFunctionIntent(question, activeFunctionKeys);
      if (parityAction) {
        await runParityAction(parityAction);
        return;
      }

      const faq = findMatchingFAQLocal(faqs, question);`,
  'natural-language parity action',
);

interaction = replaceRegexOnce(
  interaction,
  /  const quickActions = useMemo\(\(\) => \{[\s\S]*?  \}, \[activeFunctionKeys\]\);/,
  `  const quickActions = useMemo(
    () => getFuncionarIAQuickActions(activeFunctionKeys),
    [activeFunctionKeys],
  );`,
  'quickActions',
);

interaction = replaceRegexOnce(
  interaction,
  /          \{quickActions\.map\(action => \(\r?\n            <a key=\{action\.href\}[\s\S]*?          \)\)\}/,
  `          {quickActions.map(action => (
            action.kind === 'route' ? (
              <a
                key={action.key}
                href={action.href}
                className={\`\${dock ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-full border border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100\`}
              >
                {action.label}
              </a>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={() => void runParityAction(action)}
                className={\`\${dock ? 'px-3 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-full border border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100\`}
              >
                {action.label}
              </button>
            )
          ))}`,
  'quickActions render',
);

if (!interaction.includes('<LegacyActionModals')) {
  const tail = `      </div>
    </section>
  );
}`;
  const replacement = `      </div>

      {activeModal && (
        <LegacyActionModals
          activeModal={activeModal}
          onClose={() => setActiveModal(null)}
          theme="light"
          playText={playText}
          widgetMode={source === 'widget'}
          slug={company.slug}
        />
      )}
    </section>
  );
}`;
  interaction = replaceOnce(interaction, tail, replacement, 'LegacyActionModals render');
}

// Auditoria da alteração antes de gravar.
for (const needle of [
  "detectFuncionarIAFunctionIntent(question, activeFunctionKeys)",
  "getFuncionarIAQuickActions(activeFunctionKeys)",
  "<LegacyActionModals",
  "widgetMode={source === 'widget'}",
]) {
  if (!interaction.includes(needle)) {
    throw new Error(`Interaction audit: ausente ${needle}`);
  }
}

for (const forbidden of [
  "registerFunctionUsage(",
  "detectVoiceCommand(",
]) {
  if (interaction.includes(forbidden)) {
    throw new Error(`Interaction audit: não deve acoplar detector/cobrança legado: ${forbidden}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Dashboard: reaproveita painel legado de pré-atendimento quando a skill
// correspondente (ou queue_service, que também inclui pre_atendimento) existe.
// ---------------------------------------------------------------------------
let dashboard = read(DASHBOARD);

if (!dashboard.includes('FuncionarIAPreServicePanel')) {
  dashboard = replaceOnce(
    dashboard,
    "import FuncionarIAAgendaPanel from '@/components/funcionaria/management/FuncionarIAAgendaPanel';",
    `import FuncionarIAAgendaPanel from '@/components/funcionaria/management/FuncionarIAAgendaPanel';
import FuncionarIAPreServicePanel from '@/components/funcionaria/management/FuncionarIAPreServicePanel';`,
    'dashboard pre-service import',
  );

  dashboard = replaceOnce(
    dashboard,
    `  if(key==='atendimentos')return <Wrap t="Respostas da sua FuncionarIA" s="FAQ e respostas rápidas são tentadas antes de qualquer IA."><FAQManagerClient companyId={state.company.id} isDark={false}/></Wrap>;`,
    `  if(key==='atendimentos')return <Wrap t="Respostas da sua FuncionarIA" s="FAQ e respostas rápidas são tentadas antes de qualquer IA."><div className="space-y-8"><FAQManagerClient companyId={state.company.id} isDark={false}/>{(state.active_skill_keys.includes('pre_service_registration')||state.active_skill_keys.includes('queue_service'))?<FuncionarIAPreServicePanel companyId={state.company.id}/>:null}</div></Wrap>;`,
    'dashboard pre-service bridge',
  );
}

if (!dashboard.includes("state.active_skill_keys.includes('pre_service_registration')")) {
  throw new Error('Dashboard audit: entitlement pre_service_registration ausente');
}

// Só agora grava os dois arquivos modificados.
write(INTERACTION, interaction);
write(DASHBOARD, dashboard);

console.log('\nFuncionarIA Parity P1 aplicada com sucesso.');
console.log('Não há SQL nesta etapa.');
console.log('Agora execute:');
console.log('  node scripts/verify-funcionaria-parity-p1.mjs');
console.log('  git -c core.whitespace=cr-at-eol diff --check');
console.log('  git status');
