import test from 'node:test';
import assert from 'node:assert/strict';
import { membrosProvaveisDaFamilia, sugerirPorNome } from '../lib/conviteria/reconciliacao-convidados.ts';

const familias = [
  { id: 'f1', nome: 'Família de Mirella' },
  { id: 'f2', nome: 'Família de Mario' },
];
const pessoas = [
  { id: 'p1', familia_id: 'f1', nome: 'Mirella', rsvp_extra: false },
  { id: 'p2', familia_id: 'f1', nome: 'Sofia', rsvp_extra: false },
  { id: 'p3', familia_id: 'f2', nome: 'Mario', rsvp_extra: false },
  { id: 'p4', familia_id: 'f2', nome: 'Thaty', rsvp_extra: false },
  { id: 'p5', familia_id: 'f2', nome: 'Miguel', rsvp_extra: false },
  { id: 'i1', familia_id: null, nome: 'Itaci', rsvp_extra: false },
];

test('nome completo único sugere família e membros', () => {
  const c = { id: 'c1', nome: 'Mirella', acompanhantes: ['Sofia'], comparecera: true };
  const s = sugerirPorNome(c, familias, pessoas);
  assert.equal(s?.tipo, 'familia');
  assert.equal(s?.alvoId, 'f1');
  assert.equal(s?.confianca, 'alta');
  assert.deepEqual(new Set(s?.membroIds), new Set(['p1', 'p2']));
});

test('primeiro nome único com acompanhante compatível é alta confiança', () => {
  const c = { id: 'c2', nome: 'Mario Martins', acompanhantes: ['Miguel Menezes'], comparecera: true };
  const s = sugerirPorNome(c, familias, pessoas);
  assert.equal(s?.alvoId, 'f2');
  assert.equal(s?.confianca, 'alta');
  assert.deepEqual(new Set(s?.membroIds), new Set(['p3', 'p5']));
});

test('primeiro nome único sem evidência adicional exige revisão', () => {
  const c = { id: 'c3', nome: 'Mario Martins', acompanhantes: ['3 pessoas'], comparecera: true };
  const s = sugerirPorNome(c, familias, pessoas);
  assert.equal(s?.alvoId, 'f2');
  assert.equal(s?.confianca, 'media');
});

test('convidado individual único é sugerido', () => {
  const c = { id: 'c4', nome: 'Itaci', acompanhantes: [], comparecera: true };
  const s = sugerirPorNome(c, familias, pessoas);
  assert.equal(s?.tipo, 'individual');
  assert.equal(s?.alvoId, 'i1');
  assert.equal(s?.confianca, 'alta');
});

test('membros prováveis toleram sobrenome no histórico', () => {
  const ids = membrosProvaveisDaFamilia({ id: 'c5', nome: 'Mirella Araújo', acompanhantes: ['Sofia'] }, 'f1', pessoas);
  assert.deepEqual(new Set(ids), new Set(['p1', 'p2']));
});
