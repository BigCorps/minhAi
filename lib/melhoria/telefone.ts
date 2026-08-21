// lib/melhoria/telefone.ts
// ─────────────────────────────────────────────────────────────────────────────
// PORTADO de components/assistant/EnviarSmsDisplay.tsx da minhAi.
//
// A função formatarTelefone é cópia literal — já está validada em produção e
// não há motivo para reescrever. O que acrescentei aqui:
//
//   · validarTelefone — as checagens que estavam soltas dentro do handleEnviar
//     do modal, extraídas para poderem rodar também no servidor
//   · contarSms — o limite de 160 caracteres, que na MelhorIA vira CUSTO e não
//     só validação: cada 160 caracteres é um SMS, e cada SMS custa 2 créditos
// ─────────────────────────────────────────────────────────────────────────────

/** Cópia literal do formatarTelefone do EnviarSmsDisplay. */
export function formatarTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '');
  const limitado = numeros.substring(0, 11);

  if (limitado.length <= 2) {
    return limitado;
  } else if (limitado.length <= 7) {
    return `(${limitado.substring(0, 2)}) ${limitado.substring(2)}`;
  } else {
    return `(${limitado.substring(0, 2)}) ${limitado.substring(2, 7)}-${limitado.substring(7)}`;
  }
}

export function apenasNumeros(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

export interface ValidacaoTelefone {
  valido: boolean;
  numeros: string;
  /** Mensagem em português claro, pronta para a tela. */
  erro?: string;
}

/**
 * Mesmas regras do handleEnviar do EnviarSmsDisplay, mais duas que fazem
 * sentido no contexto de emergência.
 */
export function validarTelefone(valor: string): ValidacaoTelefone {
  const numeros = apenasNumeros(valor);

  if (!numeros) {
    return { valido: false, numeros, erro: 'Digite o número do telefone.' };
  }

  if (numeros.length < 10) {
    return {
      valido: false, numeros,
      erro: 'Faltam números. Use DDD e o número completo.',
    };
  }

  if (numeros.length > 11) {
    return { valido: false, numeros, erro: 'Sobram números. Confira e digite de novo.' };
  }

  const ddd = Number(numeros.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valido: false, numeros, erro: 'O DDD não parece certo. Confira os dois primeiros números.' };
  }

  // Celular tem 11 dígitos e começa com 9 depois do DDD. SMS para fixo não
  // chega — e num aviso de emergência descobrir isso na hora é tarde demais.
  if (numeros.length === 10) {
    return {
      valido: false, numeros,
      erro: 'Este parece ser um telefone fixo. O aviso por mensagem só chega em celular.',
    };
  }

  if (numeros[2] !== '9') {
    return {
      valido: false, numeros,
      erro: 'Número de celular começa com 9 depois do DDD. Confira.',
    };
  }

  return { valido: true, numeros };
}

/**
 * Quantos SMS uma mensagem vai custar.
 *
 * O modal da minhAi tratava 160 caracteres como limite duro e bloqueava o
 * envio. Aqui é diferente: a mensagem de pânico pode passar de 160 se levar
 * localização junto, e bloquear o aviso por causa disso seria absurdo. Então
 * contamos quantos SMS são, e a tela mostra o custo antes.
 */
export function contarSms(mensagem: string): number {
  const tamanho = (mensagem || '').length;
  if (tamanho === 0) return 0;
  if (tamanho <= 160) return 1;
  // Acima de 160 o SMS é fragmentado e cada parte perde 7 caracteres de
  // cabeçalho de concatenação.
  return Math.ceil(tamanho / 153);
}

/** Mensagem padrão do botão de emergência, quando a pessoa não escreveu uma. */
export function mensagemPanicoPadrao(nome: string): string {
  const primeiro = (nome || '').trim().split(' ')[0] || 'Seu familiar';
  return `${primeiro} apertou o botao de emergencia no aplicativo MelhorIA e precisa de ajuda agora.`;
}

/**
 * Monta o texto final do SMS.
 *
 * Sem acento de propósito: SMS com acento vira UCS-2 e o limite despenca de
 * 160 para 70 caracteres — ou seja, o mesmo aviso custaria o dobro ou o
 * triplo de créditos. A mensagem na tela do app mantém os acentos; só o SMS
 * sai sem.
 */
export function removerAcentos(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

export function montarSmsPanico(
  mensagem: string,
  local?: { latitude: number; longitude: number } | null,
): string {
  const base = removerAcentos(mensagem).trim();
  if (!local) return base;

  // Link curto do Google Maps. Vale os caracteres: saber onde a pessoa está é
  // frequentemente mais útil que o texto.
  const mapa = `https://maps.google.com/?q=${local.latitude.toFixed(5)},${local.longitude.toFixed(5)}`;
  return `${base} Local: ${mapa}`;
}
