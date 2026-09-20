export type FamiliaReconciliacao = {
  id: string;
  nome: string;
  email_normalizado?: string | null;
  telefone_normalizado?: string | null;
};

export type PessoaReconciliacao = {
  id: string;
  familia_id?: string | null;
  nome: string;
  email_normalizado?: string | null;
  telefone_normalizado?: string | null;
  status?: string | null;
  rsvp_extra?: boolean | null;
};

export type ConfirmacaoReconciliacao = {
  id: string;
  nome: string;
  email?: string | null;
  contato?: string | null;
  comparecera?: boolean | null;
  acompanhantes?: unknown;
};

export type SugestaoReconciliacao = {
  tipo: 'familia' | 'individual';
  alvoId: string;
  alvoNome: string;
  membroIds: string[];
  confianca: 'alta' | 'media';
  motivo: string;
};

const TERMOS_GENERICOS = new Set([
  'esposa', 'esposo', 'marido', 'mulher', 'filho', 'filha', 'crianca', 'criança',
  'acompanhante', 'acompanhantes', 'familia', 'família', 'mae', 'mãe', 'pai',
]);

export function chaveNome(valor: unknown) {
  return String(valor ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function primeiroNome(valor: unknown) {
  return chaveNome(valor).split(' ')[0] ?? '';
}

function nomesHistoricos(confirmacao: ConfirmacaoReconciliacao) {
  const acompanhantes = Array.isArray(confirmacao.acompanhantes)
    ? confirmacao.acompanhantes.map((x) => String(x ?? '').trim()).filter(Boolean)
    : [];
  return [String(confirmacao.nome ?? '').trim(), ...acompanhantes].filter(Boolean);
}

function nomeUtilComoEvidencia(valor: string) {
  const chave = chaveNome(valor);
  if (!chave) return false;
  if (/^\d+(\s+pessoas?)?$/.test(chave)) return false;
  const primeiro = primeiroNome(chave);
  return Boolean(primeiro && !TERMOS_GENERICOS.has(primeiro));
}

export function membrosProvaveisDaFamilia(
  confirmacao: ConfirmacaoReconciliacao,
  familiaId: string,
  pessoas: PessoaReconciliacao[],
) {
  const membros = pessoas.filter((p) => p.familia_id === familiaId && !p.rsvp_extra);
  const ids = new Set<string>();

  for (const nomeHistorico of nomesHistoricos(confirmacao)) {
    const exatos = membros.filter((p) => chaveNome(p.nome) === chaveNome(nomeHistorico));
    if (exatos.length === 1) {
      ids.add(exatos[0].id);
      continue;
    }

    const primeiro = primeiroNome(nomeHistorico);
    if (!primeiro) continue;
    const porPrimeiro = membros.filter((p) => primeiroNome(p.nome) === primeiro);
    if (porPrimeiro.length === 1) ids.add(porPrimeiro[0].id);
  }

  return [...ids];
}

function evidenciaAcompanhantes(
  confirmacao: ConfirmacaoReconciliacao,
  familiaId: string,
  pessoas: PessoaReconciliacao[],
) {
  const acompanhantes = (Array.isArray(confirmacao.acompanhantes) ? confirmacao.acompanhantes : [])
    .map((x) => String(x ?? '').trim())
    .filter((x) => nomeUtilComoEvidencia(x));
  if (!acompanhantes.length) return 0;

  const membros = pessoas.filter((p) => p.familia_id === familiaId && !p.rsvp_extra);
  let total = 0;
  for (const nome of acompanhantes) {
    const chave = chaveNome(nome);
    const primeiro = primeiroNome(nome);
    if (membros.some((p) => chaveNome(p.nome) === chave)) {
      total += 1;
      continue;
    }
    const porPrimeiro = membros.filter((p) => primeiroNome(p.nome) === primeiro);
    if (porPrimeiro.length === 1) total += 1;
  }
  return total;
}

export function sugerirPorNome(
  confirmacao: ConfirmacaoReconciliacao,
  familias: FamiliaReconciliacao[],
  pessoas: PessoaReconciliacao[],
): SugestaoReconciliacao | null {
  const fixos = pessoas.filter((p) => !p.rsvp_extra);
  const chave = chaveNome(confirmacao.nome);
  if (!chave) return null;

  const exatos = fixos.filter((p) => chaveNome(p.nome) === chave);
  if (exatos.length === 1) {
    const pessoa = exatos[0];
    if (pessoa.familia_id) {
      const familia = familias.find((f) => f.id === pessoa.familia_id);
      if (!familia) return null;
      return {
        tipo: 'familia',
        alvoId: familia.id,
        alvoNome: familia.nome,
        membroIds: membrosProvaveisDaFamilia(confirmacao, familia.id, pessoas),
        confianca: 'alta',
        motivo: 'nome completo único na lista',
      };
    }
    return {
      tipo: 'individual',
      alvoId: pessoa.id,
      alvoNome: pessoa.nome,
      membroIds: [pessoa.id],
      confianca: 'alta',
      motivo: 'nome completo único na lista',
    };
  }

  const primeiro = primeiroNome(confirmacao.nome);
  if (!primeiro || TERMOS_GENERICOS.has(primeiro)) return null;
  const porPrimeiro = fixos.filter((p) => primeiroNome(p.nome) === primeiro);
  if (porPrimeiro.length !== 1) return null;

  const pessoa = porPrimeiro[0];
  if (!pessoa.familia_id) {
    return {
      tipo: 'individual',
      alvoId: pessoa.id,
      alvoNome: pessoa.nome,
      membroIds: [pessoa.id],
      confianca: 'media',
      motivo: 'primeiro nome único na lista; confirme antes de vincular',
    };
  }

  const familia = familias.find((f) => f.id === pessoa.familia_id);
  if (!familia) return null;
  const evidencia = evidenciaAcompanhantes(confirmacao, familia.id, pessoas);
  return {
    tipo: 'familia',
    alvoId: familia.id,
    alvoNome: familia.nome,
    membroIds: membrosProvaveisDaFamilia(confirmacao, familia.id, pessoas),
    confianca: evidencia > 0 ? 'alta' : 'media',
    motivo: evidencia > 0
      ? 'primeiro nome único e acompanhantes compatíveis com o mesmo grupo'
      : 'primeiro nome único; revise os membros antes de vincular',
  };
}
