// lib/tour/stage8-script.ts

export type Stage8SceneId =
  | 'planos-intro'
  | 'planos-smart-mensal'
  | 'planos-smart-creditos'
  | 'planos-full'
  | 'planos-vendas'
  | 'planos-conclusao'

export interface Stage8Script {
  id: Stage8SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE8_SCRIPT: Stage8Script[] = [
  {
    id: 'planos-intro',
    label: 'Intro',
    audioText:
      'A minha I A tem dois modelos de uso: você escolhe o que faz mais sentido pro seu negócio. ' +
      'A minha I A Smart funciona por créditos: você compra, usa quando quiser, sem mensalidade obrigatória. ' +
      'A minha I A Vendas é gratuito para o lojista, sem mensalidade, sem créditos. ' +
      'Você só paga comissão quando vender.',
    displayText:
      'A minhAi tem dois modelos de uso: você escolhe o que faz mais sentido pro seu negócio. ' +
      'A minhAi Smart funciona por créditos: você compra, usa quando quiser, sem mensalidade obrigatória. ' +
      'A minhAi Vendas é gratuito para o lojista, sem mensalidade, sem créditos. ' +
      'Você só paga comissão quando vender.',
    fallbackDuration: 9000,
  },
  {
    id: 'planos-smart-mensal',
    label: 'Smart — Planos',
    audioText:
      'No Smart, os planos mensais desbloqueiam recursos avançados. ' +
      'O plano Top por quarenta e nove reais e noventa por mês inclui cinquenta créditos, ' +
      'Serviços Google, Serviços Meta, Linha de Produção, QR Codes com seu logo e impressão. ' +
      'O plano Consulting por duzentos e noventa e nove reais e noventa' +
      'inclui trezentos créditos, webapp com subdomínio próprio e consultoria incluída.',
    displayText:
      'No Smart, os planos mensais desbloqueiam recursos avançados. ' +
      'O plano Top por R$ 49,90/mês inclui 50 créditos, ' +
      'Serviços Google, Serviços Meta, Linha de Produção, QR Codes com seu logo e impressão. ' +
      'O plano Consulting por R$ 299,90/mês' +
      'inclui 300 créditos, webapp com subdomínio próprio e consultoria incluída.',
    fallbackDuration: 10000,
  },
  {
    id: 'planos-smart-creditos',
    label: 'Smart — Créditos',
    audioText:
      'Além dos planos mensais, você pode comprar créditos avulsos a qualquer momento. ' +
      'O pacote Starter tem duzentas interações ' +
      'O Professional, mais popular, tem mil interações ' +
      'O Business tem três mil e seiscentas interações. ' +
      'E o Enterprise tem dez mil interações. ' +
      'Todos pagos via Pix. E para começar, você já recebe vinte créditos grátis.',
    displayText:
      'Além dos planos mensais, você pode comprar créditos avulsos a qualquer momento. ' +
      'Starter: 200 interações por R$ 29,90. ' +
      'Professional (mais popular): 1.000 interações por R$ 99,90. ' +
      'Business: 3.600 interações por R$ 249,90. ' +
      'Enterprise: 10.000 interações por R$ 499,90. ' +
      'Todos pagos via PIX. E para começar, você já recebe 20 créditos grátis.',
    fallbackDuration: 12000,
  },
  {
    id: 'planos-full',
    label: 'Plano Full',
    audioText:
      'Para quem quer uma solução completa e personalizada, existe o Plano Full. ' +
      'Créditos ilimitados, domínio e subdomínios próprios, landing page personalizada, ' +
      'implementação e configuração completa pela equipe minha I A, ' +
      'e suporte vinte e quatro horas. ' +
      'É a solução ideal para agências, franquias e grandes operações.',
    displayText:
      'Para quem quer uma solução completa e personalizada, existe o Plano Full. ' +
      'Créditos ilimitados, domínio e subdomínios próprios, landing page personalizada, ' +
      'implementação e configuração completa pela equipe minhAi, ' +
      'e suporte 24 horas. ' +
      'É a solução ideal para agências, franquias e grandes operações.',
    fallbackDuration: 9000,
  },
  {
    id: 'planos-vendas',
    label: 'minhAi Vendas',
    audioText:
      'A minha I A Vendas é gratuito para o lojista. ' +
      'Sem mensalidade, sem créditos, sem surpresa. ' +
      'Você só paga dez por cento por venda confirmada, descontado automaticamente no saque. ' +
      'Vem com dezoito funções incluídas: modo venda, catálogo, pedidos, agendamento, ' +
      'pagamentos, cadastro e muito mais — tudo ativo desde o primeiro dia.',
    displayText:
      'A minhAi Vendas é gratuito para o lojista. ' +
      'Sem mensalidade, sem créditos, sem surpresa. ' +
      'Você só paga 10% por venda confirmada, descontado automaticamente no saque. ' +
      'Vem com 18 funções incluídas: modo venda, catálogo, pedidos, agendamento, ' +
      'pagamentos, cadastro e muito mais — tudo ativo desde o primeiro dia.',
    fallbackDuration: 11000,
  },
  {
    id: 'planos-conclusao',
    label: 'Conclusão',
    audioText:
      'Comece grátis, escale no seu ritmo. ' +
      'Smart para quem quer controle total. Vendas para quem quer vender sem custo fixo. ' +
      'Full para quem quer tudo pronto e com a sua marca. ' +
      'O plano certo pro negócio certo, sem amarras. Teste agora mesmo!',
    fallbackDuration: 7000,
  },
]
