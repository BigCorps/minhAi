#!/usr/bin/env node
import fs from 'node:fs';

const read = (p) => {
  if (!fs.existsSync(p)) throw new Error(`Arquivo ausente: ${p}`);
  return fs.readFileSync(p, 'utf8');
};

const helper = read('lib/funcionaria-function-parity.ts');
const interaction = read('components/funcionaria/interaction/FuncionarIAInteraction.tsx');
const dashboard = read('app/funcionaria/dashboard/[module]/page.tsx');
const panel = read('components/funcionaria/management/FuncionarIAPreServicePanel.tsx');

const checks = [
  [helper.includes("cadastro") && helper.includes("RegistrationDisplay"), 'Cadastro reutiliza RegistrationDisplay minhAi'],
  [helper.includes("pre_atendimento") && helper.includes("PreAtendimentoDisplay"), 'Pré-atendimento reutiliza PreAtendimentoDisplay minhAi'],
  [helper.includes("agendar_compromisso") && helper.includes("CreateEventModal"), 'Agenda reutiliza CreateEventModal minhAi'],
  [helper.includes("reagendar_compromisso") && helper.includes("RescheduleModal"), 'Reagendamento reutiliza modal minhAi'],
  [helper.includes("cancelar_agendamento") && helper.includes("CancelAppointmentModal"), 'Cancelamento reutiliza modal minhAi'],
  [helper.includes("confirmar_presenca") && helper.includes("ConfirmPresenceModal"), 'Presença reutiliza modal minhAi'],
  [helper.includes("pix_generate") && helper.includes("href: '/vendas'"), 'PIX continua pelo checkout existente'],
  [helper.includes("tef_debito") && helper.includes("tef_credito"), 'TEF reaproveita checkout existente'],
  [helper.includes("modo_fila") && helper.includes("href: '/fila'"), 'Fila continua na rota existente'],
  [helper.includes("modo_venda") && helper.includes("href: '/vendas'"), 'Vendas continuam na rota existente'],
  [interaction.includes("detectFuncionarIAFunctionIntent(question, activeFunctionKeys)"), 'Texto livre respeita active_function_keys'],
  [interaction.includes("getFuncionarIAFunctionAction(faq.function_key)"), 'FAQ pode abrir ação existente'],
  [interaction.includes("getFuncionarIAQuickActions(activeFunctionKeys)"), 'Ações rápidas vêm apenas de funções ativas'],
  [interaction.includes("<LegacyActionModals"), 'FuncionarIA usa ActionModals legado'],
  [interaction.includes("widgetMode={source === 'widget'}"), 'Widget preserva bloqueios legados'],
  [!interaction.includes("detectVoiceCommand("), 'Não acopla detector legado inteiro'],
  [!interaction.includes("registerFunctionUsage("), 'Não adiciona cobrança de crédito legado'],
  [panel.includes("PreAtendimentoTab") && panel.includes("EditarPreAtendimentoModal"), 'Painel reutiliza gestão legada de pré-atendimento'],
  [dashboard.includes("active_skill_keys.includes('pre_service_registration')"), 'Painel respeita entitlement de Pré-atendimento'],
  [dashboard.includes("active_skill_keys.includes('queue_service')"), 'Fila também pode configurar pré-atendimento já incluído na skill'],
];

let failed = 0;
for (const [ok, label] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\nFUNCIONARIA PARITY P1 VERIFY: FAIL (${failed})`);
  process.exit(1);
}

console.log(`\nFUNCIONARIA PARITY P1 VERIFY: PASS (${checks.length} checks)`);
