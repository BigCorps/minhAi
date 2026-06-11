// lib/tour/stage6-script.ts

export type Stage6SceneId =
  | 'cobranca-intro'
  | 'cobranca-pix'
  | 'cobranca-tef'
  | 'cobranca-nfc'
  | 'cobranca-link'
  | 'cobranca-recebimentos'
  | 'cobranca-conclusao'

export interface Stage6Script {
  id: Stage6SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE6_SCRIPT: Stage6Script[] = [
  {
    id: 'cobranca-intro',
    label: 'Intro',
    audioText:
      'Seu assistente aceita múltiplas formas de pagamento: ' +
      'Pix, Débito ou Crédito. ' +
      'O cliente paga, o saldo cai na sua conta, e você acompanha tudo em tempo real.',
    fallbackDuration: 6000,
  },
  {
    id: 'cobranca-pix',
    label: 'PIX',
    audioText:
      'Com o Pix, o assistente gera o QR Code na hora. ' +
      'O cliente escaneia, paga, e a confirmação é automática, ' +
      'sem precisar verificar comprovantes. ' +
      'Seu saldo é atualizado em tempo real, e você não sai no prejuízo com fraudes.',
    fallbackDuration: 8000,
  },
  {
    id: 'cobranca-tef',
    label: 'TEF',
    audioText:
      'Com o Téfi, o assistente envia a cobrança direto para sua maquininha Mercado Pago Point conectada. ' +
      'O cliente insere ou aproxima o cartão, débito ou crédito, e o pagamento é processado na hora. ' +
      'Parcelamento em até 12 vezes, com o calculo de cada parcela automático.',
    displayText:
      'Com o TEF, o assistente envia a cobrança direto para sua maquininha Mercado Pago Point conectada. ' +
      'O cliente insere ou aproxima o cartão, débito ou crédito, e o pagamento é processado na hora. ' +
      'Parcelamento em até 12 vezes, com o calculo de cada parcela automático.',
    fallbackDuration: 8000,
  },
  {
    id: 'cobranca-nfc',
    label: 'NFC',
    audioText:
      'Com o N F C, seu assistente vira uma maquininha, estando em um celular ou tablet Android. ' +
      'O assistente abre o módulo de cobrança, o cliente aproxima o cartão, ' +
      'e o pagamento é processado na hora pela InfinitePay, sem equipamento extra.',
   displayText:
      'Com o NFC, seu assistente vira uma maquininha, estando em um celular ou tablet Android. ' +
      'O assistente abre o módulo de cobrança, o cliente aproxima o cartão, ' +
      'e o pagamento é processado na hora pela InfinitePay, sem equipamento extra.',
    fallbackDuration: 7000,
  },
  {
    id: 'cobranca-link',
    label: 'Links de Pagamento',
    audioText:
      'A minha I A ainda oferece dois tipos de link de cobrança: ' +
      'O link Pix gera um QR Code personalizado — o cliente abre, escolhe o valor se quiser, e paga. ' +
      'O link InfinitePay gera uma cobrança avulsa — o cliente informa o telefone e paga no crédito pelo celular. ' +
      'Ambos com com confirmação automática e link curto, prontos para compartilhar no WhatsApp, Instagram ou onde precisar.',
    displayText:
      'A minhAi ainda oferece dois tipos de link de cobrança: ' +
      'O link Pix gera um QR Code personalizado, o cliente abre, escolhe o valor se quiser, e paga. ' +
      'O link InfinitePay gera uma cobrança avulsa, o cliente informa o telefone e paga no crédito pelo celular. ' +
      'Ambos com com confirmação automática e link curto, prontos para compartilhar no WhatsApp, Instagram ou onde precisar.',
    fallbackDuration: 10000,
  },
  {
    id: 'cobranca-recebimentos',
    label: 'Recebimentos',
    audioText:
      'Todos os pagamentos caem na sua página de recebimentos. ' +
      'O saldo disponível é atualizado automaticamente a cada Pix confirmado. ' +
      'N F C, Téfi e Link aparecem no histórico, mas o saldo para saque considera apenas o Pix. ' +
      'Quando quiser sacar, é só informar o valor, e o Pix e cai na sua conta em instantes.',
    displayText:
      'Todos os pagamentos caem na sua página de recebimentos. ' +
      'O saldo disponível é atualizado automaticamente a cada Pix confirmado. ' +
      'NFC, TEF e Link aparecem no histórico, mas o saldo para saque considera apenas o Pix. ' +
      'Quando quiser sacar, é só informar o valor, e o Pix e cai na sua conta em instantes.',
    fallbackDuration: 9000,
  },
  {
    id: 'cobranca-conclusao',
    label: 'Conclusão',
    audioText:
      'Pix, Débito ou Crédito, ' +
      'tudo pelo assistente ou enviando links para seus clientes. Sem trocar de tela, sem aplicativo separado. ' +
      'Seu negócio recebendo de todas as formas, em qualquer canal.',
    fallbackDuration: 6000,
  },
]
