export const CONVITE_TESTE_HORAS = 24;
export const CONVITE_TESTE_ANTECEDENCIA_MIN_HORAS = 48;
export const CONVITE_TESTE_MARGEM_EVENTO_HORAS = 24;

export const MEMORIAS_TESTE_LIMITE_FOTOS = 10;
export const MEMORIAS_TESTE_LIMITE_VIDEOS = 2;
export const MEMORIAS_TESTE_LIMITE_BYTES = 30 * 1024 * 1024;

export type EstadoTesteConvite = {
  id: string;
  eventoId: string | null;
  contaId: string;
  iniciadoEm: string;
  expiraEm: string;
  convertidoEm: string | null;
  limpoEm: string | null;
};

function timestamp(valor: string | null | undefined) {
  if (!valor) return null;
  const ms = new Date(valor).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * O trial nunca pode alcançar as 24 horas que antecedem o evento real.
 * A regra também é recalculada na leitura, então mudar a data do evento depois
 * de iniciar o teste não transforma o trial em uso gratuito durante a festa.
 */
export function expiracaoEfetivaTeste(
  expiraEm: string,
  dataEvento: string | null | undefined,
) {
  const expiraBanco = timestamp(expiraEm);
  if (expiraBanco == null) return expiraEm;

  const evento = timestamp(dataEvento);
  if (evento == null) return new Date(expiraBanco).toISOString();

  const limiteEvento = evento - CONVITE_TESTE_MARGEM_EVENTO_HORAS * 3_600_000;
  return new Date(Math.min(expiraBanco, limiteEvento)).toISOString();
}

export function calcularExpiracaoTeste(
  dataEvento: string | null | undefined,
  iniciadoEm = new Date(),
) {
  const evento = timestamp(dataEvento);
  if (evento == null) return null;

  const inicio = iniciadoEm.getTime();
  const normal = inicio + CONVITE_TESTE_HORAS * 3_600_000;
  const limiteEvento = evento - CONVITE_TESTE_MARGEM_EVENTO_HORAS * 3_600_000;
  if (limiteEvento <= inicio) return null;

  return new Date(Math.min(normal, limiteEvento)).toISOString();
}

export function testeConviteAtivo(
  teste: Pick<EstadoTesteConvite, 'expiraEm' | 'convertidoEm'> | null | undefined,
  agora = new Date(),
  dataEvento?: string | null,
) {
  if (!teste || teste.convertidoEm) return false;
  const expira = expiracaoEfetivaTeste(teste.expiraEm, dataEvento);
  return new Date(expira).getTime() > agora.getTime();
}

export function horasRestantesTeste(expiraEm: string, agora = new Date()) {
  return Math.max(0, (new Date(expiraEm).getTime() - agora.getTime()) / 3_600_000);
}

export function dataEventoElegivelParaTeste(dataEvento: string | null | undefined, agora = new Date()) {
  const data = timestamp(dataEvento);
  if (data == null) return false;
  return data - agora.getTime() >= CONVITE_TESTE_ANTECEDENCIA_MIN_HORAS * 3_600_000;
}
