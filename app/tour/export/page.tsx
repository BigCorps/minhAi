'use client'
// app/tour/export/page.tsx
// Exportação via html2canvas + jsPDF — sem print dialog
// Captura cada cena como imagem depois das animações terminarem

import { useState, useEffect, useRef } from 'react'

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
// SLIDES
// ─────────────────────────────────────────────────────────────
const ALL_SLIDES: SlideData[] = [
  // ── Stage 1 ──
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'intro', label:'Introdução',
    node:<SceneIntro isSpeaking={false} theme="light" />,
    caption:'Sou a minhAi, mas também posso ser Sua IA ou Nossa IA, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: Aparelhos com telas (computadores, tablets e celulares), Totens, Whatsapp, Instagram, Facebook, aplicativos de IA e até no Mercado Livre.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'assistente', label:'Tela & Totem',
    node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'Funciono como uma Alexa, você define qual palavra de ativação me chama, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'whatsapp', label:'WhatsApp',
    node:<SceneWhatsApp />,
    caption:'No seu próprio WhatsApp, com a naturalidade que seus clientes já conhecem. Respondo mensagens, envio e confirmo cobranças Pix, Débito e Crédito, marco eventos na sua Agenda Google, calculo frete de entrega, gero orçamentos e muito mais.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'instagram', label:'Instagram',
    node:<SceneInstagram />,
    caption:'No Instagram e Facebook, respondendo mensagens diretas, comentários e enviando DMs automaticamente, com as mesmas funcionalidades do WhatsApp, convertendo seguidores em clientes.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'widget', label:'Widget Web',
    node:<SceneWidget />,
    caption:'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'mcp', label:'Servidor MCP',
    node:<SceneMCP />,
    caption:'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minhAi diretamente pelo seu app de IA favorito.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'mercadolivre', label:'Mercado Livre',
    node:<SceneMercadoLivre />,
    caption:'No Mercado Livre, respondendo perguntas de compradores e também postando produtos diretamente vinculados aos seus produtos no dashboard.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'whatsapp-mcp', label:'WhatsApp MCP',
    node:<SceneWhatsAppMCP />,
    caption:'E também pode pedir tarefas diretamente para o WhatsApp minhAi — consultas, ações e integrações sem sair do aplicativo.' },
  { stageNumber:1, stageTitle:'Apresentação', stageColor:'#3b82f6', id:'outro', label:'Conclusão',
    node:<SceneIntro isOutro isSpeaking={false} theme="light" />,
    caption:'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de IA próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!' },

  // ── Stage 2 ──
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-intro', label:'A Página',
    node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'Esta é a página do seu assistente: roda em qualquer tela, celular, tablet, totem ou computador. O cliente escolhe como interagir, o tema claro ou escuro e a apresentação: Normal com microfone ou texto; Chatbot; ou o Imersivo, com o avatar centralizado. Cada cliente tem o seu jeito, e a minhAi se adapta a ele.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-carrossel', label:'Categorias',
    node:<SceneCarrossel />,
    caption:'O carrossel de categorias organiza mais de 100 funções em grupos como Comercial, Financeiro, Agendamento, Serviços e muito mais. O cliente toca numa categoria, vê as funções disponíveis e escolhe o que precisa, ou simplesmente usa a palavra de ativação e fala diretamente o que quer.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-qrcode', label:'QR Code',
    node:<SceneQRCode />,
    caption:'Com um único toque ou comando, o assistente gera um card na tela para o WhatsApp da empresa, para uma cobrança PIX, ou qualquer outra das mais de 100 funções. O cliente interage por voz, digitando ou lendo o QR Code. Sem papel, sem digitação, sem atrito.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-vendas', label:'Modo Vendas',
    node:<SceneVendas />,
    caption:'O Modo Vendas é uma loja virtual completa. Exibe os produtos com nome, foto, descrição e preço, organizados por categoria. O cliente monta o carrinho, escolhe entre retirar no balcão, sentar na mesa ou receber em casa — o sistema já calcula o frete automaticamente.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-fila', label:'Modo Fila',
    node:<SceneFila />,
    caption:'O Modo Fila organiza o atendimento presencial com senhas digitais. O cliente retira a senha pelo totem, acompanha em tempo real e o sistema anuncia cada chamada em voz alta. O Modo Link: uma página rápida com todos os contatos da empresa em um único endereço.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-totem', label:'Modo Totem',
    node:<SceneTotem isSpeaking={false} />,
    caption:'No Modo Totem, a tela entra em modo quiosque com teclado virtual embutido: sem botões de saída, com saída protegida por senha do proprietário. No Modo Cliente, clientes e colaboradores criam uma conta em segundos, cada um com seu nível de acesso. Você tem o controle de tudo no dashboard.' },
  { stageNumber:2, stageTitle:'Página do Assistente', stageColor:'#8b5cf6', id:'assistente-outro', label:'Conclusão',
    node:<SceneAssistente isSpeaking={false} theme="light" />,
    caption:'O grande diferencial da minhAi é a liberdade de interação. O cliente pode chamar como uma Alexa, clicar no botão e falar, navegar pelo carrossel, digitar, ou interagir pelos modos. Cada pessoa utiliza do jeito que prefere, e a minhAi está pronta para todas elas, 24 horas por dia!' },

  // ── Stage 3 ──
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-intro', label:'Especialistas',
    node:<SceneAuxiliaresIntro />,
    caption:'Além de executar mais de 100 funções, a minhAi conta com 10 especialistas de IA integrados ao seu negócio, cada um focado em conduzir processos complexos do início ao fim, por voz ou texto, em qualquer canal.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-vendas', label:'Vendas',
    node:<SceneVendasAux />,
    caption:'O Assistente de Vendas atua como um vendedor digital completo, sugere produtos com base no que o cliente pede, monta o carrinho, oferece opções de retirada, mesa ou entrega com cálculo de frete automático, e envia o link de pagamento direto para o cliente finalizar. Em qualquer canal.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-agenda', label:'Agenda',
    node:<SceneAgenda />,
    caption:'O Gestor de Agenda conduz todo o processo de agendamento de ponta a ponta. Pergunta qual serviço o cliente quer, mostra os horários disponíveis em tempo real, pode cobrar na hora com Pix ou Link, marca direto no Google Agenda e envia confirmação por e-mail.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-midia', label:'Posts',
    node:<SceneMidia />,
    caption:'O Criador de Posts transforma uma ideia em arte pronta para as redes sociais em segundos. O auxiliar gera a imagem com a identidade visual da sua marca já aplicada. A descrição e as hashtags saem prontas para copiar, e você ainda pode publicar direto no Instagram e Facebook.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-fiscal', label:'Fiscal',
    node:<SceneFiscal />,
    caption:'O Auxiliar Fiscal emite nota fiscal por voz ou texto: NFe, NFSe e NFCe. Informe os dados, ele preenche os campos técnicos automaticamente e envia direto para a SEFAZ. Integrado aos produtos e clientes cadastrados no dashboard.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-producao', label:'Produção & Orçamentos',
    node:<SceneProducaoOrcamentos />,
    caption:'O Auxiliar de Produção calcula custo e margem a partir dos insumos e já cria o produto no catálogo com o preço sugerido. O Auxiliar de Orçamentos monta o orçamento completo com produtos, data e desconto, gera o documento com o logotipo da empresa e o Pix.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-extras', label:'Mais Auxiliares',
    node:<SceneExtrasAux />,
    caption:'O Investigador Antifraude analisa boletos, comprovantes e URLs suspeitos e emite um laudo com nível de risco. O Auxiliar de Funções te ajuda a escolher as melhores funções para o seu ramo. O Auxiliar de Cadastro cria produtos completos por voz ou texto — disponíveis no catálogo na hora.' },
  { stageNumber:3, stageTitle:'Auxiliares de IA', stageColor:'#10b981', id:'auxiliares-conclusao', label:'Conclusão',
    node:<SceneAuxiliaresIntro />,
    caption:'10 especialistas IA, cada um conduzindo processos complexos do início ao fim. Tudo por voz ou texto, em qualquer canal, sem precisar de um sistema separado para cada área. É a sua equipe digital completa, integrada em um único assistente.' },

  // ── Stage 4 ──
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-cadastro', label:'Criar Conta',
    node:<SceneCadastro />,
    caption:'Criar sua conta é rápido e gratuito! Sem cartão de crédito. Basta nome, email e senha, ou entrar com Google ou Facebook com um único clique. Em segundos você já está no dashboard, pronto para criar seu assistente.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-wizard', label:'Criar com IA',
    node:<SceneWizard />,
    caption:'O processo é simples e intuitivo: perguntas sobre seu negócio — nome, ramo de atividade, tom de voz e o que o assistente deve fazer. Com base nas respostas, o sistema gera toda a parte técnica, seleciona as funções ideais para o seu segmento e já cria o assistente automaticamente.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-publicar', label:'Publicar',
    node:<ScenePublicar />,
    caption:'Assistente criado. Agora é só compartilhar. Você recebe um link próprio, um QR Code pronto para imprimir ou exibir na tela, e já pode configurar as integrações com Google, WhatsApp, Instagram e Facebook.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-config', label:'Configurações',
    node:<SceneConfig />,
    caption:'Nas configurações personalizadas você define a palavra de ativação, escolhe entre voz masculina ou feminina, se prefere o Avatar ou Orbe e ativar a detecção por câmera para saudar clientes automaticamente. Ajusta a sensibilidade ao ambiente e decide o que acontece quando o assistente fica ocioso.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-webapp', label:'Seu WebApp',
    node:<SceneWebApp />,
    caption:'Você também pode criar seu próprio aplicativo web: sem programar, sem contratar desenvolvedor. Escolha um subdomínio personalizado — seu site e assistente com endereço próprio na internet, em minutos.' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-indicacao', label:'Indicação',
    node:<SceneIndicacao />,
    caption:'E tem mais: cada cliente que você indicar para a minhAi, você recebe 50% da mensalidade todos os meses. Quanto mais negócios você apresentar, mais você ganha! Seu assistente trabalha, você indica, e todos saem ganhando!' },
  { stageNumber:4, stageTitle:'Do Zero ao Ar', stageColor:'#f59e0b', id:'zeroaoar-conclusao', label:'Conclusão',
    node:<SceneConclusaoZero />,
    caption:'Do cadastro ao assistente funcionando: menos de cinco minutos. Sem programador, sem código, sem contrato. Comece grátis e escale conforme seu negócio crescer.' },

  // ── Stage 5 ──
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-visao', label:'O Dashboard',
    node:<SceneDashboardVisao />,
    caption:'Este é o seu painel de controle: onde você gerencia tudo relacionado ao seu assistente. No menu lateral você acessa todas as seções: funções, vendas, produção, integrações com Google e Meta, notas fiscais, arquivos e muito mais. Tudo em um único lugar.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-funcoes', label:'Funções',
    node:<SceneDashboardFuncoes />,
    caption:'Em Funções e Habilidades você ativa ou desativa cada uma das mais de 100 funções com um simples clique. O assistente executa apenas o que está ativo. Você controla exatamente o que o cliente pode acessar, por categoria e por função.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-integracoes', label:'Integrações',
    node:<SceneDashboardIntegracoes />,
    caption:'Em Serviços Google você conecta o Google Agenda, Gmail, Drive, Maps e outros. Em Serviços Meta você integra WhatsApp Business, Instagram e Facebook para o assistente responder mensagens e comentários diretamente. E em Integrações, você conecta ao ChatGPT, ao Claude e outros.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-gestao', label:'Gestão',
    node:<SceneDashboardGestao />,
    caption:'Em Vendas e Produtos você cadastra seu catálogo completo com fotos, preços e categorias. Na Linha de Produção você tem fichas técnicas e custos. O Controle de Usuários gerencia clientes e colaboradores. Em Notas Fiscais e Arquivos você acessa o histórico fiscal e os documentos.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-perfil', label:'Meu Perfil',
    node:<SceneDashboardPerfil />,
    caption:'No menu do usuário você tem acesso ao seu perfil, ao painel de créditos com saldo disponível e histórico de consumo, aos seus recebimentos, ao programa de indicações, ao histórico completo de interações do assistente e à seção de ajuda com suporte direto.' },
  { stageNumber:5, stageTitle:'Meu Dashboard', stageColor:'#06b6d4', id:'dashboard-conclusao', label:'Conclusão',
    node:<SceneDashboardConclusao />,
    caption:'O dashboard minhAi é o centro de operações do seu negócio digital, simples o suficiente para qualquer pessoa usar sem treinamento, e completo o suficiente para escalar e vender em todos os canais.' },

  // ── Stage 6 ──
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-intro', label:'Intro',
    node:<SceneCobrancaIntro />,
    caption:'Seu assistente aceita múltiplas formas de pagamento: Pix, Débito ou Crédito. O cliente paga, o saldo cai na sua conta, e você acompanha tudo em tempo real.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-pix', label:'PIX',
    node:<SceneCobrancaPix />,
    caption:'Com o Pix, o assistente gera o QR Code na hora. O cliente escaneia, paga, e a confirmação é automática, sem precisar verificar comprovantes. Seu saldo é atualizado em tempo real, e você não sai no prejuízo com fraudes.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-tef', label:'TEF',
    node:<SceneCobrancaTef />,
    caption:'Com o TEF, o assistente envia a cobrança direto para sua maquininha Mercado Pago Point conectada. O cliente insere ou aproxima o cartão, débito ou crédito, e o pagamento é processado na hora. Parcelamento em até 12 vezes, com o cálculo de cada parcela automático.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-nfc', label:'NFC',
    node:<SceneCobrancaNfc />,
    caption:'Com o NFC, seu assistente vira uma maquininha, estando em um celular ou tablet Android. O assistente abre o módulo de cobrança, o cliente aproxima o cartão, e o pagamento é processado na hora pela InfinitePay, sem equipamento extra.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-link', label:'Links de Pagamento',
    node:<SceneCobrancaLink />,
    caption:'A minhAi ainda oferece dois tipos de link: O link Pix gera um QR Code personalizado, o cliente abre, escolhe o valor se quiser, e paga. O link InfinitePay gera uma cobrança avulsa, o cliente paga no crédito pelo celular. Ambos com confirmação automática, prontos para compartilhar onde precisar.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-recebimentos', label:'Recebimentos',
    node:<SceneCobrancaRecebimentos />,
    caption:'Todos os pagamentos caem na sua página de recebimentos. O saldo disponível é atualizado automaticamente a cada Pix confirmado. NFC, TEF e Link aparecem no histórico. Quando quiser sacar, é só informar o valor, e o Pix cai na sua conta em instantes.' },
  { stageNumber:6, stageTitle:'Modos de Cobrança', stageColor:'#32bcad', id:'cobranca-conclusao', label:'Conclusão',
    node:<SceneCobrancaConclusao />,
    caption:'Pix, Débito ou Crédito, tudo pelo assistente ou enviando links para seus clientes. Sem trocar de tela, sem aplicativo separado. Seu negócio recebendo de todas as formas, em qualquer canal.' },

  // ── Stage 7 ──
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-intro', label:'Intro',
    node:<SceneFuncoesIntro />,
    caption:'A minhAi tem mais de 100 funções organizadas em categorias, cada uma ativável por voz, por texto ou por clique. O assistente só executa o que você deixou ativo, controlando tudo pelo dashboard, com simples cliques.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-conhecimento', label:'Conhecimento · Consultas',
    node:<SceneFuncoesConhecimento />,
    caption:'Em Conhecimento, o assistente responde perguntas gerais com ChatGPT, executa respostas rápidas, cria posts, gera orçamentos, mostra o clima e transcreve áudios. Em Consultas, acessa dados de CPF e CNPJ, verifica restrições de crédito, protestos em cartório e dados de veículos por placa.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-comercial', label:'Comercial · Financeiro',
    node:<SceneFuncoesComercial />,
    caption:'Em Comercial, o assistente abre o catálogo de produtos, monta o carrinho por voz, registra vendas, gera cupons de desconto e cadastra produtos com sugestão de imagens. Em Financeiro, temos as funções de cobrança no Pix, Débito e Crédito, tudo integrado, sem sair do assistente.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-agenda', label:'Agendamento · Identificação',
    node:<SceneFuncoesAgenda />,
    caption:'Em Agendamento, o assistente marca, reagenda, cancela e confirma compromissos direto no Google Agenda — com lembretes automáticos. Em Identificação, faz login de clientes, gera senhas de fila, coleta pré-atendimento e aplica pesquisas de satisfação.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-contato', label:'Contato · Serviços',
    node:<SceneFuncoesContato />,
    caption:'Em Contato, cada canal da empresa vira um QR Code: WhatsApp, Instagram, Facebook, TikTok, LinkedIn, site, e-mail e telefone. Em Serviços, exibe cardápio digital, compartilha Wi-Fi por QR Code, envia SMS, aciona o gerente com notificação urgente e suporta impressão em térmicas.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-arquivos', label:'Arquivos · Câmera',
    node:<SceneFuncoesArquivos />,
    caption:'Em Arquivos, transforma planilhas e PDFs em dashboards com gráficos e insights, remove fundo de imagens, converte formatos, duplica fotos para impressão e junta PDFs. Em Câmera, lê QR Codes, extrai texto de imagens e contratos, identifica fraudes em boletos e links.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-midia', label:'Multimídia · Utilitários',
    node:<SceneFuncoesMidia />,
    caption:'Em Multimídia, toca músicas, vídeos e playlists, exibe slideshows de ofertas, inicia videochamadas pelo Google Meet ou entre usuários. Em Utilitários, emite notas fiscais, cria lembretes e alarmes por voz, configura lembretes de remédios, gera segunda via de boleto e salva anotações no dashboard.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-localizacao', label:'Localização · Informação',
    node:<SceneFuncoesLocalizacao />,
    caption:'Em Localização, mostra o endereço da empresa no mapa, traça rotas, consulta CEP e rastreia encomendas dos Correios. Em Informação, exibe cotação de câmbio em tempo real, notícias do momento, calculadora de juros, IMC, conversor de medidas e feriados nacionais.' },
  { stageNumber:7, stageTitle:'Funções e Habilidades', stageColor:'#ec4899', id:'funcoes-conclusao', label:'Conclusão',
    node:<SceneFuncoesConclusao />,
    caption:'Mais de 100 funções, ativadas só quando fazem sentido pro seu negócio. Você pode escolher 1 ou todas as funções. Realmente uma IA pra chamar de sua!' },

  // ── Stage 8 ──
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-intro', label:'Intro',
    node:<ScenePlanosIntro />,
    caption:'A minhAi tem dois modelos de uso: A minhAi Smart funciona por créditos — você compra, usa quando quiser, sem mensalidade obrigatória. A minhAi Vendas é gratuito para o lojista, sem mensalidade, sem créditos. Você só paga comissão quando vender.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-smart-mensal', label:'Smart — Planos',
    node:<ScenePlanosSmartMensal />,
    caption:'No Smart, os planos mensais desbloqueiam recursos avançados: O plano Top, com Serviços Google, Serviços Meta, Linha de Produção, QR Codes com seu logo e funções de impressão. O plano Consulting, com tudo isso e mais: Webapp com subdomínio próprio e consultoria.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-smart-creditos', label:'Smart — Créditos',
    node:<ScenePlanosSmartCreditos />,
    caption:'Além dos planos mensais, você pode comprar créditos avulsos a qualquer momento. Starter: 200 créditos. Professional (mais popular): 1.000 créditos. Business: 3.600 créditos. Enterprise: 10.000 créditos. Todos pagos via PIX. E para começar, você já recebe 20 créditos grátis.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-full', label:'Plano Full',
    node:<ScenePlanosFullPlan />,
    caption:'Para quem quer uma solução completa e personalizada, existe o Plano Full. Créditos ilimitados, domínio próprio, site personalizado, implementação e configuração completa pela equipe minhAi, e suporte 24 horas. Ideal para agências, franquias e grandes operações.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-vendas', label:'minhAi Vendas',
    node:<ScenePlanosVendas />,
    caption:'A minhAi Vendas é gratuito para o lojista. Sem mensalidade, sem créditos, sem surpresa. Você só paga 10% por venda confirmada, descontado automaticamente no saque. Vem com funções específicas com foco total em vendas.' },
  { stageNumber:8, stageTitle:'Planos e Valores', stageColor:'#84cc16', id:'planos-conclusao', label:'Conclusão',
    node:<ScenePlanosConclusao />,
    caption:'Comece grátis, escale no seu ritmo. Smart para quem quer controle total. Vendas para quem quer vender sem custo fixo. Full para quem quer tudo pronto e com a sua marca. O plano certo pro negócio certo, sem amarras. Teste agora mesmo!' },
]

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE LAYOUT
// Cenas nativas: 800×450px
// Renderizamos em tamanho nativo, mas num div oculto fora da tela
// html2canvas captura em resolução nativa → jsPDF insere como imagem
// ─────────────────────────────────────────────────────────────
// A4 landscape em pontos jsPDF (72dpi): 841.89 × 595.28pt
// Usamos mm: 297 × 210mm
const PDF_W_MM = 297
const PDF_H_MM = 210
const MARGIN_MM = 10

