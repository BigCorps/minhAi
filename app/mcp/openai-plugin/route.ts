// app/api/mcp/openai-plugin/route.ts
// Manifest para o ChatGPT App Directory
// Retorna os metadados que a OpenAI exige para listar o app

import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://minhai.app'

// Manifest no formato exigido pela OpenAI para MCP Apps
const MANIFEST = {
  schema_version: 'v1',
  name_for_human: 'minhAi',
  name_for_model: 'minhai',
  description_for_human:
    'Funcionário de IA para empresas brasileiras. Gere PIX, consulte CNPJ/CPF, agende compromissos, emita notas fiscais, rastreie encomendas e muito mais.',
  description_for_model:
    'minhAi é uma plataforma brasileira de IA para empresas. Permite gerar cobranças PIX, links de pagamento InfinitePay, consultar CNPJ/CPF/CEP/Placa na Receita Federal, agendar eventos no Google Calendar, emitir notas fiscais, rastrear Correios, traduzir textos, identificar fraudes em boletos e URLs, enviar emails via Gmail e gerar QR Codes. Todas as operações consomem créditos do usuário.',
  auth: {
    type:              'oauth',
    client_url:        `${APP_URL}/api/mcp/oauth/authorize`,
    scope:             'tools',
    authorization_url: `${APP_URL}/api/mcp/oauth/token`,
    authorization_content_type: 'application/x-www-form-urlencoded',
    verification_tokens: {},
  },
  api: {
    type: 'mcp',
    url:  'https://mcp.minhai.app',
  },
  logo_url:           `${APP_URL}/icons/icon-192x192.png`,
  contact_email:      'contato@bigcorps.com.br',
  legal_info_url:     `${APP_URL}/mcp/privacy`,
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(MANIFEST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}