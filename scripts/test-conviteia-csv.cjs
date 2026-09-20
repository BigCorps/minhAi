const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..');
const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'conviteia-csv-'));
const opcoes = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
};

function transpilar(origemRelativa, destinoRelativo) {
  const origem = path.join(raiz, origemRelativa);
  const destino = path.join(temporario, destinoRelativo);
  const codigo = fs.readFileSync(origem, 'utf8');
  const resultado = ts.transpileModule(codigo, {
    compilerOptions: opcoes,
    fileName: origem,
    reportDiagnostics: true,
  });
  const erros = (resultado.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (erros.length) {
    for (const erro of erros) {
      process.stderr.write(`${ts.flattenDiagnosticMessageText(erro.messageText, '\n')}\n`);
    }
    process.exitCode = 1;
    return false;
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, resultado.outputText);
  return true;
}

try {
  const okParser = transpilar(
    'lib/conviteria/csv-convidados.ts',
    'lib/conviteria/csv-convidados.js',
  );
  const okTeste = transpilar(
    'tests/conviteria-csv.test.ts',
    'tests/conviteria-csv.test.js',
  );
  if (!okParser || !okTeste) process.exit(1);

  const resultado = spawnSync(
    process.execPath,
    ['--test', path.join(temporario, 'tests/conviteria-csv.test.js')],
    { stdio: 'inherit' },
  );
  process.exitCode = resultado.status ?? 1;
} finally {
  fs.rmSync(temporario, { recursive: true, force: true });
}
