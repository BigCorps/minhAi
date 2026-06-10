// lib/tour/stage5-script.ts

export type Stage5SceneId =
  | 'dashboard-visao'
  | 'dashboard-funcoes'
  | 'dashboard-integracoes'
  | 'dashboard-gestao'
  | 'dashboard-perfil'
  | 'dashboard-conclusao'

export interface Stage5Script {
  id: Stage5SceneId
  label: string
  audioText: string
  displayText?: string
  fallbackDuration: number
}

export const STAGE5_SCRIPT: Stage5Script[] = [
  {
    id: 'dashboard-visao',
    label: 'O Dashboard',
    audioText:
      'Este é o seu painel de controle: onde você gerencia tudo relacionado ao seu assistente. ' +
      'No menu lateral você acessa todas as seções: ' +
      'funções, vendas, produção, integrações com Google e Meta, ' +
      'integrações externas, notas fiscais, arquivos e muito mais. ' +
      'Tudo em um único lugar, sem precisar sair do painel.',
    fallbackDuration: 9000,
  },
  {
    id: 'dashboard-funcoes',
    label: 'Funções',
    audioText:
      'Em Funções e Habilidades você ativa ou desativa cada uma das mais de 100 funções ' +
      'com um simples click. ' +
      'O assistente executa apenas o que está ativo. ' +
      'Você controla exatamente o que o cliente pode acessar, ' +
      'por categoria e por função.',
    fallbackDuration: 8000,
  },
  {
    id: 'dashboard-integracoes',
    label: 'Integrações',
    audioText:
      'Em Serviços Google você conecta o Google Agenda, Gmail, Drive, Maps e outros. ' +
      'Em Serviços Meta você integra WhatsApp Business, Instagram e Facebook ' +
      'para o assistente responder mensagens e comentários diretamente. ' +
      'E em Integrações, você conecta o assistente ao ChatGPT, ao Claude e outros.',
    fallbackDuration: 9000,
  },
  {
    id: 'dashboard-gestao',
    label: 'Gestão',
    audioText:
      'Em Vendas e Produtos você cadastra seu catálogo completo com fotos, preços e categorias. ' +
      'Em Linha de Produção você tem a lista fichas técnicas e custos. ' +
      'Em Controle de Usuários você gerencia seus clientes e colaboradores cadastrados. ' +
      'E em Notas Fiscais e Arquivos você acessa o histórico fiscal e os documentos enviados no assistente.',
    fallbackDuration: 9000,
  },
  {
    id: 'dashboard-perfil',
    label: 'Meu Perfil',
    audioText:
      'No menu do usuário você tem acesso ao seu perfil, ' +
      'ao painel de créditos com o saldo disponível e o histórico de consumo, ' +
      'aos seus recebimentos, ao programa de indicações, ' +
      'ao histórico completo de interações do assistente ' +
      'e à seção de ajuda com suporte direto.',
    fallbackDuration: 8000,
  },
  {
    id: 'dashboard-conclusao',
    label: 'Conclusão',
    audioText:
      'O dashboard minha I Á é o centro de operações do seu negócio digital, ' +
      'simples o suficiente para qualquer pessoa usar sem treinamento, ' +
      'e completo o suficiente para escalar ' +
      'e vender em todos os canais.',
    displayText:
      'O dashboard minhAi é o centro de operações do seu negócio digital, ' +
      'simples o suficiente para qualquer pessoa usar sem treinamento, ' +
      'e completo o suficiente para escalar ' +
      'e vender em todos os canais.',
    fallbackDuration: 7000,
  },
]