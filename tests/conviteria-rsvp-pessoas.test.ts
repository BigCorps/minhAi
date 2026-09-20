import { strict as assert } from 'node:assert';
import { normalizarIdadeCrianca, normalizarPessoaRsvp, normalizarPessoasRsvp, rotuloPessoaRsvp } from '../lib/conviteria/rsvp-pessoas.ts';

assert.equal(normalizarIdadeCrianca(1), 1);
assert.equal(normalizarIdadeCrianca('12'), 12);
assert.equal(normalizarIdadeCrianca(0), null);
assert.equal(normalizarIdadeCrianca(13), null);
assert.deepEqual(normalizarPessoaRsvp(' João  Silva '), { nome: 'João Silva', tipo: 'adulto', idade: null });
assert.deepEqual(normalizarPessoaRsvp({ nome: ' Sofia ', tipo: 'crianca', idade: 7 }), { nome: 'Sofia', tipo: 'crianca', idade: 7 });
assert.equal(normalizarPessoasRsvp([{ nome: 'Sofia', tipo: 'crianca', idade: null }]).erro, 'Informe a idade de Sofia (de 1 a 12 anos).');
assert.deepEqual(normalizarPessoasRsvp([{ nome: 'Sofia', tipo: 'crianca', idade: 7 }, { nome: 'Sofia', tipo: 'crianca', idade: 7 }]).pessoas.length, 1);
assert.equal(rotuloPessoaRsvp('crianca', 1), 'Criança · 1 ano');
assert.equal(rotuloPessoaRsvp('crianca', 8), 'Criança · 8 anos');
assert.equal(rotuloPessoaRsvp('adulto', null), 'Adulto');
console.log('11/11 testes RSVP pessoas passaram.');
