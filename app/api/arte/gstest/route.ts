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
    const Module = (await import('@jspawn/ghostscript-wasm')).default;

    const out: string[] = [];
    const mod = await Module({
      noInitialRun: true,          // não roda nada sozinho
      wasmBinary,                  // bytes prontos: sem fetch, sem path
      print:    (s: string) => out.push(s),
      printErr: (s: string) => out.push(s),
    });

    // exit status (número). 0 = ok.
    const status = mod.callMain(['--version']);

    return NextResponse.json({ ok: true, status, gs: out.join('\n').trim() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.stack ?? (e as Error)?.message ?? e) }, { status: 500 });
  }
}