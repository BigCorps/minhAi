'use client'
// app/tour/export/page.tsx
// 1 slide por página · card à esquerda · texto à direita
// Chrome desktop → aguarda verde → Ctrl+P → A4 Paisagem → Gráficos de fundo

import { useState, useEffect } from 'react'

// ── Stage 1 ────────────────────────────────────────────────────
import SceneIntro from '@/components/tour/scenes/SceneIntro'
import SceneAssistente from '@/components/tour/scenes/SceneAssistente'
import SceneWidget from '@/components/tour/scenes/SceneWidget'
import SceneWhatsApp from '@/components/tour/scenes/SceneWhatsApp'
import SceneInstagram from '@/components/tour/scenes/SceneInstagram'
import SceneMercadoLivre from '@/components/tour/scenes/SceneMercadoLivre'
import SceneMCP from '@/components/tour/scenes/SceneMCP'
import SceneWhatsAppMCP from '@/components/tour/scenes/SceneWhatsAppMCP'
// ── Stage 2 ────────────────────────────────────────────────────
import SceneCarrossel from '@/components/tour/scenes/SceneCarrossel'
import SceneQRCode from '@/components/tour/scenes/SceneQRCode'
import SceneVendas from '@/components/tour/scenes/SceneVendas'
import SceneFila from '@/components/tour/scenes/SceneFila'
import SceneTotem from '@/components/tour/scenes/SceneTotem'
// ── Stage 3 ────────────────────────────────────────────────────
import SceneAuxiliaresIntro from '@/components/tour/scenes/SceneAuxiliaresIntro'
import SceneVendasAux from '@/components/tour/scenes/SceneVendasAux'
import SceneFiscal from '@/components/tour/scenes/SceneFiscal'
import SceneAgenda from '@/components/tour/scenes/SceneAgenda'
import SceneMidia from '@/components/tour/scenes/SceneMidia'
import SceneProducaoOrcamentos from '@/components/tour/scenes/SceneProducaoOrcamentos'
import SceneExtrasAux from '@/components/tour/scenes/SceneExtrasAux'
// ── Stage 4 ────────────────────────────────────────────────────
import SceneCadastro from '@/components/tour/scenes/SceneCadastro'
import SceneWizard from '@/components/tour/scenes/SceneWizard'
import ScenePublicar from '@/components/tour/scenes/ScenePublicar'
import SceneConfig from '@/components/tour/scenes/SceneConfig'
import SceneWebApp from '@/components/tour/scenes/SceneWebApp'
import SceneIndicacao from '@/components/tour/scenes/SceneIndicacao'
import SceneConclusaoZero from '@/components/tour/scenes/SceneConclusaoZero'
// ── Stage 5 ────────────────────────────────────────────────────
import SceneDashboardVisao from '@/components/tour/scenes/SceneDashboardVisao'
import SceneDashboardFuncoes from '@/components/tour/scenes/SceneDashboardFuncoes'
import SceneDashboardIntegracoes from '@/components/tour/scenes/SceneDashboardIntegracoes'
import SceneDashboardGestao from '@/components/tour/scenes/SceneDashboardGestao'
import SceneDashboardPerfil from '@/components/tour/scenes/SceneDashboardPerfil'
import SceneDashboardConclusao from '@/components/tour/scenes/SceneDashboardConclusao'
// ── Stage 6 ────────────────────────────────────────────────────
import SceneCobrancaIntro from '@/components/tour/scenes/SceneCobrancaIntro'
import SceneCobrancaPix from '@/components/tour/scenes/SceneCobrancaPix'
import SceneCobrancaTef from '@/components/tour/scenes/SceneCobrancaTef'
import SceneCobrancaNfc from '@/components/tour/scenes/SceneCobrancaNfc'
import SceneCobrancaLink from '@/components/tour/scenes/SceneCobrancaLink'
import SceneCobrancaRecebimentos from '@/components/tour/scenes/SceneCobrancaRecebimentos'
import SceneCobrancaConclusao from '@/components/tour/scenes/SceneCobrancaConclusao'
// ── Stage 7 ────────────────────────────────────────────────────
import SceneFuncoesIntro from '@/components/tour/scenes/SceneFuncoesIntro'
import SceneFuncoesConhecimento from '@/components/tour/scenes/SceneFuncoesConhecimento'
import SceneFuncoesComercial from '@/components/tour/scenes/SceneFuncoesComercial'
import SceneFuncoesAgenda from '@/components/tour/scenes/SceneFuncoesAgenda'
import SceneFuncoesContato from '@/components/tour/scenes/SceneFuncoesContato'
import SceneFuncoesArquivos from '@/components/tour/scenes/SceneFuncoesArquivos'
import SceneFuncoesMidia from '@/components/tour/scenes/SceneFuncoesMidia'
import SceneFuncoesLocalizacao from '@/components/tour/scenes/SceneFuncoesLocalizacao'
import SceneFuncoesConclusao from '@/components/tour/scenes/SceneFuncoesConclusao'
// ── Stage 8 ────────────────────────────────────────────────────
import ScenePlanosIntro from '@/components/tour/scenes/ScenePlanosIntro'
import ScenePlanosSmartMensal from '@/components/tour/scenes/ScenePlanosSmartMensal'
import ScenePlanosSmartCreditos from '@/components/tour/scenes/ScenePlanosSmartCreditos'
import ScenePlanosFullPlan from '@/components/tour/scenes/ScenePlanosFullPlan'
import ScenePlanosVendas from '@/components/tour/scenes/ScenePlanosVendas'
import ScenePlanosConclusao from '@/components/tour/scenes/ScenePlanosConclusao'

