import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OPENAI_MODELS } from '@/lib/openai-models';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Multipart/form-data required' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Transcription unavailable' }, { status: 503 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: OPENAI_MODELS.transcribe,
      language: 'pt',
    });
    return NextResponse.json({ text: transcription.text });
  } catch {
    // Não retornar nem registrar conteúdo do áudio ou detalhes do provedor.
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}
