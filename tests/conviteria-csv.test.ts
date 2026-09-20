import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CsvConvidadosErro,
  parseCsvConvidadosBytes,
  parseCsvConvidadosTexto,
} from '../lib/conviteria/csv-convidados';

function utf8(texto: string, bom = false) {
  const b = new TextEncoder().encode(texto);
  if (!bom) return b;
  return Uint8Array.from([0xef, 0xbb, 0xbf, ...b]);
}

function cp1252(texto: string) {
  // Os caracteres usados nestes fixtures pt-BR têm os mesmos bytes no bloco
  // latino do Windows-1252, suficiente para reproduzir o CSV salvo pelo Excel.
  return Uint8Array.from(Array.from(texto, (c) => c.charCodeAt(0) & 0xff));
}

const header = 'nome;membros;email;telefone';

test('UTF-8 BOM + ponto e vírgula', () => {
  const r = parseCsvConvidadosBytes(utf8(`${header}\nJosé;João;;11999999999\n`, true));
  assert.equal(r.encoding, 'utf-8');
  assert.equal(r.delimitador, ';');
  assert.deepEqual(r.linhas[0].membros, ['João']);
});

test('UTF-8 sem BOM + ponto e vírgula', () => {
  const r = parseCsvConvidadosBytes(utf8(`${header}\nMárcia;;;\n`));
  assert.equal(r.linhas[0].nome, 'Márcia');
});

test('UTF-8 com vírgula', () => {
  const r = parseCsvConvidadosBytes(utf8('nome,membros,email,telefone\nJosé,João,,11999999999\n'));
  assert.equal(r.delimitador, ',');
  assert.equal(r.linhas[0].telefone, '11999999999');
});

test('Windows-1252 com ponto e vírgula preserva acentos', () => {
  const r = parseCsvConvidadosBytes(cp1252(`${header}\r\nConceição;Márcia;;11999999999\r\n`));
  assert.equal(r.encoding, 'windows-1252');
  assert.equal(r.linhas[0].nome, 'Conceição');
  assert.equal(r.linhas[0].membros[0], 'Márcia');
});

test('Windows-1252 + TAB + CRLF + dependentes (caso Excel real)', () => {
  const texto = [
    'nome\tdependentes\temail\ttelefone',
    'José\tMaria | João | Márcia\t\t11999999999',
    'Conceição\t\tconceicao@example.com\t',
  ].join('\r\n');
  const r = parseCsvConvidadosBytes(cp1252(texto));
  assert.equal(r.encoding, 'windows-1252');
  assert.equal(r.delimitador, '\t');
  assert.deepEqual(r.linhas[0].membros, ['Maria', 'João', 'Márcia']);
  assert.equal(r.linhas[1].telefone, '');
});

test('CRLF', () => {
  const r = parseCsvConvidadosTexto(`${header}\r\nJosé;;;;\r\n`.replace(';;;;', ';;;'));
  assert.equal(r.linhas.length, 1);
});

test('LF', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;;;\n`);
  assert.equal(r.linhas.length, 1);
});

test('header membros', () => {
  assert.equal(parseCsvConvidadosTexto(`${header}\nJosé;João;;\n`).linhas[0].membros[0], 'João');
});

test('header dependentes é alias de membros', () => {
  const r = parseCsvConvidadosTexto('nome;dependentes;email;telefone\nJosé;João;;\n');
  assert.equal(r.linhas[0].membros[0], 'João');
});

test('headers com espaços são normalizados', () => {
  const r = parseCsvConvidadosTexto('  nome  ; integrantes ; e-mail ; telefone/whatsapp \nJosé;João;;;\n');
  assert.equal(r.linhas[0].nome, 'José');
  assert.deepEqual(r.linhas[0].membros, ['João']);
});

test('membros sem espaços em torno do pipe', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;Maria|João;;\n`);
  assert.deepEqual(r.linhas[0].membros, ['Maria', 'João']);
});

test('membros com espaços em torno do pipe', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;Maria | João;;\n`);
  assert.deepEqual(r.linhas[0].membros, ['Maria', 'João']);
});

test('acentos pt-BR', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;João|Márcia|Conceição;;\n`);
  assert.equal(r.linhas[0].nome, 'José');
  assert.deepEqual(r.linhas[0].membros, ['João', 'Márcia', 'Conceição']);
});

test('email vazio continua válido', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;João;;11999999999\n`);
  assert.equal(r.linhas[0].email, '');
});

test('telefone vazio continua válido', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;João;jose@example.com;\n`);
  assert.equal(r.linhas[0].telefone, '');
});

test('linhas em branco no fim são ignoradas', () => {
  const r = parseCsvConvidadosTexto(`${header}\nJosé;;;;\n\n  \n`.replace(';;;;', ';;;'));
  assert.equal(r.linhas.length, 1);
});

test('linha sem nome é contabilizada sem derrubar linhas válidas', () => {
  const r = parseCsvConvidadosTexto(`${header}\n;João;;11999999999\nJosé;;;11988888888\n`);
  assert.equal(r.linhas.length, 1);
  assert.equal(r.ignoradas, 1);
});

test('arquivo inválido gera mensagem amigável', () => {
  assert.throws(
    () => parseCsvConvidadosTexto('coluna estranha;outra\nabc;def\n'),
    (e: unknown) => e instanceof CsvConvidadosErro && /Não conseguimos identificar as colunas/.test(e.message),
  );
});
