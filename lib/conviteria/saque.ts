export const SAQUE_MINIMO_CENTAVOS =
  Math.max(100, Number(process.env.CONVITEIA_SAQUE_MINIMO_CENTAVOS ?? 5000));

export const brlSaque = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function somenteDigitos(v: string) { return v.replace(/\D/g, ''); }

export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(cpf.slice(0,9),10) === Number(cpf[9]) &&
         dv(cpf.slice(0,10),11) === Number(cpf[10]);
}

export function tipoChavePix(chave: string): 'cpf'|'email'|'telefone'|'aleatoria'|null {
  const t = chave.trim();
  if (cpfValido(t)) return 'cpf';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'email';
  if (/^\+?\d{10,14}$/.test(t.replace(/[\s()-]/g,''))) return 'telefone';
  if (/^[0-9a-fA-F-]{32,36}$/.test(t)) return 'aleatoria';
  return null;
}
