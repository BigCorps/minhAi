import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const violations = [];

function inspect(path, components = false) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;
    const file = join(path, entry.name);
    if (entry.isDirectory()) {
      inspect(file, components);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    if (relative(root, file).replaceAll('\\', '/') === 'scripts/check-email-edge-boundary.mjs') continue;
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const client = components || source.statements.some(node => ts.isExpressionStatement(node)
      && ts.isStringLiteral(node.expression) && node.expression.text === 'use client');
    function visit(node) {
      // Verifica strings/templates/JSX, inclusive URLs e nomes de Edge.
      // Comentários históricos não são tratados como chamadas em runtime.
      if ((ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node)
        || ts.isTemplateTail(node) || ts.isJsxText(node))
        && ((client && node.text.includes('enviar-email-google'))
          || node.text === 'enviar-email-google' || /\/enviar-email-google(?=$|[/?#])/.test(node.text))) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        violations.push(`${relative(root, file)}:${line + 1}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

// enviar_email usa handler/SendEmailModal; nunca deve anunciar uma Edge interna.
const registryPath = join(root, 'lib/functions-registry.ts');
const registry = ts.createSourceFile(registryPath, readFileSync(registryPath, 'utf8'), ts.ScriptTarget.Latest, true);
let emailEntryFound = false;
function inspectRegistry(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(registry).replace(/['"]/g, '') === 'enviar_email' && ts.isObjectLiteralExpression(node.initializer)) {
    emailEntryFound = true;
    const edge = node.initializer.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(registry) === 'edgeFunction');
    if (edge && ts.isPropertyAssignment(edge) && edge.initializer.getText(registry) !== 'undefined') violations.push('lib/functions-registry.ts: enviar_email must not advertise an Edge');
  }
  ts.forEachChild(node, inspectRegistry);
}
inspectRegistry(registry);
if (!emailEntryFound) violations.push('lib/functions-registry.ts: enviar_email entry missing');

for (const directory of ['components', 'app', 'lib', 'hooks', 'utils', 'src', 'supabase/functions', 'scripts', 'public']) {
  try {
    inspect(join(root, directory), directory === 'components');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (violations.length) {
  console.error('Use a fronteira Next server-side para email:\n' + violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Email Edge boundary: OK (zero callers legado; zero chamadas diretas client-side)');
}
