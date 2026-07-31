// lib/validateDocumento.ts
// Validador único de CPF/CNPJ com auto-detecção de tipo.
// Extraído das 5 cópias duplicadas em ConsultarCpfModal, ConsultarCnpjModal,
// RestricoesCPFDisplay, RestricoesCNPJDisplay e ConsultarProtestosModal —
// a lógica é idêntica em todas, só centralizamos aqui.

export type TipoDocumento = 'cpf' | 'cnpj' | null;

export const validateCPF = (cpf: string): boolean => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i - 1]) * (11 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i - 1]) * (12 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(cpf[10]);
};

export const validateCNPJ = (cnpj: string): boolean => {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let len = 12, sum = 0, pos = len - 7;
  for (let i = len; i >= 1; i--) { sum += parseInt(cnpj[len - i]) * pos--; if (pos < 2) pos = 9; }
  let rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rem !== parseInt(cnpj[12])) return false;
  len = 13; sum = 0; pos = len - 7;
  for (let i = len; i >= 1; i--) { sum += parseInt(cnpj[len - i]) * pos--; if (pos < 2) pos = 9; }
  rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return rem === parseInt(cnpj[13]);
};

/** Detecta o tipo pelo tamanho do valor já limpo (só dígitos). Não valida — só classifica. */
export function detectarTipoDocumento(valorLimpo: string): TipoDocumento {
  if (valorLimpo.length === 11) return 'cpf';
  if (valorLimpo.length === 14) return 'cnpj';
  return null;
}

/** true somente se o tamanho bate E os dígitos verificadores são válidos. */
export function documentoValido(valorLimpo: string): boolean {
  const tipo = detectarTipoDocumento(valorLimpo);
  if (tipo === 'cpf') return validateCPF(valorLimpo);
  if (tipo === 'cnpj') return validateCNPJ(valorLimpo);
  return false;
}

/** Formata progressivamente enquanto digita — decide máscara CPF ou CNPJ pelo tamanho. */
export function formatarDocumento(valor: string): string {
  const cleaned = valor.replace(/\D/g, '').slice(0, 14);

  if (cleaned.length <= 11) {
    return cleaned
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
