// app/api/arte/gstest/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import path from 'node:path';
import { createRequire } from 'node:module';

export async function GET() {
  try {
    // resolve a pasta real do pacote em runtime
    const require = createRequire(import.meta.url);
    const pkgJson = require.resolve('@jspawn/ghostscript-wasm/package.json');
    const pkgDir = path.dirname(pkgJson);

    // @ts-ignore — pacote sem types
    const GSFactory = (await import('@jspawn/ghostscript-wasm')).default;
    let out = '';
    const mod = await GSFactory({
      print: (s: string) => { out += s + '\n'; },
      printErr: (s: string) => { out += s + '\n'; },
      // força o caminho de disco do .wasm (resolve o "Failed to parse URL")
      locateFile: (file: string) => path.join(pkgDir, file),
    });
    mod.callMain(['--version']);
    return NextResponse.json({ ok: true, gs: out.trim() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
