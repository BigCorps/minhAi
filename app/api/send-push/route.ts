import { NextRequest, NextResponse } from 'next/server';
import { sendOneSignalPush } from '@/lib/onesignal';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.PUSH_SECRET_KEY) {
       return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const body = await req.json();
    const { title, message, url, userId, broadcast } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios.' }, { status: 400 });
    }

    // Passa a bola para a nossa função central
    const result = await sendOneSignalPush({ title, message, url, userId, broadcast });

    return NextResponse.json({ success: true, id: result.id });

  } catch (error: any) {
    console.error("Erro na API de envio:", error.message);
    return NextResponse.json({ error: 'Ocorreu um erro interno.' }, { status: 500 });
  }
}