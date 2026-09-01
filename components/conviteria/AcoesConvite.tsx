'use client';

// components/conviteria/AcoesConvite.tsx
//
// Copiar link e QR Code de um convite publicado.
//
// O QR e gerado no cliente com a lib `qrcode`, que ja estava no projeto. Nao
// usa servico externo de proposito: seria uma dependencia de terceiro no meio
// de um fluxo do cliente, e o link do convite iria para fora sem necessidade.

import { useState } from 'react';
import QRCode from 'qrcode';
import { Link2, QrCode, Check, X, Download } from 'lucide-react';

const cor = {
  acento: '#c06078',
  acentoTexto: '#a04a63',
  tinta: '#40232c',
  tintaSuave: '#7c5560',
  blocoTexto: '#fff5f8',
};

export default function AcoesConvite({
  url,
  slug,
}: {
  url: string;
  slug: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard exige contexto seguro e permissao. Falhando, o texto do
      // proprio card ja mostra o endereco para copiar a mao.
      setErro('Não foi possível copiar. Selecione o endereço acima.');
      setTimeout(() => setErro(null), 3000);
    }
  }

  async function gerarQr() {
    if (qr) { setQr(null); return; }
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        color: { dark: '#40232c', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQr(dataUrl);
    } catch {
      setErro('Não foi possível gerar o QR Code.');
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={copiar}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: cor.tintaSuave }}
        >
          {copiado ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {copiado ? 'Copiado!' : 'Copiar link'}
        </button>

        <button
          type="button"
          onClick={gerarQr}
          aria-expanded={!!qr}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: cor.tintaSuave }}
        >
          <QrCode className="w-4 h-4" />
          QR Code
        </button>
      </div>

      {erro && (
        <p className="mt-2 text-xs" style={{ color: cor.acentoTexto }}>{erro}</p>
      )}

      {qr && (
        <div
          className="mt-3 rounded-xl border p-4 flex flex-col items-center gap-3"
          style={{ borderColor: cor.acento + '33', backgroundColor: '#fff' }}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs" style={{ color: cor.tintaSuave }}>
              Aponte a câmera para abrir o convite
            </span>
            <button
              type="button"
              onClick={() => setQr(null)}
              aria-label="Fechar QR Code"
              style={{ color: cor.tintaSuave }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* next/image nao serve para data URL gerada em runtime. */}
          <img src={qr} alt={`QR Code de ${url}`} className="w-44 h-44" />

          {/* Download com nome pelo slug: quem imprime no convite de papel
              precisa achar o arquivo depois. */}
          <a
            href={qr}
            download={`convite-${slug}.png`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full"
            style={{ backgroundColor: cor.acento, color: cor.blocoTexto }}
          >
            <Download className="w-4 h-4" />
            Baixar PNG
          </a>
        </div>
      )}
    </>
  );
}