// Área útil
const CONTENT_W_MM = PDF_W_MM - MARGIN_MM * 2  // 277mm
const CONTENT_H_MM = PDF_H_MM - MARGIN_MM * 2  // 190mm

// Card: 60% da largura útil
const CARD_W_MM = CONTENT_W_MM * 0.58           // ~160mm
const CARD_H_MM = CARD_W_MM * (450 / 800)       // proporção 16:9 → ~90mm

// Texto: resto (~40%)
const TEXT_X_MM = MARGIN_MM + CARD_W_MM + 8     // 8mm de gap
const TEXT_W_MM = CONTENT_W_MM - CARD_W_MM - 8

// ─────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function TourExportPage() {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'capturing' | 'done'>('waiting')
  const [countdown, setCountdown] = useState(7)
  const [progress, setProgress] = useState(0)
  const sceneRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  // Countdown 7s para animações terminarem
  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    const t = setTimeout(() => { setStatus('ready'); clearInterval(iv) }, 7000)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [])

  const handleExport = async () => {
    setStatus('capturing')
    setProgress(0)

    // Import dinâmico — evita SSR e reduz bundle
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const total = ALL_SLIDES.length

    for (let i = 0; i < total; i++) {
      const slide = ALL_SLIDES[i]
      const el = sceneRefsMap.current.get(slide.id)
      if (!el) continue

      // Captura a cena como canvas
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        scale: 1.5,           // resolução 1.5× para qualidade
        logging: false,
        imageTimeout: 0,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      if (i > 0) pdf.addPage()

      // ── Fundo branco ──
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, PDF_W_MM, PDF_H_MM, 'F')

      // ── Cabeçalho ──
      const headerY = MARGIN_MM
      // Badge colorido
      pdf.setFillColor(slide.stageColor)
      pdf.roundedRect(MARGIN_MM, headerY, 60, 6, 1.5, 1.5, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${slide.stageNumber} · ${slide.stageTitle}`, MARGIN_MM + 2, headerY + 4.2)

      // Label da cena
      pdf.setTextColor(30, 41, 59)
      pdf.setFontSize(8)
      pdf.text(slide.label, MARGIN_MM + 64, headerY + 4.2)

      // Numeração direita
      pdf.setTextColor(148, 163, 184)
      pdf.setFontSize(6.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${i + 1}/${total} · minhAi · minhai.app`, PDF_W_MM - MARGIN_MM, headerY + 4.2, { align: 'right' })

      // Linha separadora
      const lineY = headerY + 7.5
      pdf.setDrawColor(slide.stageColor)
      pdf.setLineWidth(0.4)
      pdf.line(MARGIN_MM, lineY, PDF_W_MM - MARGIN_MM, lineY)

      // ── Card da cena (imagem) ──
      const cardY = lineY + 4
      pdf.addImage(imgData, 'JPEG', MARGIN_MM, cardY, CARD_W_MM, CARD_H_MM)

      // Borda sutil no card
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(MARGIN_MM, cardY, CARD_W_MM, CARD_H_MM, 2, 2, 'S')

      // ── Texto à direita ──
      const textY = cardY

      // "minhAi" em destaque
      const [r, g, b] = hexToRgb(slide.stageColor)
      pdf.setTextColor(r, g, b)
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('minhAi', TEXT_X_MM, textY + 10)

      // Texto da narração
      pdf.setTextColor(51, 65, 85)
      pdf.setFontSize(9.5)
      pdf.setFont('helvetica', 'normal')
      const lines = pdf.splitTextToSize(slide.caption, TEXT_W_MM)
      pdf.text(lines, TEXT_X_MM, textY + 18, { lineHeightFactor: 1.6 })

      setProgress(Math.round(((i + 1) / total) * 100))
    }

    pdf.save('minhai-tour-interativo.pdf')
    setStatus('done')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #0f172a; font-family: system-ui, sans-serif; color: white; }
        /* Esconde as cenas capturáveis da UI — ficam fora da tela */
        .capture-zone { position: fixed; top: -9999px; left: -9999px; pointer-events: none; }
      `}</style>

      {/* ── Zona de captura — cenas renderizadas fora da tela ── */}
      <div className="capture-zone">
        {ALL_SLIDES.map(slide => (
          <div
            key={slide.id}
            ref={el => { if (el) sceneRefsMap.current.set(slide.id, el) }}
            style={{ width: '800px', height: '450px', overflow: 'hidden', background: '#f8fafc' }}
          >
            {slide.node}
          </div>
        ))}
      </div>

      {/* ── UI principal ── */}
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: '32px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36pt', fontWeight: 900, color: '#3b82f6', letterSpacing: '-0.04em', lineHeight: 1 }}>
            minhAi
          </div>
          <div style={{ fontSize: '11pt', color: '#64748b', marginTop: '6px' }}>
            Tour Interativo — Exportar PDF
          </div>
        </div>

        {/* Card de status */}
        <div style={{
          background: '#1e293b',
          borderRadius: '16px',
          padding: '32px 40px',
          width: '100%',
          maxWidth: '480px',
          textAlign: 'center',
          border: '1px solid #334155',
        }}>
          {status === 'waiting' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Aguardando animações
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '24px' }}>
                As {ALL_SLIDES.length} cenas estão renderizando em segundo plano.
                <br />Aguarde {countdown}s para garantir que tudo está pronto.
              </div>
              {/* Barra de progresso do countdown */}
              <div style={{ background: '#0f172a', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '99px',
                  width: `${((7 - countdown) / 7) * 100}%`,
                  transition: 'width 1s linear',
                }} />
              </div>
            </>
          )}

          {status === 'ready' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Pronto para exportar!
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '28px' }}>
                {ALL_SLIDES.length} slides · 8 stages · A4 Paisagem
                <br />O PDF será gerado e baixado automaticamente.
              </div>
              <button
                onClick={handleExport}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 36px',
                  fontSize: '13pt',
                  fontWeight: 800,
                  cursor: 'pointer',
                  width: '100%',
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                🖨️ Exportar PDF
              </button>
            </>
          )}

          {status === 'capturing' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                Capturando cenas...
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '24px' }}>
                {progress}% concluído — não feche esta janela
              </div>
              <div style={{ background: '#0f172a', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  borderRadius: '99px',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </>
          )}

          {status === 'done' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <div style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '8px' }}>
                PDF gerado com sucesso!
              </div>
              <div style={{ fontSize: '10pt', color: '#94a3b8', marginBottom: '28px' }}>
                O arquivo <strong style={{ color: '#e2e8f0' }}>minhai-tour-interativo.pdf</strong> foi baixado.
              </div>
              <button
                onClick={() => { setStatus('ready'); setProgress(0) }}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '10pt',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Exportar novamente
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ fontSize: '9pt', color: '#334155', textAlign: 'center', maxWidth: '400px' }}>
          As cenas são capturadas com html2canvas e montadas em PDF via jsPDF.
          <br />Funciona em qualquer browser, desktop ou mobile.
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// UTILITÁRIO
// ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}
