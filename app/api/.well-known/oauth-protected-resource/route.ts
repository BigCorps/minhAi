// app/api/.well-known/oauth-protected-resource/route.ts
// RFC 9728 — OAuth Protected Resource Metadata
// Chamado logo após o 401 do servidor MCP para descobrir qual
// authorization server gerencia esse recurso.
// Sem isso, Claude e ChatGPT não sabem onde buscar o oauth-authorization-server.

import { NextResponse } from 'next/server'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_MCP_URL ?? 'https://mcp.minhai.app'

  return NextResponse.json({
    // Identifica este servidor MCP como o recurso protegido
    resource: `${base}/mcp`,

    // Aponta para o authorization server — o Claude vai buscar o
    // /.well-known/oauth-authorization-server nessa origem
    authorization_servers: [base],

    bearer_methods_supported:  ['header'],
    scopes_supported:          ['tools'],
    resource_documentation:    `${base}/docs`,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}

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
