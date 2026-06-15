// app/api/arte/gstest/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30;
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // @ts-ignore — pacote sem types
    const GSFactory = (await import('@jspawn/ghostscript-wasm')).default;
    let out = '';
    const mod = await GSFactory({
      print: (s: string) => { out += s + '\n'; },
      printErr: (s: string) => { out += s + '\n'; },
    });
    mod.callMain(['--version']); // só pede a versão do Ghostscript
    return NextResponse.json({ ok: true, gs: out.trim() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
}