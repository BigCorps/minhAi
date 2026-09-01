export function diasRestantes(expiraEm?: string | null) {
  if (!expiraEm) return 0;
  return Math.max(0, Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 86400000));
}
export function planoMensalAtivo(plano?: string | null, expiraEm?: string | null) {
  return plano === 'mensal' && !!expiraEm && new Date(expiraEm).getTime() > Date.now();
}
