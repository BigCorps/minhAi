export type TipoPessoaRsvp = 'adulto' | 'crianca';

export type PessoaRsvp = {
  nome: string;
  tipo: TipoPessoaRsvp;
  idade: number | null;
};

function textoNome(valor: unknown) {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function normalizarIdadeCrianca(valor: unknown): number | null {
  if (valor === '' || valor == null) return null;
  const idade = Number(valor);
  return Number.isInteger(idade) && idade >= 1 && idade <= 12 ? idade : null;
}

export function normalizarPessoaRsvp(valor: unknown): PessoaRsvp | null {
  if (typeof valor === 'string') {
    const nome = textoNome(valor);
    return nome ? { nome, tipo: 'adulto', idade: null } : null;
  }
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Record<string, unknown>;
  const nome = textoNome(bruto.nome);
  if (!nome) return null;
  const tipo: TipoPessoaRsvp = bruto.tipo === 'crianca' ? 'crianca' : 'adulto';
  return {
    nome,
    tipo,
    idade: tipo === 'crianca' ? normalizarIdadeCrianca(bruto.idade) : null,
  };
}

export function normalizarPessoasRsvp(
  valor: unknown,
  { max = 20, exigirIdadeCrianca = true }: { max?: number; exigirIdadeCrianca?: boolean } = {},
): { pessoas: PessoaRsvp[]; erro: string | null } {
  if (!Array.isArray(valor)) return { pessoas: [], erro: null };
  const vistos = new Set<string>();
  const pessoas: PessoaRsvp[] = [];

  for (const item of valor) {
    const pessoa = normalizarPessoaRsvp(item);
    if (!pessoa) continue;
    const chave = pessoa.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;
    if (pessoa.tipo === 'crianca' && exigirIdadeCrianca && pessoa.idade == null) {
      return { pessoas: [], erro: `Informe a idade de ${pessoa.nome} (de 1 a 12 anos).` };
    }
    vistos.add(chave);
    pessoas.push(pessoa);
    if (pessoas.length >= max) break;
  }
  return { pessoas, erro: null };
}

export function rotuloPessoaRsvp(tipo: TipoPessoaRsvp, idade?: number | null) {
  if (tipo !== 'crianca') return 'Adulto';
  return idade ? `Criança · ${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Criança · idade não informada';
}
