// scripts/pregenerate-tour-audio.ts
/**
 * Pré-gera todos os áudios de todos os stages do tour.
 * Rode após qualquer alteração de audioText:
 *
 *   npm run tts:pregenerate
 *
 * Áudios já em cache são pulados automaticamente (zero custo).
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

const SCENES: { stage: string; id: string; audioText: string }[] = [

  // ── Stage 1 ────────────────────────────────────────────────────────────────
  { stage: 'stage1', id: 'intro',        audioText: 'Sou a minha I Á, mas também posso ser Sua I Á ou Nossa I Á, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: aparelhos com telas. Computadores, tablets e celulares. totens, Whatsapp, Instagram, Facebook, aplicativos de I Á A e até no Mercado Livre' },
  { stage: 'stage1', id: 'assistente',   audioText: 'Funciono como uma Alexa, você define qual palavra de ativação me chama, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.' },
  { stage: 'stage1', id: 'whatsapp',     audioText: 'No seu próprio WhatsApp, com a naturalidade que seus clientes já conhecem. Respondo mensagens, entendo o que o cliente precisa, envio e confirmo cobranças Pix, Débito e Crédito, marco eventos na sua Agenda Google, calculo frete de entrega, gero orçamentos e muito mais.' },
  { stage: 'stage1', id: 'instagram',    audioText: 'No seu Instagram e Facebook, respondendo mensagens diretas, comentários e enviando Dê M automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.' },
  { stage: 'stage1', id: 'widget',       audioText: 'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.' },
  { stage: 'stage1', id: 'mcp',          audioText: 'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minha I Á diretamente pelo seu app de I Á favorito.' },
  { stage: 'stage1', id: 'mercadolivre', audioText: 'No Mercado Livre, respondendo perguntas de compradores e tambem postando produtos diretamente vinculados aos seus produtos no dashboard.' },
  { stage: 'stage1', id: 'whatsapp-mcp', audioText: 'E também pode pedir tarefas diretamente para o WhatsApp minha I Á, consultas, ações e integrações sem sair do aplicativo.' },
  { stage: 'stage1', id: 'outro',        audioText: 'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de I Á próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!' },

  // ── Stage 2 ────────────────────────────────────────────────────────────────
  { stage: 'stage2', id: 'assistente-intro',    audioText: 'Esta é a página do seu assistente: roda em qualquer tela, celular, tablet, totem ou computador. O cliente escolhe como interagir, escolhe o tema claro ou escuro e a apresentação: Normal com microfone e texto; Só interação por texto, como um chatbot, ou o Imersivo, com o avatar centralizado. Cada cliente tem o seu jeito, e a minha I Á se adapta a ele.' },
  { stage: 'stage2', id: 'assistente-carrossel', audioText: 'O carrossel de categorias organiza mais de 100 funções em grupos como Comercial, Financeiro, Agendamento, Serviços e muito mais. O cliente toca numa categoria, vê as funções disponíveis e escolhe o que precisa, ou simplesmente usa a palavra de ativação e fala diretamente o que quer.' },
  { stage: 'stage2', id: 'assistente-qrcode',   audioText: 'Com um único toque ou comando, o assistente gera um card na tela, para o WhatsApp da empresa, para uma cobrança PIX, ou qualquer outra das mais de 100 funções. O cliente interage por voz, digitando ou lendo o qrcode. Ele escolhe. Sem papel, sem digitação, sem atrito.' },
  { stage: 'stage2', id: 'assistente-vendas',   audioText: 'Tem ainda os modos: o Modo Vendas é uma loja virtual completa, com todos os seus produtos. Alem de interagir com o assistente, também exibe os produtos com nome, foto, descrição e preço, organizados por categoria. O cliente monta o carrinho, escolhe entre retirar no balcão, sentar na mesa ou receber em casa com entrega, o sistema já calcula o frete automaticamente. ' },
  { stage: 'stage2', id: 'assistente-fila',     audioText: 'O Modo Fila organiza o atendimento presencial com senhas digitais. O cliente retira a senha pelo totem, acompanha em tempo real pela tela e o sistema anuncia cada chamada em voz alta, sem papel, sem confusão. E para facilitar ainda mais o acesso, tem também o Modo Link: uma página rápida da empresa com WhatsApp, Instagram, site e todos os contatos, Um único endereço para o cliente encontrar todos os seus contatos' },
  { stage: 'stage2', id: 'assistente-totem',    audioText: 'No Modo Totem, a tela entra em modo quiosque com teclado virtual embutido: sem botões de saída, sem acesso ao sistema, com saída protegida por senha do proprietário. E para personalizar ainda mais a experiência, tem também o Modo Cliente, seus clientes e colaboradores criam uma conta em segundos: Clientes tendo acesso as suas compras. Os colaboradores, cada um com seu nível de acesso, com identificador e PIN cadastrados. E você tem o controle de tudo no dashboard, clientes, funcionários, gerente, caixa, totens, entre outros.' },
  { stage: 'stage2', id: 'assistente-outro',    audioText: 'O grande diferencial da minha I Á é a liberdade de interação. O cliente pode chamar como uma Alexa usando a palavra de ativação, clicar no botão e falar, navegar pelos botões do carrossel, digitar, ou interagir pelos modos.Cada pessoa utiliza do jeito que prefere, e a minha I Á está pronta para todas elas, vinte e quatro horas por dia, ' },

  // ── Stage 3 ────────────────────────────────────────────────────────────────
  { stage: 'stage3', id: 'auxiliares-intro',     audioText: 'Além de executar mais de 100 funções, a minha I Á conta com dez especialistas de I Á integrados ao seu negócio, cada um focado em conduzir processos complexos do início ao fim, por voz ou texto, em qualquer canal.' },
  { stage: 'stage3', id: 'auxiliares-vendas',    audioText: 'O Assistente de Vendas atua como um vendedor digital completo, sugere produtos com base no que o cliente pede, monta o carrinho, oferece opções de retirada, mesa ou entrega com cálculo de frete automático, e envia o link de pagamento direto para o cliente finalizar. Funciona no WhatsApp, na tela, no totem. Em qualquer canal.' },
  { stage: 'stage3', id: 'auxiliares-agenda',    audioText: 'O Gestor de Agenda conduz todo o processo de agendamento de ponta a ponta. Pergunta qual serviço ou produto o cliente quer, mostra os horários disponíveis em tempo real, pode cobrar na hora com Pix ou Link de pagamento, marca direto no Google Agenda e envia confirmação por e-mail. Tudo por voz ou texto, sem o cliente sair do canal.' },
  { stage: 'stage3', id: 'auxiliares-midia',     audioText: 'O Criador de Posts transforma uma ideia em arte pronta para as redes sociais em segundos. Uma promoção, um lançamento, uma dica, e o auxiliar gera a imagem com a identidade visual da sua marca já aplicada. A descrição e as hashtags saem prontas para copiar, e você ainda pode publicar direto no Instagram e Facebook. ' },
  { stage: 'stage3', id: 'auxiliares-fiscal',    audioText: 'O Auxiliar Fiscal emite nota fiscal por voz ou texto: N F ê, N F S ê e N F C ê. Informe os dados, ele preenche dados técnicos automaticamente e envia direto para a SEFAZ. Integrado aos produtos e clientes cadastrados no dashboard.' },
  { stage: 'stage3', id: 'auxiliares-producao',  audioText: 'O Auxiliar de Produção calcula custo e margem a partir dos insumos informados e já cria o produto no catálogo com o preço sugerido. O Auxiliar de Relatórios transforma planilhas e PDFs em relatórios formatados. O Assistente de Orçamentos vai além: ele monta o orçamento completo com produtos, data e desconto, gera o documento com o logotipo da empresa e o Pix.' },
  { stage: 'stage3', id: 'auxiliares-extras',    audioText: 'O Investigador Antifraude analisa boletos, comprovantes e U R L suspeitos e emite um laudo com nível de risco em segundos. O Auxiliar de Funções te ajuda a escolher as melhores funções de acordo com o seu ramo. E o Auxiliar de Cadastro cria produtos completos por voz ou texto. O produto já fica disponível no catálogo para venda na hora.' },
  { stage: 'stage3', id: 'auxiliares-conclusao', audioText: 'Dez especialistas I Á, cada um conduzindo processos complexos do início ao fim. Tudo por voz ou texto, em qualquer canal, sem precisar de um sistema separado para cada área. É a sua equipe digital completa, integrada em um único assistente.' },

  // ── Stage 4 ────────────────────────────────────────────────────────────────
  { stage: 'stage4', id: 'zeroaoar-cadastro',   audioText: 'Criar sua conta é rápido e gratuito! Sem cartão de crédito. Basta nome, email e senha, ou também, entrar com Google ou Facebook com um único clique. Em segundos você já está no dashboard, pronto para criar seu assistente.' },
  { stage: 'stage4', id: 'zeroaoar-wizard',     audioText: 'Ao clicar no card para criar seu primeiro assistente com I A, o processo é bem simples e intuitivo: perguntas simples sobre seu negócio: nome, ramo de atividade, tom de voz e o que o assistente deve fazer. Com base nas respostas, o sistema gera toda a parte técnica, seleciona as funções ideais para o seu segmento e já cria o assistente automaticamente.' },
  { stage: 'stage4', id: 'zeroaoar-publicar',   audioText: 'Assistente criado. Agora é só compartilhar. Você recebe um link próprio, um QR Code pronto para imprimir ou exibir na tela, e já pode configurar as integrações com Google, WhatsApp, Instagram e Facebook. Divulge o link a vontade, seu assistente já está atendendo.' },
  { stage: 'stage4', id: 'zeroaoar-config',     audioText: 'Ainda tem as configurações personalizadas, onde define a palavra de ativação, escolhe entre voz masculina ou feminina, se prefere o Avatar ou Orbe e ativar a detecção por câmera para saudar clientes automaticamente. Ajusta a sensibilidade ao ambiente: escritório silencioso, loja movimentada ou balcão ruidoso e decide o que acontece quando o assistente fica ocioso.' },
  { stage: 'stage4', id: 'zeroaoar-webapp',     audioText: 'Você também pode criar seu próprio aplicativo web: sem programar, sem contratar desenvolvedor. Escolha um subdomínio personalizado, Seu site e endereço com endereço próprio na internet, em minutos.' },
  { stage: 'stage4', id: 'zeroaoar-indicacao',  audioText: 'E tem mais: cada cliente que você indicar para a minha I A, você recebe 50% da mensalidade todos os meses Quanto mais negócios você apresentar, mais você ganha! Seu assistente trabalha, você indica, e todos saem ganhando!!!' },
  { stage: 'stage4', id: 'zeroaoar-conclusao',  audioText: 'Do cadastro ao assistente funcionando: menos de cinco minutos. Sem programador, sem código, sem contrato. Comece grátis e escale conforme seu negócio crescer.' },

  // ── Stage 5 ────────────────────────────────────────────────────────────────
  { stage: 'stage5', id: 'dashboard-visao',      audioText: 'Este é o seu painel de controle: onde você gerencia tudo relacionado ao seu assistente. No menu lateral você acessa todas as seções: funções, vendas, produção, integrações com Google e Meta, integrações externas, notas fiscais, arquivos e muito mais. Tudo em um único lugar, sem precisar sair do painel.' },
  { stage: 'stage5', id: 'dashboard-funcoes',    audioText: 'Em Funções e Habilidades você ativa ou desativa cada uma das mais de 100 funções com um simples click. O assistente executa apenas o que está ativo. Você controla exatamente o que o cliente pode acessar, por categoria e por função.' },
  { stage: 'stage5', id: 'dashboard-integracoes', audioText: 'Em Serviços Google você conecta o Google Agenda, Gmail, Drive, Maps e outros. Em Serviços Meta você integra WhatsApp Business, Instagram e Facebook para o assistente responder mensagens e comentários diretamente. E em Integrações, você conecta o assistente ao ChatGPT, ao Claude e outros.' },
  { stage: 'stage5', id: 'dashboard-gestao',     audioText: 'Em Vendas e Produtos você cadastra seu catálogo completo com fotos, preços e categorias. Na Linha de Produção você tem a lista fichas técnicas e custos. O Controle de Usuários você gerencia seus clientes e colaboradores cadastrados. Você também pode configurar respostas rápidas para perguntas específicas ou frequentes. E em Notas Fiscais e Arquivos você acessa o histórico fiscal e os documentos enviados no assistente.' },
  { stage: 'stage5', id: 'dashboard-perfil',     audioText: 'No menu do usuário você tem acesso ao seu perfil, ao painel de créditos com o saldo disponível e o histórico de consumo, aos seus recebimentos, ao programa de indicações, ao histórico completo de interações do assistente e à seção de ajuda com suporte direto.' },
  { stage: 'stage5', id: 'dashboard-conclusao',  audioText: 'O dashboard minha I Á é o centro de operações do seu negócio digital, simples o suficiente para qualquer pessoa usar sem treinamento, e completo o suficiente para escalar e vender em todos os canais.' },

  // ── Stage 6 ────────────────────────────────────────────────────────────────
  { stage: 'stage6', id: 'cobranca-intro',        audioText: 'Seu assistente aceita múltiplas formas de pagamento: Pix, Débito ou Crédito. O cliente paga, o saldo cai na sua conta, e você acompanha tudo em tempo real.' },
  { stage: 'stage6', id: 'cobranca-pix',          audioText: 'Com o Pix, o assistente gera o QR Code na hora. O cliente escaneia, paga, e a confirmação é automática, sem precisar verificar comprovantes. Seu saldo é atualizado em tempo real, e você não sai no prejuízo com fraudes.' },
  { stage: 'stage6', id: 'cobranca-tef',          audioText: 'Com o Téfi, o assistente envia a cobrança direto para sua maquininha Mercado Pago Point conectada. O cliente insere ou aproxima o cartão, débito ou crédito, e o pagamento é processado na hora. Parcelamento em até 12 vezes, com o calculo de cada parcela automático.' },
  { stage: 'stage6', id: 'cobranca-nfc',          audioText: 'Com o N F C, seu assistente vira uma maquininha, estando em um celular ou tablet Android. O assistente abre o módulo de cobrança, o cliente aproxima o cartão, e o pagamento é processado na hora pela InfinitePay, sem equipamento extra.' },
  { stage: 'stage6', id: 'cobranca-link',         audioText: 'A minha I A ainda oferece dois tipos de link de cobrança: O link Pix gera um QR Code personalizado — o cliente abre, escolhe o valor se quiser, e paga. O link InfinitePay gera uma cobrança avulsa — o cliente informa o telefone e paga no crédito pelo celular. Ambos com com confirmação automática e link curto, prontos para compartilhar no WhatsApp, Instagram ou onde precisar.' },
  { stage: 'stage6', id: 'cobranca-recebimentos', audioText: 'Todos os pagamentos caem na sua página de recebimentos. O saldo disponível é atualizado automaticamente a cada Pix confirmado. N F C, Téfi e Link aparecem no histórico, mas o saldo para saque considera apenas o Pix. Quando quiser sacar, é só informar o valor, e o Pix e cai na sua conta em instantes.' },
  { stage: 'stage6', id: 'cobranca-conclusao',    audioText: 'Pix, Débito ou Crédito, tudo pelo assistente ou enviando links para seus clientes. Sem trocar de tela, sem aplicativo separado. Seu negócio recebendo de todas as formas, em qualquer canal.' },

  // ── Stage 7 ────────────────────────────────────────────────────────────────
  { stage: 'stage7', id: 'funcoes-intro',       audioText: 'A minha I Á tem mais de 100 funções organizadas em categorias, cada uma ativável por voz, por texto ou por clique. O assistente só executa o que você deixou ativo. controlando tudo pelo dashboard, com simples cliques.' },
  { stage: 'stage7', id: 'funcoes-conhecimento', audioText: 'Em Conhecimento, o assistente responde perguntas gerais com ChatGPT, executa respostas rápidas, cria posts gera orçamentos, mostra o clima e transcreve áudios e vídeos. Em Consultas, acessa dados de CPF e CNPJ, verifica restrições de crédito, protestos em cartório e dados de veículos por placa. funções para quem precisa de inteligência e segurança nas transações.' },
  { stage: 'stage7', id: 'funcoes-comercial',   audioText: 'Em Comercial, o assistente abre o catálogo de produtos, monta o carrinho por voz, registra vendas, gera cupons de desconto e cadastra produtos com sugestão de imagens. Em Financeiro, temos as funções de cobraça no Pix, Débito e Crédito, tudo integrado, sem sair do assistente.' },
  { stage: 'stage7', id: 'funcoes-agenda',      audioText: 'Em Agendamento, o assistente marca, reagenda, cancela e confirma compromissos direto no Google Agenda — com lembretes automáticos. Em Identificação, faz login de clientes, gera senhas de fila, coleta pré-atendimento, aplica pesquisas de satisfação e gerencia cadastros configuráveis.' },
  { stage: 'stage7', id: 'funcoes-contato',     audioText: 'Em Contato, cada canal da empresa vira um QR Code: WhatsApp, Instagram, Facebook, TikTok, LinkedIn, site, e-mail e telefone. Em Serviços, exibe cardápio digital, compartilha Wi-Fi por QR Code, envia SMS, aciona o gerente com notificação urgente, gerencia listas de compras por voz e suporta impressão local, remota e em térmicas.' },
  { stage: 'stage7', id: 'funcoes-arquivos',    audioText: 'Em Arquivos, transforma planilhas e PDFs em dashboards com gráficos e insights, remove fundo de imagens, converte formatos, duplica fotos para impressão e junta PDFs. Em Câmera, lê QR Codes e códigos de barras, extrai texto de imagens e contratos, identifica fraudes em boletos e links e permite que clientes enviem arquivos pelo assistente.' },
  { stage: 'stage7', id: 'funcoes-midia',       audioText: 'Em Multimídia, toca músicas, vídeos e playlists solicitados ou programados, exibe slideshows de ofertas, inicia videochamadas pelo Google Meet ou entre usuários. Em Utilitários, emite notas fiscais, cria lembretes e alarmes por voz, configura lembretes de remédios, gera segunda via de boleto e salva anotações direto no dashboard.' },
  { stage: 'stage7', id: 'funcoes-localizacao', audioText: 'Em Localização, mostra o endereço da empresa no mapa, traça rotas, consulta CEP e rastreia encomendas dos Correios. Em Informação, exibe cotação de câmbio em tempo real, notícias do momento, calculadora de juros, IMC, conversor de medidas e feriados nacionais.' },
  { stage: 'stage7', id: 'funcoes-conclusao',   audioText: 'Mais de 100 funções, ativadas só quando fazem sentido pro seu negócio. Você pode escolher uma ou todas as funções. Realmente uma I Á pra chamar de sua!' },

  // ── Stage 8 ────────────────────────────────────────────────────────────────
  { stage: 'stage8', id: 'planos-intro',          audioText: 'A minha I A tem dois modelos de uso: você escolhe o que faz mais sentido pro seu negócio. A minha I A Smart funciona por créditos: você compra, usa quando quiser, sem mensalidade obrigatória. A minha I A Vendas é gratuito para o lojista, sem mensalidade, sem créditos. Você só paga comissão quando vender.' },
  { stage: 'stage8', id: 'planos-smart-mensal',   audioText: 'No Smart, os planos mensais desbloqueiam recursos avançados: O plano Top, com Serviços Google, Serviços Meta, Linha de Produção, QR Codes com seu logo e funções de impressão. O plano Consulting, com tudo isso e mais: Webapp com subdomínio próprio e consultoria.' },
  { stage: 'stage8', id: 'planos-smart-creditos', audioText: 'Além dos planos mensais, você pode comprar créditos avulsos a qualquer momento. O pacote Starter tem duzentas créditos O Professional, mais popular, tem mil créditos O Business tem três mil e seiscentas créditos. E o Enterprise tem dez mil créditos. Todos pagos via Pix. E para começar, você já recebe vinte créditos grátis.' },
  { stage: 'stage8', id: 'planos-full',           audioText: 'Para quem quer uma solução completa e personalizada, existe o Plano Full. Créditos ilimitados, domínio próprio, site personalizado, implementação e configuração completa pela equipe minha I A, e suporte vinte e quatro horas. É a solução ideal para agências, franquias e grandes operações.' },
  { stage: 'stage8', id: 'planos-vendas',         audioText: 'A minha I A Vendas é gratuito para o lojista. Sem mensalidade, sem créditos, sem surpresa. Você só paga dez por cento por venda confirmada, descontado automaticamente no saque. Vem com funções específicas com foco total em vendas.' },
  { stage: 'stage8', id: 'planos-conclusao',      audioText: 'Comece grátis, escale no seu ritmo. Smart para quem quer controle total. Vendas para quem quer vender sem custo fixo. Full para quem quer tudo pronto e com a sua marca. O plano certo pro negócio certo, sem amarras. Teste agora mesmo!' },
];

async function generate(stage: string, id: string, text: string) {
  const res = await fetch(`${BASE_URL}/api/google-tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  const fromCache = res.headers.get('X-Cache') === 'HIT';
  const bytes = Number(res.headers.get('Content-Length') ?? 0);
  const genTime = res.headers.get('X-Generation-Time');

  const status = fromCache ? '🎯 cache' : `✅ ${genTime}ms`;
  console.log(`  [${stage}/${id}] ${status} — ${(bytes / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log(`\n🚀 Pré-gerando ${SCENES.length} áudios em ${BASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const scene of SCENES) {
    try {
      await generate(scene.stage, scene.id, scene.audioText);
      success++;
    } catch (err: any) {
      console.error(`  [${scene.stage}/${scene.id}] ❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 ${success} gerados, ${failed} erros\n`);
  if (failed > 0) process.exit(1);
}

main();