// app/api/setup/chat-funcoes/route.ts
// GPT interpreta pedidos livres sobre funções:
// - ativar / desativar por nome ou descrição
// - configurar funções (coleta dados e salva)
// - explicar o que uma função faz
// - recomendar funções para um objetivo

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatFuncoesBody {
  companyId:       string;
  message:         string;
  activeFunctions: string[];
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

// ── Funções que exigem configuração via modal (não via chat) ──────────────────
// Motivos: dados sensíveis, CRUD complexo, UI especializada ou múltiplos steps
const MODAL_ONLY_CONFIG = new Set([
  'tef_debito',       // mp_access_token (sensível) + terminal_id + parcelas
  'tef_credito',      // idem
  'validar_cupom',    // CRUD de cupons (tabela cupons) — não é coleta simples
  'gerar_senha',      // fila_configs + operações realtime com tabs
  'chamar_proxima_senha',
  'painel_fila',
  'pausar_fila',
  'retomar_fila',
  'cancelar_senha',
  'finalizar_atendimento',
  'minha_posicao_fila',
  'chatgpt',          // ChatPromptModal com IA especializada
  'sequencia_videos', // lista de vídeos com reordenação (UI drag-drop)
]);

// ── Funções configuráveis que o chat pode processar ───────────────────────────
// Chave: function_key → descrição dos campos para o GPT saber o que perguntar
const CHAT_CONFIGURABLE: Record<string, {
  description: string;
  fields: { key: string; label: string; required: boolean; hint?: string }[];
  saveTarget: 'company_function_settings' | 'companies' | 'registration_configs';
  companyFields?: string[]; // quais campos de companies salvar (quando saveTarget='companies')
}> = {
  // ── InfinitePay (3 funções, mesmo campo) ────────────────────────────────────
  link_pagamento: {
    description: 'Link de pagamento via InfinitePay',
    fields: [{ key: 'infinitepay_handle', label: 'Handle InfinitePay (Token)', required: true, hint: 'Formato: $seu-handle — encontre no Painel InfinitePay → Integrações → Token' }],
    saveTarget: 'companies',
    companyFields: ['infinitepay_handle'],
  },
  nfc_credito: {
    description: 'Pagamento por aproximação (crédito) via InfinitePay',
    fields: [{ key: 'infinitepay_handle', label: 'Handle InfinitePay (Token)', required: true, hint: 'Mesmo token do Link de Pagamento e NFC Débito' }],
    saveTarget: 'companies',
    companyFields: ['infinitepay_handle'],
  },
  nfc_debito: {
    description: 'Pagamento por aproximação (débito) via InfinitePay',
    fields: [{ key: 'infinitepay_handle', label: 'Handle InfinitePay (Token)', required: true, hint: 'Mesmo token do Link de Pagamento e NFC Crédito' }],
    saveTarget: 'companies',
    companyFields: ['infinitepay_handle'],
  },

  // ── PIX ─────────────────────────────────────────────────────────────────────
  pix_generate: {
    description: 'Geração de QR Code PIX via Banco Inter',
    fields: [
      { key: 'pix_key', label: 'Chave PIX', required: true, hint: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
      { key: 'pix_beneficiary_name', label: 'Nome do beneficiário', required: false, hint: 'Nome que aparece na tela do pagador' },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Cadastro ─────────────────────────────────────────────────────────────────
  cadastro: {
    description: 'Formulário de cadastro de clientes por voz',
    fields: [
      { key: 'fields', label: 'Campos a coletar', required: true, hint: 'Opções: nome (obrigatório), telefone, email, cpf, endereco, empresa, cargo, observacoes' },
    ],
    saveTarget: 'registration_configs',
  },

  // ── QR Codes de redes sociais ────────────────────────────────────────────────
  qrcode_whatsapp: {
    description: 'QR Code do WhatsApp da empresa',
    fields: [{ key: 'whatsapp_number', label: 'Número do WhatsApp', required: true, hint: 'Formato: 5511999999999 (com DDI e DDD, sem espaços ou traços)' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_instagram: {
    description: 'QR Code do Instagram da empresa',
    fields: [{ key: 'instagram_username', label: 'Username do Instagram', required: true, hint: 'Sem o @, ex: minhaempresa' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_website: {
    description: 'QR Code do site da empresa',
    fields: [{ key: 'website_url', label: 'URL do site', required: true, hint: 'Ex: https://www.minhaempresa.com.br' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_facebook: {
    description: 'QR Code do Facebook da empresa',
    fields: [{ key: 'facebook_url', label: 'URL ou username do Facebook', required: true, hint: 'Ex: facebook.com/minhaempresa ou só: minhaempresa' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_email: {
    description: 'QR Code de e-mail da empresa',
    fields: [{ key: 'contact_email', label: 'E-mail de contato', required: true }],
    saveTarget: 'company_function_settings',
  },
  qrcode_linkedin: {
    description: 'QR Code do LinkedIn da empresa',
    fields: [{ key: 'linkedin_url', label: 'URL do LinkedIn', required: true, hint: 'Ex: linkedin.com/company/minhaempresa' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_tiktok: {
    description: 'QR Code do TikTok da empresa',
    fields: [{ key: 'tiktok_username', label: 'Username do TikTok', required: true, hint: 'Sem o @' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_twitter: {
    description: 'QR Code do Twitter/X da empresa',
    fields: [{ key: 'twitter_username', label: 'Username do Twitter/X', required: true, hint: 'Sem o @' }],
    saveTarget: 'company_function_settings',
  },
  qrcode_telefone: {
    description: 'QR Code de ligação para o telefone da empresa',
    fields: [{ key: 'phone_number', label: 'Telefone de contato', required: true, hint: 'Formato: 5511999999999' }],
    saveTarget: 'company_function_settings',
  },
  wifi_qrcode: {
    description: 'QR Code de Wi-Fi para os clientes se conectarem sem digitar senha',
    fields: [
      { key: 'wifi_ssid', label: 'Nome da rede (SSID)', required: true },
      { key: 'wifi_password', label: 'Senha do Wi-Fi', required: false },
      { key: 'wifi_security', label: 'Tipo de segurança', required: false, hint: 'WPA, WEP ou deixe vazio para rede aberta' },
    ],
    saveTarget: 'company_function_settings',
  },
  nosso_qrcode: {
    description: 'QR Code personalizado com qualquer texto ou URL',
    fields: [
      { key: 'custom_qr_content', label: 'Conteúdo do QR Code', required: true, hint: 'Pode ser uma URL, texto, e-mail, etc.' },
      { key: 'custom_qr_label', label: 'Texto explicativo exibido abaixo', required: false },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Conteúdo da empresa ──────────────────────────────────────────────────────
  nossa_marca: {
    description: 'Apresentação da empresa ao cliente',
    fields: [
      { key: 'brand_description', label: 'Descrição da empresa', required: true, hint: 'O que a empresa faz, seus diferenciais, história resumida' },
      { key: 'brand_tagline', label: 'Slogan ou frase de impacto', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  endereco: {
    description: 'Endereço e localização da empresa',
    fields: [
      { key: 'address_full', label: 'Endereço completo', required: true, hint: 'Rua, número, bairro, cidade, estado' },
      { key: 'address_complement', label: 'Complemento / referência', required: false },
      { key: 'address_maps_url', label: 'Link do Google Maps', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  faq: {
    description: 'Respostas automáticas para perguntas frequentes',
    fields: [
      { key: 'faq_content', label: 'Perguntas e respostas frequentes', required: true, hint: 'Escreva as perguntas e respostas mais comuns dos seus clientes' },
    ],
    saveTarget: 'company_function_settings',
  },
  orcamento: {
    description: 'Geração de orçamentos com IA baseados na tabela de preços',
    fields: [
      { key: 'price_table', label: 'Tabela de preços e serviços', required: true, hint: 'Liste os produtos/serviços com preços. Ex: Corte de cabelo - R$50, Coloração - R$120' },
    ],
    saveTarget: 'company_function_settings',
  },
  cardapio: {
    description: 'Cardápio digital da empresa',
    fields: [
      { key: 'menu_url', label: 'URL do cardápio (PDF ou imagem)', required: false, hint: 'Link direto para o PDF ou imagem do cardápio' },
      { key: 'menu_description', label: 'Descrição do cardápio / itens principais', required: false },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Agendamento ──────────────────────────────────────────────────────────────
  agendar_compromisso: {
    description: 'Agendamento de serviços via Google Calendar',
    fields: [
      { key: 'calendar_id', label: 'ID do Google Calendar', required: true, hint: 'Encontre em Google Calendar → Configurações → [seu calendário] → ID do calendário' },
      { key: 'booking_services', label: 'Serviços disponíveis para agendamento', required: false, hint: 'Ex: Consulta (30min), Retorno (15min), Exame (1h)' },
    ],
    saveTarget: 'company_function_settings',
  },
  ver_agenda: {
    description: 'Visualização da agenda do Google Calendar',
    fields: [
      { key: 'calendar_id', label: 'ID do Google Calendar', required: true, hint: 'Mesmo ID configurado no Agendamento' },
    ],
    saveTarget: 'company_function_settings',
  },
  cancelar_agendamento: {
    description: 'Cancelamento de agendamentos',
    fields: [{ key: 'calendar_id', label: 'ID do Google Calendar', required: true }],
    saveTarget: 'company_function_settings',
  },
  confirmar_presenca: {
    description: 'Confirmação de presença em agendamentos',
    fields: [{ key: 'calendar_id', label: 'ID do Google Calendar', required: true }],
    saveTarget: 'company_function_settings',
  },
  reagendar_compromisso: {
    description: 'Reagendamento de compromissos',
    fields: [{ key: 'calendar_id', label: 'ID do Google Calendar', required: true }],
    saveTarget: 'company_function_settings',
  },
  horarios_disponiveis: {
    description: 'Consulta de horários livres no Google Calendar',
    fields: [{ key: 'calendar_id', label: 'ID do Google Calendar', required: true }],
    saveTarget: 'company_function_settings',
  },

  // ── E-mail ───────────────────────────────────────────────────────────────────
  enviar_email: {
    description: 'Envio de e-mails via Gmail API',
    fields: [
      { key: 'gmail_from_name', label: 'Nome do remetente', required: true, hint: 'Nome que aparece no e-mail enviado' },
      { key: 'gmail_reply_to', label: 'E-mail de resposta', required: false },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Câmera / abas de captura ─────────────────────────────────────────────────
  imagem_em_texto: {
    description: 'Extração de texto de imagens (OCR)',
    fields: [{ key: 'enabled_tabs', label: 'Abas de captura disponíveis', required: true, hint: 'Opções: companion (celular via QR), webcam, mobile (câmera do celular), upload. Separe por vírgula.' }],
    saveTarget: 'company_function_settings',
  },
  tabela_em_texto: {
    description: 'Conversão de tabelas fotografadas para CSV',
    fields: [{ key: 'enabled_tabs', label: 'Abas de captura disponíveis', required: true, hint: 'Opções: companion, webcam, mobile, upload' }],
    saveTarget: 'company_function_settings',
  },
  contrato_em_texto: {
    description: 'Digitalização de contratos por OCR',
    fields: [{ key: 'enabled_tabs', label: 'Abas de captura disponíveis', required: true, hint: 'Opções: companion, webcam, mobile, upload' }],
    saveTarget: 'company_function_settings',
  },
  ler_qrcode: {
    description: 'Leitura de QR Codes pela câmera',
    fields: [{ key: 'enabled_tabs', label: 'Abas de captura disponíveis', required: true, hint: 'Opções: companion, webcam, mobile, upload' }],
    saveTarget: 'company_function_settings',
  },
  ler_codigo_barras: {
    description: 'Leitura de códigos de barras pela câmera',
    fields: [{ key: 'enabled_tabs', label: 'Abas de captura disponíveis', required: true, hint: 'Opções: companion, webcam, mobile, upload' }],
    saveTarget: 'company_function_settings',
  },

  // ── Mídia ────────────────────────────────────────────────────────────────────
  video_instrucoes: {
    description: 'Vídeo de instruções sobre o produto/serviço',
    fields: [
      { key: 'instruction_video_url', label: 'URL do vídeo', required: true, hint: 'YouTube, Vimeo ou MP4 direto' },
      { key: 'instruction_video_title', label: 'Título do vídeo', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  tocar_video: {
    description: 'Reprodução de vídeos do YouTube por voz',
    fields: [{ key: 'default_youtube_channel', label: 'Canal padrão do YouTube (opcional)', required: false, hint: 'URL ou nome do canal para buscas direcionadas' }],
    saveTarget: 'company_function_settings',
  },
  tocar_musica: {
    description: 'Reprodução de músicas do YouTube por voz',
    fields: [{ key: 'music_search_context', label: 'Estilo musical preferido (opcional)', required: false, hint: 'Ex: MPB, sertanejo, ambiente relaxante — orienta as buscas' }],
    saveTarget: 'company_function_settings',
  },
  canal_youtube: {
    description: 'Exibição do canal do YouTube da empresa com QR Code',
    fields: [{ key: 'youtube_channel_url', label: 'URL do canal no YouTube', required: true }],
    saveTarget: 'company_function_settings',
  },
  playlist: {
    description: 'Reprodução de playlists configuradas',
    fields: [
      { key: 'playlist_url', label: 'URL da playlist (YouTube ou Spotify)', required: true },
      { key: 'playlist_name', label: 'Nome da playlist', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  porta_retrato: {
    description: 'Slideshow de fotos do Google Drive com música opcional',
    fields: [
      { key: 'drive_folder_url', label: 'URL da pasta do Google Drive com as fotos', required: true, hint: 'Compartilhe a pasta como "qualquer pessoa com o link pode ver"' },
      { key: 'slideshow_interval_seconds', label: 'Tempo entre fotos (segundos)', required: false, hint: 'Padrão: 5 segundos' },
    ],
    saveTarget: 'company_function_settings',
  },
  painel_ofertas: {
    description: 'Slideshow de imagens de ofertas do Google Drive',
    fields: [
      { key: 'offers_drive_folder_url', label: 'URL da pasta do Google Drive com as ofertas', required: true, hint: 'Compartilhe como "qualquer pessoa com o link pode ver"' },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Impressão ────────────────────────────────────────────────────────────────
  impressao_remota: {
    description: 'Impressão remota automática via PrintNode',
    fields: [
      { key: 'printnode_computer_id', label: 'Computer ID do PrintNode', required: true, hint: 'Obtido no PrintNode Client instalado no computador onde está a impressora' },
      { key: 'printnode_printer_id', label: 'Printer ID (opcional)', required: false, hint: 'Deixe vazio para usar a impressora padrão do computador' },
    ],
    saveTarget: 'company_function_settings',
  },
  impressao_recibo: {
    description: 'Impressão de recibos em impressora térmica ESC/POS',
    fields: [
      { key: 'receipt_header', label: 'Cabeçalho do recibo', required: false, hint: 'Nome da empresa, endereço, telefone' },
      { key: 'receipt_footer', label: 'Rodapé do recibo', required: false, hint: 'Ex: Obrigado pela preferência!' },
    ],
    saveTarget: 'company_function_settings',
  },
  impressao_local: {
    description: 'Impressão via sistema nativo do dispositivo',
    fields: [],
    saveTarget: 'company_function_settings',
  },

  // ── Produtos e vendas ────────────────────────────────────────────────────────
  modo_venda: {
    description: 'Catálogo interativo com carrinho e checkout por voz',
    fields: [
      { key: 'store_currency', label: 'Moeda (padrão BRL)', required: false },
      { key: 'store_min_order_value', label: 'Valor mínimo de pedido (R$)', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  ver_produtos: {
    description: 'Exibição de produtos disponíveis',
    fields: [{ key: 'products_display_mode', label: 'Modo de exibição', required: false, hint: 'grid ou list' }],
    saveTarget: 'company_function_settings',
  },
  fazer_pedido: {
    description: 'Montagem de pedido por voz com pagamento integrado',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  consultar_estoque: {
    description: 'Consulta de estoque atual com alerta de mínimo',
    fields: [{ key: 'stock_alert_threshold', label: 'Quantidade mínima para alerta', required: false, hint: 'Padrão: 5 unidades' }],
    saveTarget: 'company_function_settings',
  },
  cadastrar_produto: {
    description: 'Cadastro de novo produto por voz',
    fields: [],
    saveTarget: 'company_function_settings',
  },

  // ── Cupom próprio (não validar cupom de terceiros) ───────────────────────────
  meu_cupom: {
    description: 'Geração de cupom de indicação exclusivo',
    fields: [
      { key: 'coupon_discount_percent', label: 'Desconto padrão do cupom (%)', required: false },
      { key: 'coupon_validity_days', label: 'Validade do cupom (dias)', required: false },
    ],
    saveTarget: 'company_function_settings',
  },

  // ── Clima ────────────────────────────────────────────────────────────────────
  clima_tempo: {
    description: 'Informações climáticas e previsão do tempo',
    fields: [{ key: 'default_city', label: 'Cidade padrão para clima', required: false, hint: 'Será usada quando o cliente não informar cidade. Ex: São Paulo, SP' }],
    saveTarget: 'company_function_settings',
  },

  // ── Utilidades ───────────────────────────────────────────────────────────────
  consultar_cep: {
    description: 'Consulta de endereço por CEP',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  lembrete_remedios: {
    description: 'Lembretes de medicamentos em horários específicos',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  ver_noticias: {
    description: 'Exibição das principais manchetes do momento',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  procurar_produto: {
    description: 'Pesquisa de produtos no Mercado Livre',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  criar_nota: {
    description: 'Criação e salvamento de notas por voz',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  segunda_via_boleto: {
    description: 'Geração de segunda via de boleto',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  rastreio_correios: {
    description: 'Rastreamento de encomendas pelos Correios',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  buscar_endereco: {
    description: 'Busca de endereços por CEP ou nome',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  tracar_rota: {
    description: 'Traçar rota entre dois locais',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  identificar_fraude: {
    description: 'Análise de imagens e links para detectar fraudes',
    fields: [],
    saveTarget: 'company_function_settings',
  },
  chamar_gerente: {
    description: 'Notificação urgente para o gerente',
    fields: [
      { key: 'manager_email', label: 'E-mail do gerente', required: false },
      { key: 'manager_phone', label: 'Telefone do gerente', required: false },
    ],
    saveTarget: 'company_function_settings',
  },
  pre_atendimento: {
    description: 'Formulário de coleta de dados antes do atendimento',
    fields: [
      { key: 'pre_attendance_fields', label: 'Dados a coletar no pré-atendimento', required: true, hint: 'Ex: nome, data de nascimento, motivo da consulta, plano de saúde' },
    ],
    saveTarget: 'company_function_settings',
  },
  responder_pesquisa: {
    description: 'Pesquisa de satisfação com perguntas customizadas',
    fields: [
      { key: 'survey_questions', label: 'Perguntas da pesquisa', required: true, hint: 'Ex: "De 1 a 10, como avalia nosso atendimento?", "O que podemos melhorar?"' },
    ],
    saveTarget: 'company_function_settings',
  },
  emitir_nota: {
    description: 'Emissão de nota fiscal',
    fields: [
      { key: 'nfse_provider', label: 'Provedor de NFS-e', required: false, hint: 'Ex: Prefeitura de São Paulo, eNotas, NFSeio' },
    ],
    saveTarget: 'company_function_settings',
  },
  fichas_producao_conversacional: {
    description: 'Criação de fichas de produção por voz',
    fields: [
      { key: 'production_unit', label: 'Unidade de medida padrão', required: false, hint: 'Ex: kg, litros, unidades, porções' },
    ],
    saveTarget: 'company_function_settings',
  },
};

// ── Construir catálogo de configurações para o GPT ────────────────────────────
function buildConfigCatalog(): string {
  const lines: string[] = [];

  lines.push('\n=== CATÁLOGO DE CONFIGURAÇÃO POR FUNÇÃO ===\n');
  lines.push('FUNÇÕES QUE EXIGEM MODAL (dados sensíveis ou UI complexa — oriente o usuário a usar o botão de config):');
  for (const key of MODAL_ONLY_CONFIG) {
    lines.push(`  • ${key}`);
  }

  lines.push('\nFUNÇÕES QUE VOCÊ PODE CONFIGURAR PELO CHAT:');
  for (const [key, meta] of Object.entries(CHAT_CONFIGURABLE)) {
    if (meta.fields.length === 0) {
      lines.push(`  • ${key}: ${meta.description} — sem campos configuráveis pelo chat`);
    } else {
      const fieldList = meta.fields.map(f =>
        `${f.label}${f.required ? ' (obrigatório)' : ' (opcional)'}${f.hint ? ` — ${f.hint}` : ''}`
      ).join('; ');
      lines.push(`  • ${key}: ${meta.description} — campos: [${fieldList}]`);
    }
  }

  return lines.join('\n');
}

// ── Salvar configuração coletada pelo GPT ─────────────────────────────────────
async function saveConfiguration(
  supabase: any,
  companyId: string,
  functionKey: string,
  collectedData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const meta = CHAT_CONFIGURABLE[functionKey];
  if (!meta) return { success: false, error: `Função ${functionKey} não é configurável pelo chat` };

  try {
    if (meta.saveTarget === 'companies') {
      const update: Record<string, any> = {};
      for (const field of (meta.companyFields ?? [])) {
        if (collectedData[field] !== undefined) update[field] = collectedData[field];
      }
      if (Object.keys(update).length > 0) {
        const { error } = await supabase.from('companies').update(update).eq('id', companyId);
        if (error) throw error;
      }

    } else if (meta.saveTarget === 'registration_configs') {
      // Normalizar campos para array
      let fields: string[] = ['nome'];
      const VALID_FIELDS = ['nome', 'telefone', 'email', 'cpf', 'endereco', 'empresa', 'cargo', 'observacoes'];
      if (typeof collectedData.fields === 'string') {
        fields = collectedData.fields
          .split(/[,;]+/)
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => VALID_FIELDS.includes(s));
        if (!fields.includes('nome')) fields.unshift('nome');
      } else if (Array.isArray(collectedData.fields)) {
        fields = collectedData.fields.filter((s: string) => VALID_FIELDS.includes(s));
        if (!fields.includes('nome')) fields.unshift('nome');
      }
      const { error } = await supabase
        .from('registration_configs')
        .upsert({ company_id: companyId, fields, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
      if (error) throw error;

    } else {
      // company_function_settings — salvar como JSON no campo config
      // Normalizar enabled_tabs se necessário
      if (collectedData.enabled_tabs && typeof collectedData.enabled_tabs === 'string') {
        const VALID_TABS = ['companion', 'webcam', 'mobile', 'upload'];
        collectedData.enabled_tabs = collectedData.enabled_tabs
          .split(/[,;]+/)
          .map((s: string) => s.trim().toLowerCase())
          .filter((s: string) => VALID_TABS.includes(s));
        if (collectedData.enabled_tabs.length === 0) collectedData.enabled_tabs = ['companion', 'webcam', 'mobile', 'upload'];
      }

      const { error } = await supabase
        .from('company_function_settings')
        .upsert(
          { company_id: companyId, function_key: functionKey, config: collectedData, updated_at: new Date().toISOString() },
          { onConflict: 'company_id,function_key' }
        );
      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erro desconhecido ao salvar' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatFuncoesBody = await request.json();
    const { companyId, message, activeFunctions, conversationHistory = [] } = body;

    if (!companyId || !message?.trim()) {
      return NextResponse.json({ error: 'companyId e message são obrigatórios' }, { status: 400 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
    }

    const supabase = createClient();

    const { data: company } = await supabase
      .from('companies')
      .select('assistant_type, name, segment_key')
      .eq('id', companyId)
      .single();

    const assistantType = company?.assistant_type ?? 'smart';
    const companyName   = company?.name ?? 'empresa';

    const { data: allFunctions } = await supabase
      .from('assistant_functions')
      .select('function_key, function_name, short_description, function_category')
      .eq('is_active', true)
      .order('function_name');

    if (!allFunctions?.length) {
      return NextResponse.json({ reply: 'Não consegui carregar o catálogo de funções agora. Tente novamente.', actions: [] });
    }

    const VENDAS_ALLOWED = new Set([
      'nossa_marca','endereco','chatgpt','faq',
      'cardapio','ver_produtos','fazer_pedido','modo_venda','consultar_estoque',
      'pix_generate','pix_confirm','link_pagamento','nfc_credito','nfc_debito',
      'meu_cupom','qrcode_whatsapp','qrcode_instagram','cadastro',
    ]);

    const visibleFunctions = assistantType === 'vendas'
      ? allFunctions.filter(f => VENDAS_ALLOWED.has(f.function_key))
      : allFunctions;

    const catalog = visibleFunctions
      .map(f => {
        const isActive = activeFunctions.includes(f.function_key);
        return `- ${f.function_key} | "${f.function_name}" | ${f.short_description} | ${isActive ? 'ATIVA' : 'INATIVA'}`;
      })
      .join('\n');

    const activeList = activeFunctions.length > 0 ? activeFunctions.join(', ') : 'nenhuma';
    const configCatalog = buildConfigCatalog();

    const systemPrompt = `Você é um assistente especialista em configuração do minhAi para a empresa "${companyName}" (tipo: ${assistantType === 'vendas' ? 'minhAi Vendas' : 'minhAi Smart'}).

Seu papel é ajudar o dono da empresa a gerenciar e configurar as funções do assistente virtual deles conversando naturalmente.

Você pode:
1. ATIVAR funções quando o usuário pedir
2. DESATIVAR funções quando o usuário pedir
3. CONFIGURAR funções coletando os dados necessários em conversa natural
4. EXPLICAR o que uma função faz
5. RECOMENDAR funções para um objetivo descrito
6. RESPONDER dúvidas sobre as funções disponíveis

${assistantType === 'vendas'
  ? 'IMPORTANTE: Este é um assistente minhAi Vendas. Só liste funções compatíveis com o modelo de vendas.'
  : 'Este é um assistente minhAi Smart com acesso ao catálogo completo de funções.'}

CATÁLOGO DE FUNÇÕES DISPONÍVEIS (function_key | "Nome" | descrição | status):
${catalog}

FUNÇÕES ATUALMENTE ATIVAS: ${activeList}

${configCatalog}

=== REGRAS DE CONFIGURAÇÃO ===

Quando o usuário pedir para CONFIGURAR uma função:

1. Se a função está na lista "EXIGE MODAL": responda que essa função precisa ser configurada pelo botão de engrenagem (⚙️) ao lado da função na lista. Explique brevemente por quê (dados sensíveis, interface especializada). NÃO tente coletar dados dela.

2. Se a função está na lista "PODE CONFIGURAR PELO CHAT" e TEM CAMPOS:
   - Faça UMA pergunta por vez, coletando cada campo necessário
   - Use linguagem natural, não técnica
   - Quando tiver TODOS os campos obrigatórios, emita a action "configure" com os dados
   - Se o usuário não souber um campo opcional, pule-o

3. Se a função está na lista "PODE CONFIGURAR PELO CHAT" e NÃO TEM CAMPOS (lista vazia): informe que a função não tem configurações adicionais — só precisa ser ativada.

4. Se o usuário fornecer dados de configuração junto com o pedido de ativação (ex: "ative o WhatsApp com o número 11999887766"), colete tudo de uma vez e emita ambas as actions (enable + configure) juntas.

5. enabled_tabs para funções de câmera: converta o que o usuário disser para o array correto. Opções válidas: companion, webcam, mobile, upload. Ex: "celular e upload" → ["companion", "upload"].

6. Para campos de registration_configs (função cadastro): converta para array de strings. Ex: "nome, telefone, email e CPF" → ["nome", "telefone", "email", "cpf"].

=== REGRAS GERAIS ===
- Responda SEMPRE em português brasileiro, de forma natural e amigável
- Seja direto: confirme o que foi feito ou explique o que vai fazer
- Quando ativar/desativar, mencione o NOME da função (não a chave técnica)
- Nunca invente function_keys — use APENAS as do catálogo acima
- Nunca invente campos de configuração — use APENAS os do catálogo de configuração
- Máximo 3 frases por resposta, exceto quando precisar listar campos ou explicar algo

=== FORMATO DA RESPOSTA ===
Responda APENAS com JSON válido, sem markdown:
{
  "reply": "sua resposta em linguagem natural",
  "actions": [
    { "function_key": "chave", "action": "enable" },
    { "function_key": "chave", "action": "disable" },
    { "function_key": "chave", "action": "configure", "config": { "campo": "valor" } }
  ]
}

Se não há ações (só explicação, aguardando mais dados do usuário), retorne "actions": [].`;

    // Montar histórico de conversa para multi-turn
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10), // últimas 10 mensagens para não explodir tokens
      { role: 'user' as const, content: message },
    ];

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!gptResponse.ok) {
      return NextResponse.json({ reply: 'Tive um problema para processar seu pedido. Pode tentar de novo?', actions: [] });
    }

    const gptData = await gptResponse.json();
    const rawContent = gptData.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return NextResponse.json({ reply: 'Não consegui processar isso. Pode reformular o pedido?', actions: [] });
    }

    let parsed: {
      reply: string;
      actions: { function_key: string; action: 'enable' | 'disable' | 'configure'; config?: Record<string, any> }[];
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent.replace(/```json|```/g, '').trim();
      try { parsed = JSON.parse(cleaned); }
      catch { return NextResponse.json({ reply: rawContent.slice(0, 300), actions: [] }); }
    }

    // Validar e executar actions
    const validKeys = new Set(visibleFunctions.map(f => f.function_key));
    const safeActions: typeof parsed.actions = [];
    const configErrors: string[] = [];

    for (const action of (parsed.actions ?? [])) {
      if (!validKeys.has(action.function_key)) continue;

      if (action.action === 'enable' || action.action === 'disable') {
        safeActions.push(action);

      } else if (action.action === 'configure' && action.config) {
        // Executar o save server-side imediatamente
        const result = await saveConfiguration(supabase, companyId, action.function_key, action.config);
        if (result.success) {
          safeActions.push(action); // inclui na resposta para o frontend saber que configurou
        } else {
          configErrors.push(`Erro ao salvar ${action.function_key}: ${result.error}`);
        }
      }
    }

    // Se houve erros de configuração, ajustar o reply
    let finalReply = parsed.reply ?? 'Pronto!';
    if (configErrors.length > 0) {
      finalReply += ` (Atenção: ${configErrors.join('; ')})`;
    }

    return NextResponse.json({ reply: finalReply, actions: safeActions });

  } catch (error: any) {
    console.error('Erro em chat-funcoes:', error);
    return NextResponse.json({ reply: 'Ocorreu um erro inesperado. Tente novamente.', actions: [] });
  }
}
