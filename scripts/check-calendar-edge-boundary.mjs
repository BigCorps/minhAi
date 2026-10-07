import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const violations = [];
const names = ['listar-eventos-google', 'cancelar-agendamento', 'reagendar-compromisso'];
const internal = [...names, 'listar-eventos-google-v2', 'appointment-actions-v2'];
function inspect(directory, components = false) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'build', 'dist'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { inspect(path, components); continue; }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name) || entry.name.endsWith('.d.ts') || path === fileURLToPath(import.meta.url)) continue;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const client = components || source.statements.some(node => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === 'use client');
    function visit(node) {
      if ((ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node))
        && (names.some(name => node.text === name || node.text.includes('/' + name) && new RegExp('/' + name + '(?=$|[/?#])').test(node.text))
          || client && internal.some(name => node.text.includes(name)))) {
        violations.push(`${relative(root, path)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
for (const dir of ['components', 'app', 'lib', 'hooks', 'utils', 'src', 'supabase/functions', 'public']) {
  try { inspect(join(root, dir), dir === 'components'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (violations.length) { console.error('Calendar boundary violations:\n' + violations.join('\n')); process.exitCode = 1; }
else console.log('Calendar boundary: OK (zero legacy read/action callers; zero client-side Edge calls).');
