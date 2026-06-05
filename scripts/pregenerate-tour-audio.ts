// scripts/pregenerate-tour-audio.ts
/**
 * Pré-gera todos os áudios do tour Stage 1 chamando a API local.
 * Rode UMA vez antes de ir para produção:
 *
 *   npm run tts:pregenerate
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// Cópia dos audioText do stage1-script.ts
// (evita problema de import com ts-node + ESM)
const SCENES = [
  { id: 'intro',         audioText: 'Sou a minha I A, mas também posso ser Sua I A ou Nossa I A, você escolhe como me chamar! Estou em qualquer lugar onde o seu cliente esteja: aparelhos com telas. Computadores, tablets e celulares. totens, Whatsapp, Instagram, Facebook, aplicativos de I A e até no Mercado Livre' },
  { id: 'assistente',    audioText: 'Funciono como uma Alexa, você define qual palavra de ativação me chama, também funciono com botão de microfone, interagindo com botões ou digitando um texto. Diretamente na tela do seu estabelecimento ou em um totem de autoatendimento, tenho três modos de exibição: padrão, modo imersivo em tela cheia, e modo texto para digitação.' },
  { id: 'widget',        audioText: 'Como widget flutuante no seu site, pronto para responder visitantes a qualquer hora do dia, sem precisar de um atendente humano.' },
  { id: 'whatsapp',      audioText: 'No seu próprio WhatsApp, com a naturalidade que seus clientes já conhecem. Respondo mensagens, entendo o que o cliente precisa, envio e confirmo cobranças Pix, Débito e Crédito, marco eventos na sua Agenda Google, calculo frete de entrega, gero orçamentos e muito mais.' },
  { id: 'instagram',     audioText: 'No seu Instagram e Facebook, respondendo mensagens diretas, comentários e enviando De M automaticamente, com as mesmas funcionalidades do Whatsapp, convertendo seguidores em clientes.' },
  { id: 'mercadolivre',  audioText: 'No Mercado Livre, respondendo perguntas de compradores e tambem postando produtos diretamente vinculados aos seus produtos no dashboard.' },
  { id: 'mcp',           audioText: 'Via protocolo MCP, integrado diretamente ao Claude, ChatGPT, Cursor e Manus, onde você pode pedir tarefas para a minha I A diretamente pelo seu app de I A favorito.' },
  { id: 'whatsapp-mcp',  audioText: 'E também pode pedir tarefas diretamente para o WhatsApp minha I A, consultas, ações e integrações sem sair do aplicativo.' },
  { id: 'outro',         audioText: 'Resumindo, sou multifuncional e multicanal, para quem precisa de um funcionário, assistente pessoal ou um aplicativo de I A próprio, tudo com a mesma praticidade, inteligência, com configuração simples e rápida, sem precisar de conhecimento sobre programação. Venha me testar gratuitamente!' },
];

async function generate(id: string, text: string) {
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

  const status = fromCache ? '🎯 cache' : `✅ gerado em ${genTime}ms`;
  console.log(`  [${id}] ${status} — ${(bytes / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log(`\n🚀 Pré-gerando ${SCENES.length} áudios em ${BASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const scene of SCENES) {
    try {
      await generate(scene.id, scene.audioText);
      success++;
    } catch (err: any) {
      console.error(`  [${scene.id}] ❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 ${success} gerados, ${failed} erros\n`);
  if (failed > 0) process.exit(1);
}

main();