// app/api/arte/gstest/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30;
import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

export async function GET() {
  try {
    const nodeRequire = eval('require') as NodeRequire;
    const pkgDir = path.dirname(nodeRequire.resolve('@jspawn/ghostscript-wasm/package.json'));
    const wasmBytes = fs.readFileSync(path.join(pkgDir, 'gs.wasm'));
    const wasmModule = await WebAssembly.compile(wasmBytes); // compilo eu mesmo

    // @ts-ignore — pacote sem types
    const Module = (await import('@jspawn/ghostscript-wasm')).default;

    const out: string[] = [];
    const mod = await Module({
      noInitialRun: true,
      // intercepta a instanciação: o glue não tenta fetch nenhum
      instantiateWasm: (imports: WebAssembly.Imports, cb: (inst: WebAssembly.Instance) => void) => {
        WebAssembly.instantiate(wasmModule, imports).then((inst) => cb(inst));
        return {}; // sinaliza que estamos cuidando da instanciação
      },
      print:    (s: string) => out.push(s),
      printErr: (s: string) => out.push(s),
    });

    const status = mod.callMain(['--version']);
    return NextResponse.json({ ok: true, status, gs: out.join('\n').trim() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.stack ?? e) }, { status: 500 });
  }
}