// ─────────────────────────────────────────────────────────────
// TIPO
// ─────────────────────────────────────────────────────────────
interface SlideData {
  id: string
  label: string
  caption: string
  node: React.ReactNode
  stageNumber: number
  stageTitle: string
  stageColor: string
}

// ─────────────────────────────────────────────────────────────
// TODOS OS SLIDES (lista plana — 1 por página)
// ─────────────────────────────────────────────────────────────
const ALL_SLIDES: SlideData[] = [
  // ── Stage 1 ──
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'intro', label:'Introdução', node:<SceneIntro isSpeaking={false} theme="light" />,
    caption:'Sou a minhAi, mas também posso ser Sua IA ou Nossa IA, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: Aparelhos com telas (computadores, tablets e celulares), Totens, Whatsapp, Instagram, Facebook, aplicativos de IA e até no Mercado Livre.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'assistente', label:'Tela & Totem', node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'Funciono como uma Alexa, você define qual palavra de ativação me chama, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'whatsapp', label:'WhatsApp', node:<SceneWhatsApp />,
    caption:'No seu próprio WhatsApp, com a naturalidade que seus clientes já conhecem. Respondo mensagens, entendo o que o cliente precisa, envio e confirmo cobranças Pix, Débito e Crédito, marco eventos na sua Agenda Google, calculo frete de entrega, gero orçamentos e muito mais.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'instagram', label:'Instagram', node:<SceneInstagram />,
    caption:'No Instagram e Facebook, respondendo mensagens diretas, comentários e enviando DMs automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'widget', label:'Widget Web', node:<SceneWidget />,
    caption:'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'mcp', label:'Servidor MCP', node:<SceneMCP />,
    caption:'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minhAi diretamente pelo seu app de IA favorito.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'mercadolivre', label:'Mercado Livre', node:<SceneMercadoLivre />,
    caption:'No Mercado Livre, respondendo perguntas de compradores e também postando produtos diretamente vinculados aos seus produtos no dashboard.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'whatsapp-mcp', label:'WhatsApp MCP', node:<SceneWhatsAppMCP />,
    caption:'E também pode pedir tarefas diretamente para o WhatsApp minhAi — consultas, ações e integrações sem sair do aplicativo.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6',
    id:'outro', label:'Conclusão', node:<SceneIntro isOutro isSpeaking={false} theme="light" />,
    caption:'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de IA próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!' },

  // ── Stage 2 ──
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-intro', label:'A Página', node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'Esta é a página do seu assistente: roda em qualquer tela, celular, tablet, totem ou computador. O cliente escolhe como interagir, escolhe o tema claro ou escuro e a apresentação: Normal com microfone ou texto; Só interação por texto, como um chatbot, ou o Imersivo, com o avatar centralizado. Cada cliente tem o seu jeito, e a minhAi se adapta a ele.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-carrossel', label:'Categorias', node:<SceneCarrossel />,
    caption:'O carrossel de categorias organiza mais de 100 funções em grupos como Comercial, Financeiro, Agendamento, Serviços e muito mais. O cliente toca numa categoria, vê as funções disponíveis e escolhe o que precisa, ou simplesmente usa a palavra de ativação e fala diretamente o que quer.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-qrcode', label:'QR Code', node:<SceneQRCode />,
    caption:'Com um único toque ou comando, o assistente gera um card na tela, para o WhatsApp da empresa, para uma cobrança PIX, ou qualquer outra das mais de 100 funções. O cliente interage por voz, digitando ou lendo o QR Code. Ele escolhe. Sem papel, sem digitação, sem atrito.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-vendas', label:'Modo Vendas', node:<SceneVendas />,
    caption:'O Modo Vendas é uma loja virtual completa, com todos os seus produtos. Além de interagir com o assistente, também exibe os produtos com nome, foto, descrição e preço, organizados por categoria. O cliente monta o carrinho, escolhe entre retirar no balcão, sentar na mesa ou receber em casa com entrega, o sistema já calcula o frete automaticamente.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-fila', label:'Modo Fila', node:<SceneFila />,
    caption:'O Modo Fila organiza o atendimento presencial com senhas digitais. O cliente retira a senha pelo totem, acompanha em tempo real pela tela e o sistema anuncia cada chamada em voz alta, sem papel, sem confusão. O Modo Link: uma página rápida com WhatsApp, Instagram, site e todos os contatos — um único endereço para o cliente encontrar tudo.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-totem', label:'Modo Totem', node:<SceneTotem isSpeaking={false} />,
    caption:'No Modo Totem, a tela entra em modo quiosque com teclado virtual embutido: sem botões de saída, sem acesso ao sistema, com saída protegida por senha do proprietário. No Modo Cliente, clientes e colaboradores criam uma conta em segundos, cada um com seu nível de acesso. Você tem o controle de tudo no dashboard.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6',
    id:'assistente-outro', label:'Conclusão', node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'O grande diferencial da minhAi é a liberdade de interação. O cliente pode chamar como uma Alexa usando a palavra de ativação, clicar no botão e falar, navegar pelos botões do carrossel, digitar, ou interagir pelos modos. Cada pessoa utiliza do jeito que prefere, e a minhAi está pronta para todas elas, 24 horas por dia!' },

  // ── Stage 3 ──
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-intro', label:'Especialistas', node:<SceneAuxiliaresIntro />,
    caption:'Além de executar mais de 100 funções, a minhAi conta com 10 especialistas de IA integrados ao seu negócio, cada um focado em conduzir processos complexos do início ao fim, por voz ou texto, em qualquer canal.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-vendas', label:'Vendas', node:<SceneVendasAux />,
    caption:'O Assistente de Vendas atua como um vendedor digital completo, sugere produtos com base no que o cliente pede, monta o carrinho, oferece opções de retirada, mesa ou entrega com cálculo de frete automático, e envia o link de pagamento direto para o cliente finalizar. Funciona no WhatsApp, na tela, no totem. Em qualquer canal.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-agenda', label:'Agenda', node:<SceneAgenda />,
    caption:'O Gestor de Agenda conduz todo o processo de agendamento de ponta a ponta. Pergunta qual serviço o cliente quer, mostra os horários disponíveis em tempo real, pode cobrar na hora com Pix ou Link de pagamento, marca direto no Google Agenda e envia confirmação por e-mail. Tudo por voz ou texto, sem o cliente sair do canal.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-midia', label:'Posts', node:<SceneMidia />,
    caption:'O Criador de Posts transforma uma ideia em arte pronta para as redes sociais em segundos. Uma promoção, um lançamento, uma dica, e o auxiliar gera a imagem com a identidade visual da sua marca já aplicada. A descrição e as hashtags saem prontas para copiar, e você ainda pode publicar direto no Instagram e Facebook.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-fiscal', label:'Fiscal', node:<SceneFiscal />,
    caption:'O Auxiliar Fiscal emite nota fiscal por voz ou texto: NFe, NFSe e NFCe. Informe os dados, ele preenche dados técnicos automaticamente e envia direto para a SEFAZ. Integrado aos produtos e clientes cadastrados no dashboard.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-producao', label:'Produção & Orçamentos', node:<SceneProducaoOrcamentos />,
    caption:'O Auxiliar de Produção calcula custo e margem a partir dos insumos informados e já cria o produto no catálogo com o preço sugerido. O Auxiliar de Orçamentos monta o orçamento completo com produtos, data e desconto, gera o documento com o logotipo da empresa e o Pix.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-extras', label:'Mais Auxiliares', node:<SceneExtrasAux />,
    caption:'O Investigador Antifraude analisa boletos, comprovantes e URLs suspeitos e emite um laudo com nível de risco em segundos. O Auxiliar de Funções te ajuda a escolher as melhores funções de acordo com o seu ramo. O Auxiliar de Cadastro cria produtos completos por voz ou texto — já disponíveis no catálogo para venda na hora.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981',
    id:'auxiliares-conclusao', label:'Conclusão', node:<SceneAuxiliaresIntro />,
    caption:'10 especialistas IA, cada um conduzindo processos complexos do início ao fim. Tudo por voz ou texto, em qualquer canal, sem precisar de um sistema separado para cada área. É a sua equipe digital completa, integrada em um único assistente.' },

  // ── Stage 4 ──
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-cadastro', label:'Criar Conta', node:<SceneCadastro />,
    caption:'Criar sua conta é rápido e gratuito! Sem cartão de crédito. Basta nome, email e senha, ou entrar com Google ou Facebook com um único clique. Em segundos você já está no dashboard, pronto para criar seu assistente.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-wizard', label:'Criar com IA', node:<SceneWizard />,
    caption:'Ao clicar no card para criar seu primeiro assistente com IA, o processo é bem simples e intuitivo: perguntas simples sobre seu negócio — nome, ramo de atividade, tom de voz e o que o assistente deve fazer. Com base nas respostas, o sistema gera toda a parte técnica, seleciona as funções ideais para o seu segmento e já cria o assistente automaticamente.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-publicar', label:'Publicar', node:<ScenePublicar />,
    caption:'Assistente criado. Agora é só compartilhar. Você recebe um link próprio, um QR Code pronto para imprimir ou exibir na tela, e já pode configurar as integrações com Google, WhatsApp, Instagram e Facebook. Divulgue o link à vontade, seu assistente já está atendendo.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-config', label:'Configurações', node:<SceneConfig />,
    caption:'Nas configurações personalizadas você define a palavra de ativação, escolhe entre voz masculina ou feminina, se prefere o Avatar ou Orbe e ativar a detecção por câmera para saudar clientes automaticamente. Ajusta a sensibilidade ao ambiente e decide o que acontece quando o assistente fica ocioso.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-webapp', label:'Seu WebApp', node:<SceneWebApp />,
    caption:'Você também pode criar seu próprio aplicativo web: sem programar, sem contratar desenvolvedor. Escolha um subdomínio personalizado — seu site e assistente com endereço próprio na internet, em minutos.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-indicacao', label:'Indicação', node:<SceneIndicacao />,
    caption:'E tem mais: cada cliente que você indicar para a minhAi, você recebe 50% da mensalidade todos os meses. Quanto mais negócios você apresentar, mais você ganha! Seu assistente trabalha, você indica, e todos saem ganhando!' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b',
    id:'zeroaoar-conclusao', label:'Conclusão', node:<SceneConclusaoZero />,
    caption:'Do cadastro ao assistente funcionando: menos de cinco minutos. Sem programador, sem código, sem contrato. Comece grátis e escale conforme seu negócio crescer.' },

  // ── Stage 5 ──
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-visao', label:'O Dashboard', node:<SceneDashboardVisao />,
    caption:'Este é o seu painel de controle: onde você gerencia tudo relacionado ao seu assistente. No menu lateral você acessa todas as seções: funções, vendas, produção, integrações com Google e Meta, integrações externas, notas fiscais, arquivos e muito mais. Tudo em um único lugar, sem precisar sair do painel.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-funcoes', label:'Funções', node:<SceneDashboardFuncoes />,
    caption:'Em Funções e Habilidades você ativa ou desativa cada uma das mais de 100 funções com um simples clique. O assistente executa apenas o que está ativo. Você controla exatamente o que o cliente pode acessar, por categoria e por função.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-integracoes', label:'Integrações', node:<SceneDashboardIntegracoes />,
    caption:'Em Serviços Google você conecta o Google Agenda, Gmail, Drive, Maps e outros. Em Serviços Meta você integra WhatsApp Business, Instagram e Facebook para o assistente responder mensagens e comentários diretamente. E em Integrações, você conecta o assistente ao ChatGPT, ao Claude e outros.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-gestao', label:'Gestão', node:<SceneDashboardGestao />,
    caption:'Em Vendas e Produtos você cadastra seu catálogo completo com fotos, preços e categorias. Na Linha de Produção você tem a lista, fichas técnicas e custos. O Controle de Usuários gerencia seus clientes e colaboradores cadastrados. Em Notas Fiscais e Arquivos você acessa o histórico fiscal e os documentos enviados no assistente.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-perfil', label:'Meu Perfil', node:<SceneDashboardPerfil />,
    caption:'No menu do usuário você tem acesso ao seu perfil, ao painel de créditos com o saldo disponível e o histórico de consumo, aos seus recebimentos, ao programa de indicações, ao histórico completo de interações do assistente e à seção de ajuda com suporte direto.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4',
    id:'dashboard-conclusao', label:'Conclusão', node:<SceneDashboardConclusao />,
    caption:'O dashboard minhAi é o centro de operações do seu negócio digital, simples o suficiente para qualquer pessoa usar sem treinamento, e completo o suficiente para escalar e vender em todos os canais.' },

  // ── Stage 6 ──
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-intro', label:'Intro', node:<SceneCobrancaIntro />,
    caption:'Seu assistente aceita múltiplas formas de pagamento: Pix, Débito ou Crédito. O cliente paga, o saldo cai na sua conta, e você acompanha tudo em tempo real.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-pix', label:'PIX', node:<SceneCobrancaPix />,
    caption:'Com o Pix, o assistente gera o QR Code na hora. O cliente escaneia, paga, e a confirmação é automática, sem precisar verificar comprovantes. Seu saldo é atualizado em tempo real, e você não sai no prejuízo com fraudes.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-tef', label:'TEF', node:<SceneCobrancaTef />,
    caption:'Com o TEF, o assistente envia a cobrança direto para sua maquininha Mercado Pago Point conectada. O cliente insere ou aproxima o cartão, débito ou crédito, e o pagamento é processado na hora. Parcelamento em até 12 vezes, com o cálculo de cada parcela automático.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-nfc', label:'NFC', node:<SceneCobrancaNfc />,
    caption:'Com o NFC, seu assistente vira uma maquininha, estando em um celular ou tablet Android. O assistente abre o módulo de cobrança, o cliente aproxima o cartão, e o pagamento é processado na hora pela InfinitePay, sem equipamento extra.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-link', label:'Links de Pagamento', node:<SceneCobrancaLink />,
    caption:'A minhAi ainda oferece dois tipos de link de cobrança: O link Pix gera um QR Code personalizado, o cliente abre, escolhe o valor se quiser, e paga. O link InfinitePay gera uma cobrança avulsa, o cliente informa o telefone e paga no crédito pelo celular. Ambos com confirmação automática e link curto, prontos para compartilhar onde precisar.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-recebimentos', label:'Recebimentos', node:<SceneCobrancaRecebimentos />,
    caption:'Todos os pagamentos caem na sua página de recebimentos. O saldo disponível é atualizado automaticamente a cada Pix confirmado. NFC, TEF e Link aparecem no histórico, mas o saldo para saque considera apenas o Pix. Quando quiser sacar, é só informar o valor, e o Pix cai na sua conta em instantes.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad',
    id:'cobranca-conclusao', label:'Conclusão', node:<SceneCobrancaConclusao />,
    caption:'Pix, Débito ou Crédito, tudo pelo assistente ou enviando links para seus clientes. Sem trocar de tela, sem aplicativo separado. Seu negócio recebendo de todas as formas, em qualquer canal.' },

  // ── Stage 7 ──
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-intro', label:'Intro', node:<SceneFuncoesIntro />,
    caption:'A minhAi tem mais de 100 funções organizadas em categorias, cada uma ativável por voz, por texto ou por clique. O assistente só executa o que você deixou ativo, controlando tudo pelo dashboard, com simples cliques.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-conhecimento', label:'Conhecimento · Consultas', node:<SceneFuncoesConhecimento />,
    caption:'Em Conhecimento, o assistente responde perguntas gerais com ChatGPT, executa respostas rápidas, cria posts, gera orçamentos, mostra o clima e transcreve áudios e vídeos. Em Consultas, acessa dados de CPF e CNPJ, verifica restrições de crédito, protestos em cartório e dados de veículos por placa.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-comercial', label:'Comercial · Financeiro', node:<SceneFuncoesComercial />,
    caption:'Em Comercial, o assistente abre o catálogo de produtos, monta o carrinho por voz, registra vendas, gera cupons de desconto e cadastra produtos com sugestão de imagens. Em Financeiro, temos as funções de cobrança no Pix, Débito e Crédito, tudo integrado, sem sair do assistente.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-agenda', label:'Agendamento · Identificação', node:<SceneFuncoesAgenda />,
    caption:'Em Agendamento, o assistente marca, reagenda, cancela e confirma compromissos direto no Google Agenda — com lembretes automáticos. Em Identificação, faz login de clientes, gera senhas de fila, coleta pré-atendimento, aplica pesquisas de satisfação e gerencia cadastros configuráveis.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-contato', label:'Contato · Serviços', node:<SceneFuncoesContato />,
    caption:'Em Contato, cada canal da empresa vira um QR Code: WhatsApp, Instagram, Facebook, TikTok, LinkedIn, site, e-mail e telefone. Em Serviços, exibe cardápio digital, compartilha Wi-Fi por QR Code, envia SMS, aciona o gerente com notificação urgente e suporta impressão local, remota e em térmicas.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-arquivos', label:'Arquivos · Câmera', node:<SceneFuncoesArquivos />,
    caption:'Em Arquivos, transforma planilhas e PDFs em dashboards com gráficos e insights, remove fundo de imagens, converte formatos, duplica fotos para impressão e junta PDFs. Em Câmera, lê QR Codes e códigos de barras, extrai texto de imagens e contratos, identifica fraudes em boletos e links.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-midia', label:'Multimídia · Utilitários', node:<SceneFuncoesMidia />,
    caption:'Em Multimídia, toca músicas, vídeos e playlists solicitados ou programados, exibe slideshows de ofertas, inicia videochamadas pelo Google Meet ou entre usuários. Em Utilitários, emite notas fiscais, cria lembretes e alarmes por voz, configura lembretes de remédios, gera segunda via de boleto e salva anotações direto no dashboard.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-localizacao', label:'Localização · Informação', node:<SceneFuncoesLocalizacao />,
    caption:'Em Localização, mostra o endereço da empresa no mapa, traça rotas, consulta CEP e rastreia encomendas dos Correios. Em Informação, exibe cotação de câmbio em tempo real, notícias do momento, calculadora de juros, IMC, conversor de medidas e feriados nacionais.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899',
    id:'funcoes-conclusao', label:'Conclusão', node:<SceneFuncoesConclusao />,
    caption:'Mais de 100 funções, ativadas só quando fazem sentido pro seu negócio. Você pode escolher 1 ou todas as funções. Realmente uma IA pra chamar de sua!' },

  // ── Stage 8 ──
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-intro', label:'Intro', node:<ScenePlanosIntro />,
    caption:'A minhAi tem dois modelos de uso: você escolhe o que faz mais sentido pro seu negócio. A minhAi Smart funciona por créditos: você compra, usa quando quiser, sem mensalidade obrigatória. A minhAi Vendas é gratuito para o lojista, sem mensalidade, sem créditos. Você só paga comissão quando vender.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-smart-mensal', label:'Smart — Planos', node:<ScenePlanosSmartMensal />,
    caption:'No Smart, os planos mensais desbloqueiam recursos avançados: O plano Top, com Serviços Google, Serviços Meta, Linha de Produção, QR Codes com seu logo e funções de impressão. O plano Consulting, com tudo isso e mais: Webapp com subdomínio próprio e consultoria.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-smart-creditos', label:'Smart — Créditos', node:<ScenePlanosSmartCreditos />,
    caption:'Além dos planos mensais, você pode comprar créditos avulsos a qualquer momento. Starter: 200 créditos. Professional (mais popular): 1.000 créditos. Business: 3.600 créditos. Enterprise: 10.000 créditos. Todos pagos via PIX. E para começar, você já recebe 20 créditos grátis.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-full', label:'Plano Full', node:<ScenePlanosFullPlan />,
    caption:'Para quem quer uma solução completa e personalizada, existe o Plano Full. Créditos ilimitados, domínio próprio, site personalizado, implementação e configuração completa pela equipe minhAi, e suporte 24 horas. É a solução ideal para agências, franquias e grandes operações.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-vendas', label:'minhAi Vendas', node:<ScenePlanosVendas />,
    caption:'A minhAi Vendas é gratuito para o lojista. Sem mensalidade, sem créditos, sem surpresa. Você só paga 10% por venda confirmada, descontado automaticamente no saque. Vem com funções específicas com foco total em vendas.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#b0cb1f',
    id:'planos-conclusao', label:'Conclusão', node:<ScenePlanosConclusao />,
    caption:'Comece grátis, escale no seu ritmo. Smart para quem quer controle total. Vendas para quem quer vender sem custo fixo. Full para quem quer tudo pronto e com a sua marca. O plano certo pro negócio certo, sem amarras. Teste agora mesmo!' },
]

