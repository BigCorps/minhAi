// app/api/vision/extract-products/route.ts
//
// API route server-side para extração de produtos de PDF ou imagem via GPT-4o Vision.
// Usa OPENAI_API_KEY (server-side) — nunca exposta ao cliente.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType, fileName } = await req.json();

    if (!base64 || !mediaType) {
      return NextResponse.json(
        { error: 'base64 e mediaType são obrigatórios' },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      );
    }

    const isPdf = mediaType === 'application/pdf';

    const prompt = isPdf
      ? 'Este é um cardápio ou tabela de preços em PDF. Extraia TODOS os produtos que encontrar. Para cada produto retorne: nome, descrição (se houver), preço de venda. Retorne SOMENTE um JSON válido no formato: {"produtos": [{"nome": "...", "descricao": "...", "preco_venda": 0.00, "categoria": "..."}]}. Não inclua texto fora do JSON.'
      : 'Esta é uma imagem de cardápio ou lista de produtos. Extraia TODOS os produtos visíveis. Para cada produto retorne: nome, descrição (se houver), preço de venda. Retorne SOMENTE um JSON válido no formato: {"produtos": [{"nome": "...", "descricao": "...", "preco_venda": 0.00, "categoria": "..."}]}. Não inclua texto fora do JSON.';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                  detail: 'high',
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI Vision error:', err);
      return NextResponse.json(
        { error: `Erro na API OpenAI: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? '{}';

    // Parse do JSON retornado pelo GPT-4o
    let produtos: any[] = [];
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      produtos = (parsed.produtos ?? [])
        .map((p: any) => ({
          nome:           String(p.nome ?? '').trim(),
          descricao:      p.descricao ?? '',
          categoria:      p.categoria ?? '',
          preco_venda:    parseFloat(p.preco_venda) || 0,
          preco_custo:    0,
          unidade:        'un',
          estoque_atual:  0,
          estoque_minimo: 0,
          imagem_url:     '',
          ean:            '',
          marca:          '',
        }))
        .filter((p: any) => p.nome);
    } catch (e) {
      console.error('Parse error:', rawText);
      return NextResponse.json(
        { error: 'Não consegui interpretar os produtos do arquivo.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ produtos, total: produtos.length });

  } catch (err: any) {
    console.error('extract-products error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno' },
      { status: 500 }
    );
  }
}
