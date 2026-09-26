export type MidiaDocumentType = 'cpf' | 'cnpj';
export type MidiaPixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export function onlyDigits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function validCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

export function validCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  if (d1 !== Number(cnpj[12])) return false;
  const d2 = calc(cnpj.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d2 === Number(cnpj[13]);
}

export function documentType(value: string): MidiaDocumentType | null {
  const digits = onlyDigits(value);
  if (digits.length === 11 && validCpf(digits)) return 'cpf';
  if (digits.length === 14 && validCnpj(digits)) return 'cnpj';
  return null;
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim().toLowerCase());
}

export function normalizePixKey(value: string, type: MidiaPixKeyType) {
  const raw = String(value || '').trim();
  if (type === 'cpf') {
    const digits = onlyDigits(raw);
    return validCpf(digits) ? digits : null;
  }
  if (type === 'cnpj') {
    const digits = onlyDigits(raw);
    return validCnpj(digits) ? digits : null;
  }
  if (type === 'email') return validEmail(raw) ? raw.toLowerCase() : null;
  if (type === 'phone') {
    const compact = raw.replace(/[\s().-]/g, '');
    const digits = compact.replace(/^\+/, '');
    if (!/^\d{10,15}$/.test(digits)) return null;
    return raw.startsWith('+') ? `+${digits}` : digits;
  }
  if (type === 'random') {
    const key = raw.toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key) ? key : null;
  }
  return null;
}
