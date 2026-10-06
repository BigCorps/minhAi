import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const allowed = new Set([
  'lib/openai-models.ts',
  'supabase/functions/_shared/openai-models.ts',
  'scripts/check-openai-model-registry.mjs',
]);
const models = new Set(['gpt-4o', 'gpt-4o-mini', 'whisper-1', 'text-embedding-3-small', 'tts-1']);
const extensions = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const violations = [];

function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      checkDirectory(path);
      continue;
    }
    const name = relative(root, path).replaceAll('\\', '/');
    if (!extensions.test(name) || name.endsWith('.d.ts') || allowed.has(name)) continue;
    const source = ts.createSourceFile(name, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      // AST ignora comentários e textos de marketing que apenas mencionam modelos.
      const modelLiteral = (ts.isStringLiteralLike(node) && models.has(node.text));
      const publicKey = (ts.isIdentifier(node) || ts.isStringLiteralLike(node))
        && node.text === 'NEXT_PUBLIC_OPENAI_API_KEY';
      if (modelLiteral || publicKey) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        violations.push(`${name}:${line + 1}: ${node.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

for (const directory of ['app', 'components', 'lib', 'supabase/functions', 'hooks', 'utils', 'src', 'scripts', 'public']) {
  try {
    checkDirectory(join(root, directory));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (violations.length) {
  console.error('Use OPENAI_MODELS e mantenha a chave OpenAI no servidor:\n' + violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('OpenAI model registry: OK');
}
