// app/api/arte/gstest/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

export async function GET() {
  try {
    const require = createRequire(import.meta.url);
    const pkgDir = path.dirname(require.resolve('@jspawn/ghostscript-wasm/package.json'));
    const wasmBinary = fs.readFileSync(path.join(pkgDir, 'gs.wasm'));

    // @ts-ignore — pacote sem types
    const GSFactory = (await import('@jspawn/ghostscript-wasm')).default;
    let out = '';
    const mod = await GSFactory({
      wasmBinary,                 // entrega os bytes prontos; o Emscripten não tenta resolver caminho
      print:    (s: string) => { out += s + '\n'; },
      printErr: (s: string) => { out += s + '\n'; },
    });
    mod.callMain(['--version']);
    return NextResponse.json({ ok: true, gs: out.trim() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
