import type { SupportProduct } from './product-context';

type SupportArticle = {
  id: string;
  terms: string[];
  answer: string;
};

const KB: Partial<Record<SupportProduct, SupportArticle[]>> = {
  conviteia: [
    {
      id: 'publicacao',
      terms: ['convite saiu ar', 'convite sair ar', 'cancelar plano', 'publicado', 'fica no ar'],
      answer: 'Convites já publicados continuam no ar. O vencimento de um plano pode bloquear novas criações, mas não derruba um convite que já foi publicado.',
    },
    {
      id: 'criacao',
      terms: ['criar convite', 'preview', 'prévia', 'pagar antes', 'teste', 'montar convite'],
      answer: 'Você pode montar e visualizar a prévia do convite antes da publicação. O pagamento entra na etapa de publicar o convite.',
    },
    {
      id: 'recursos',
      terms: ['confirmacao presença', 'rsvp', 'presentes', 'recados', 'memorias', 'memórias', 'gestao evento'],
      answer: 'O ConviteIA reúne o convite e a gestão do evento, com confirmação de presença, recursos de interação e funcionalidades adicionais do evento no mesmo ambiente.',
    },
  ],
  pixwiki: [
    {
      id: 'dinheiro',
      terms: ['dinheiro fica', 'receber pix', 'mercado pago', 'saldo', 'conta'],
      answer: 'Na PixWiki o dinheiro permanece na conta Mercado Pago conectada pelo próprio recebedor. A PixWiki automatiza confirmação, notificações, Checkout, Link, API e Webhooks.',
    },
    {
      id: 'taxa',
      terms: ['taxa pixwiki', 'percentual', 'porcentagem', '0%', 'zero por cento'],
      answer: 'A proposta da PixWiki é cobrar pela automação, sem descontar percentual da venda como taxa PixWiki. Tarifas eventualmente cobradas pelo Mercado Pago são independentes.',
    },
    {
      id: 'comprovante',
      terms: ['comprovante falso', 'confirmar pagamento', 'pix pago', 'pagamento confirmado'],
      answer: 'A confirmação vem da integração com a conta conectada, e não apenas de uma imagem de comprovante enviada pelo cliente.',
    },
  ],
  funcionaria: [
    {
      id: 'basico',
      terms: ['gratis', 'grátis', 'preco', 'preço', 'contratar', 'funcionaria'],
      answer: 'A base da FuncionarIA pode ser criada gratuitamente e inclui recepção, informações da empresa, FAQs, widget e recursos básicos. Habilidades adicionais podem ser contratadas conforme a operação.',
    },
    {
      id: 'canais',
      terms: ['tablet', 'totem', 'site', 'widget', 'presencial', 'online'],
      answer: 'A mesma FuncionarIA pode trabalhar no presencial, em tablet/computador/terminal, e online em subdomínio próprio, widget e canais contratados.',
    },
  ],
  melhoria: [
    {
      id: 'limites-medicos',
      terms: ['remedio', 'remédio', 'dose', 'diagnostico', 'diagnóstico', 'exame', 'medico', 'médico'],
      answer: 'A MelhorIA organiza lembretes e informações de rotina, mas não substitui orientação médica. Dúvidas sobre dose, diagnóstico, tratamento ou interpretação clínica devem ser levadas a um profissional de saúde.',
    },
    {
      id: 'lembretes',
      terms: ['lembrete', 'consulta', 'medicamento', 'agenda'],
      answer: 'A MelhorIA foi criada para organizar lembretes de medicamentos, consultas e exames, com foco em simplicidade para a pessoa e para quem ajuda nos cuidados.',
    },
  ],
  artefinal: [
    {
      id: 'finalidade',
      terms: ['pdf', 'arte', 'impressao', 'impressão', 'arquivo', 'grafica', 'gráfica'],
      answer: 'O ArteFinal.app ajuda a preparar uma arte para produção, com fluxo de envio, prévia e geração de PDF para facilitar a conferência antes da impressão.',
    },
  ],
  consultatec: [
    {
      id: 'finalidade',
      terms: ['consulta', 'cnpj', 'cpf', 'dados', 'cadastro'],
      answer: 'O ConsultaTec reúne consultas de dados cadastrais em uma interface simples. Se uma consulta específica falhou, informe qual tipo de consulta foi feita e a mensagem exibida.',
    },
  ],
  midia: [
    {
      id: 'finalidade',
      terms: ['painel', 'tela', 'anuncio', 'anúncio', 'publicidade', 'player'],
      answer: 'O Midia.Pro organiza publicidade em telas e painéis, incluindo criativos, agenda e reprodução. Para falhas de exibição, informe qual tela/player e o horário aproximado.',
    },
  ],
  minhai: [
    {
      id: 'finalidade',
      terms: ['minhai', 'assistente', 'empresa', 'funcoes', 'funções'],
      answer: 'A minhAi é a plataforma-base da BigCorps para assistentes, automações e integrações empresariais. Posso ajudar a identificar problemas de acesso, configuração ou uso das funções.',
    },
  ],
  minia: [
    {
      id: 'finalidade',
      terms: ['minia', 'min.ia', 'assistente', 'acesso'],
      answer: 'A min.IA faz parte do ecossistema BigCorps. Se algo não estiver funcionando, informe a tela, o que você tentou fazer e a mensagem exibida.',
    },
  ],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9%\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function supportKnowledgeReply(product: SupportProduct, message: string) {
  const input = normalize(message);
  if (!input) return null;

  let best: { score: number; answer: string } | null = null;
  for (const article of KB[product] || []) {
    let score = 0;
    for (const term of article.terms) {
      const t = normalize(term);
      if (t && input.includes(t)) score += Math.max(2, t.split(' ').length * 2);
      else {
        const words = t.split(' ').filter((w) => w.length > 3);
        score += words.filter((w) => input.includes(w)).length;
      }
    }
    if (!best || score > best.score) best = { score, answer: article.answer };
  }

  return best && best.score >= 3 ? best.answer : null;
}

export function supportKnowledgeContext(product: SupportProduct) {
  return (KB[product] || []).map((article) => `- ${article.answer}`).join('\n');
}