// ─────────────────────────────────────────────────────────────
// COMPONENTE DE SLIDE — 1 por página
// Card à esquerda (56%) · Texto à direita (40%)
// zoom = 0.66 → cena 800px → 528px exibidos (~14cm) · altura 450*0.66=297px (~7.9cm)
// ─────────────────────────────────────────────────────────────
const ZOOM = 0.66
const CARD_H = Math.round(450 * ZOOM) // 297px

function Slide({ slide, index }: { slide: SlideData; index: number }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="slide-page"
      style={{
        width: '100%',
        minHeight: '148mm', // metade de A4 landscape (210mm / 2 = ~140mm + margens)
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '6mm 8mm',
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* Cabeçalho minimalista */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4mm',
        paddingBottom: '2.5mm',
        borderBottom: `2px solid ${slide.stageColor}25`,
      }}>
        <span style={{
          background: slide.stageColor,
          color: 'white',
          borderRadius: '5px',
          padding: '2px 8px',
          fontSize: '7pt',
          fontWeight: 800,
          fontFamily: 'system-ui, sans-serif',
        }}>
          {slide.stageNumber} · {slide.stageTitle}
        </span>
        <span style={{
          fontSize: '7.5pt',
          fontWeight: 700,
          color: '#1e293b',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {slide.label}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '6.5pt',
          color: '#94a3b8',
          fontFamily: 'system-ui, sans-serif',
        }}>
          minhAi · minhai.app
        </span>
      </div>

      {/* Conteúdo: card + texto */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8mm',
        flex: 1,
      }}>
        {/* Card da cena — 56% */}
        <div style={{
          flex: '0 0 56%',
          height: `${CARD_H}px`,
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1.5px solid ${ready ? '#e2e8f0' : '#f1f5f9'}`,
          background: '#f8fafc',
          position: 'relative',
          boxShadow: ready ? '0 4px 24px rgba(0,0,0,0.08)' : 'none',
          transition: 'box-shadow 0.5s ease',
        }}>
          {/* Overlay de loading — removido no print via CSS */}
          {!ready && (
            <div className="loading-overlay" style={{
              position: 'absolute', inset: 0,
              background: 'rgba(248,250,252,0.96)',
              zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '8px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid #e2e8f0',
                borderTopColor: slide.stageColor,
                animation: 'tourSpin 0.9s linear infinite',
              }} />
              <span style={{ fontSize: '7pt', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
                carregando cena...
              </span>
            </div>
          )}

          {/* Cena com CSS zoom */}
          <div style={{
            width: '800px',
            height: '450px',
            // @ts-ignore
            zoom: ZOOM,
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {slide.node}
          </div>
        </div>

        {/* Texto — 40% */}
        <div style={{
          flex: '0 0 40%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4mm',
        }}>
          {/* Logo minhAi em destaque */}
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 900,
            fontSize: '18pt',
            color: slide.stageColor,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            minhAi
          </div>

          {/* Texto da narração */}
          <p style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: '9.5pt',
            color: '#334155',
            lineHeight: 1.65,
            margin: 0,
            padding: 0,
          }}>
            {slide.caption}
          </p>

          {/* Numeração */}
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: '6.5pt',
            color: '#cbd5e1',
            marginTop: '2mm',
          }}>
            {index + 1} / {ALL_SLIDES.length}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function TourExportPage() {
  const [allReady, setAllReady] = useState(false)
  const [countdown, setCountdown] = useState(6)

  // Countdown e flag de pronto
  useEffect(() => {
    const interval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    const done = setTimeout(() => { setAllReady(true); clearInterval(interval) }, 5500)
    return () => { clearInterval(interval); clearTimeout(done) }
  }, [])

  // Para TODAS as animações antes do print e restaura depois
  // Isso resolve o bug do Chrome que captura frames intermediários
  useEffect(() => {
    const freeze = () => document.documentElement.classList.add('printing')
    const unfreeze = () => document.documentElement.classList.remove('printing')
    window.addEventListener('beforeprint', freeze)
    window.addEventListener('afterprint', unfreeze)
    return () => {
      window.removeEventListener('beforeprint', freeze)
      window.removeEventListener('afterprint', unfreeze)
    }
  }, [])

  const handlePrint = () => {
    // Para animações manualmente antes de chamar print()
    document.documentElement.classList.add('printing')
    // Pequeno delay para garantir que o CSS foi aplicado antes do print dialog
    setTimeout(() => {
      window.print()
      // afterprint restaura, mas como fallback:
      setTimeout(() => document.documentElement.classList.remove('printing'), 2000)
    }, 150)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        body {
          margin: 0; padding: 0;
          background: #f1f5f9;
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* Spinner de loading */
        @keyframes tourSpin {
          to { transform: rotate(360deg); }
        }

        /*
         * CONGELAR ANIMAÇÕES antes do print.
         * A classe .printing é adicionada via JS no beforeprint/handlePrint.
         * Isso para qualquer @keyframes ativo, evitando o bug do Chrome
         * que captura frames intermediários e gera páginas em branco.
         */
        html.printing *,
        html.printing *::before,
        html.printing *::after {
          animation-play-state: paused !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }

        @page {
          size: A4 landscape;
          margin: 10mm 12mm;
        }

        @media print {
          /* Esconde UI de controle */
          .no-print { display: none !important; }

          /* Remove padding de tela */
          body { background: white !important; padding-top: 0 !important; }
          .screen-pad { padding-top: 0 !important; }

          /* Cada slide em sua própria página */
          .slide-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: auto !important;
          }
          .slide-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Remove overlays de loading */
          .loading-overlay { display: none !important; }

          /* Força cores de fundo */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Garante que zoom seja mantido — funciona no Chrome/Edge/Safari */
        }

        @media screen {
          .page-wrap {
            max-width: 1100px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
          }
          .slide-page {
            border-bottom: 1px solid #f1f5f9;
          }
          .slide-page:last-child {
            border-bottom: none;
          }
        }
      `}</style>

      {/* Barra de status — só na tela */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        height: '52px',
        background: allReady ? '#10b981' : '#3b82f6',
        color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', fontSize: '13px', fontWeight: 600,
        transition: 'background 0.6s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{allReady ? '✅' : '⏳'}</span>
          {allReady
            ? <span>
                {ALL_SLIDES.length} slides prontos —{' '}
                clique em <strong>Imprimir PDF</strong> →{' '}
                <strong>A4 Paisagem</strong> → ativar{' '}
                <strong>Gráficos de fundo</strong>
              </span>
            : <span>Aguardando animações renderizarem... {countdown > 0 ? `(${countdown}s)` : 'quase pronto...'}</span>
          }
        </div>
        <button
          onClick={handlePrint}
          disabled={!allReady}
          style={{
            background: allReady ? 'white' : 'rgba(255,255,255,0.3)',
            color: allReady ? '#10b981' : 'rgba(255,255,255,0.6)',
            border: 'none', borderRadius: '8px',
            padding: '9px 24px',
            fontWeight: 800, fontSize: '13px',
            cursor: allReady ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s',
            whiteSpace: 'nowrap',
          }}
        >
          {allReady ? '🖨️  Imprimir PDF' : `Aguarde ${countdown}s...`}
        </button>
      </div>

      {/* Conteúdo */}
      <div className="screen-pad" style={{ paddingTop: '64px' }}>
        <div className="page-wrap">
          {ALL_SLIDES.map((slide, i) => (
            <Slide key={slide.id} slide={slide} index={i} />
          ))}
        </div>

        <div className="no-print" style={{
          textAlign: 'center', padding: '24px',
          color: '#94a3b8', fontSize: '12px',
        }}>
          {ALL_SLIDES.length} slides · 8 stages · Tour Interativo minhAi
        </div>
      </div>
    </>
  )
}
