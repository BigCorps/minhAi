// app/api/.well-known/oauth-authorization-server/route.ts
// RFC 8414 — OAuth Authorization Server Metadata
// Esse endpoint é chamado primeiro pelo Claude, ChatGPT, Cursor e Manus
// antes de qualquer coisa. Sem ele, o DCR não começa.

import { NextResponse } from 'next/server'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_MCP_URL ?? 'https://mcp.minhai.app'

  return NextResponse.json({
    // Deve bater exatamente com a origem do servidor MCP
    issuer: base,

    // Tela de login/autorização — sua página já existente
    authorization_endpoint: `${base}/mcp/authorize`,

    // Troca do code por access_token — sua rota já existente
    token_endpoint: `${base}/api/mcp/oauth/token`,

    // Registro dinâmico (DCR) — sua rota já existente
    registration_endpoint: `${base}/api/mcp/oauth/register`,

    // Capacidades anunciadas
    scopes_supported:              ['tools'],
    response_types_supported:      ['code'],
    response_modes_supported:      ['query'],
    grant_types_supported:         ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported:      ['S256'],

    // Informa que suporta DCR — Claude e ChatGPT verificam isso
    // antes de tentar o POST /register
    // (opcional mas recomendado)
    // client_id_metadata_document_supported: true, // só se usar CIMD
  }, {
    headers: {
      // Permite que Claude/ChatGPT (outras origens) leiam esse endpoint
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}

// OPTIONS — necessário para preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
