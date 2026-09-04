'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { jsPDF } from 'jspdf';

type FormatoId = 'a4-vertical' | 'a5-vertical' | '10x15' | '15x21' | 'a4-horizontal';
type EstiloId = 'elegante' | 'clean' | 'festa';

type Formato = {
  id: FormatoId;
  nome: string;
  detalhe: string;
  larguraMm: number;
  alturaMm: number;
};

const FORMATOS: Formato[] = [
  { id: 'a4-vertical', nome: 'A4 vertical', detalhe: '21 × 29,7 cm', larguraMm: 210, alturaMm: 297 },
  { id: 'a5-vertical', nome: 'A5 vertical', detalhe: '14,8 × 21 cm', larguraMm: 148, alturaMm: 210 },
  { id: '10x15', nome: '10 × 15 cm', detalhe: 'porta-retrato / mesa', larguraMm: 100, alturaMm: 150 },
  { id: '15x21', nome: '15 × 21 cm', detalhe: 'plaquinha de mesa', larguraMm: 150, alturaMm: 210 },
  { id: 'a4-horizontal', nome: 'A4 horizontal', detalhe: '29,7 × 21 cm', larguraMm: 297, alturaMm: 210 },
];

const ESTILOS: Array<{ id: EstiloId; nome: string; detalhe: string }> = [
  { id: 'elegante', nome: 'Elegante', detalhe: 'casamentos, bodas e eventos formais' },
  { id: 'clean', nome: 'Clean', detalhe: 'neutro e minimalista' },
  { id: 'festa', nome: 'Festa', detalhe: 'alegre e descontraído' },
];

const TEXTO_SUGERIDO =
  'Escaneie o QR Code e envie as fotos e vídeos que você fizer neste dia especial. Não precisa instalar nenhum aplicativo.';

function nomeSeguro(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'Evento';
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar o QR Code.'));
    img.src = src;
  });
}

function arredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number,
) {
  const r = Math.min(raio, largura / 2, altura / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, r);
  ctx.arcTo(x + largura, y + altura, x, y + altura, r);
  ctx.arcTo(x, y + altura, x, y, r);
  ctx.arcTo(x, y, x + largura, y, r);
  ctx.closePath();
}

function linhasDoTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number,
  maxLinhas: number,
) {
  const resultado: string[] = [];
  const paragrafos = texto.replace(/\r/g, '').split('\n');

  for (const paragrafo of paragrafos) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      if (resultado.length < maxLinhas) resultado.push('');
      continue;
    }

    let linha = '';
    for (const palavra of palavras) {
      const teste = linha ? `${linha} ${palavra}` : palavra;
      if (ctx.measureText(teste).width <= larguraMaxima || !linha) {
        linha = teste;
      } else {
        resultado.push(linha);
        linha = palavra;
        if (resultado.length >= maxLinhas) break;
      }
    }
    if (resultado.length >= maxLinhas) break;
    if (linha) resultado.push(linha);
    if (resultado.length >= maxLinhas) break;
  }

  if (resultado.length === maxLinhas) {
    const ultima = resultado[maxLinhas - 1];
    let cortada = ultima;
    while (cortada.length > 2 && ctx.measureText(`${cortada}…`).width > larguraMaxima) {
      cortada = cortada.slice(0, -1);
    }
    resultado[maxLinhas - 1] = `${cortada.replace(/[\s,.]+$/g, '')}…`;
  }

  return resultado;
}

function desenharConfetes(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  const pontos = [
    [0.08, 0.10, 0.012], [0.16, 0.06, 0.008], [0.88, 0.08, 0.010], [0.94, 0.16, 0.007],
    [0.06, 0.77, 0.009], [0.12, 0.90, 0.012], [0.90, 0.82, 0.011], [0.95, 0.92, 0.007],
  ];
  const cores = ['#c06078', '#ef9a9a', '#f6c453', '#87b5a8'];
  pontos.forEach(([px, py, pr], i) => {
    ctx.fillStyle = cores[i % cores.length];
    ctx.beginPath();
    ctx.arc(largura * px, altura * py, largura * pr, 0, Math.PI * 2);
    ctx.fill();
  });
}

async function renderizarMaterial({
  formato,
  estilo,
  titulo,
  texto,
  qrDataUrl,
  urlMemorias,
  dpi,
}: {
  formato: Formato;
  estilo: EstiloId;
  titulo: string;
  texto: string;
  qrDataUrl: string;
  urlMemorias: string;
  dpi: number;
}) {
  const pxPorMm = dpi / 25.4;
  const largura = Math.round(formato.larguraMm * pxPorMm);
  const altura = Math.round(formato.alturaMm * pxPorMm);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu montar a arte.');

  const vertical = altura >= largura;
  const base = Math.min(largura, altura);
  const margem = base * (vertical ? 0.085 : 0.07);
  const centroX = largura / 2;

  // Fundo / linguagem visual.
  if (estilo === 'elegante') {
    ctx.fillStyle = '#fffaf8';
    ctx.fillRect(0, 0, largura, altura);
    ctx.strokeStyle = '#c06078';
    ctx.lineWidth = Math.max(2, base * 0.004);
    arredondado(ctx, margem * 0.55, margem * 0.55, largura - margem * 1.1, altura - margem * 1.1, base * 0.025);
    ctx.stroke();
    ctx.strokeStyle = '#e7bdc8';
    ctx.lineWidth = Math.max(1, base * 0.0017);
    arredondado(ctx, margem * 0.78, margem * 0.78, largura - margem * 1.56, altura - margem * 1.56, base * 0.018);
    ctx.stroke();
  } else if (estilo === 'clean') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    ctx.fillStyle = '#171717';
    ctx.fillRect(margem, margem * 0.72, largura - margem * 2, Math.max(2, base * 0.003));
    ctx.fillRect(margem, altura - margem * 0.72, largura - margem * 2, Math.max(2, base * 0.003));
  } else {
    ctx.fillStyle = '#fff5f8';
    ctx.fillRect(0, 0, largura, altura);
    ctx.fillStyle = '#c06078';
    ctx.beginPath();
    ctx.arc(largura * 0.5, -altura * 0.10, base * 0.43, 0, Math.PI * 2);
    ctx.fill();
    desenharConfetes(ctx, largura, altura);
  }

  const tinta = estilo === 'clean' ? '#171717' : '#40232c';
  const suave = estilo === 'clean' ? '#525252' : '#7c5560';
  const acento = estilo === 'clean' ? '#171717' : '#a04a63';

  // Marca pequena.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = estilo === 'festa' ? '#fff7fa' : acento;
  ctx.font = `600 ${Math.round(base * 0.032)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('MEMÓRIAS DO EVENTO', centroX, vertical ? altura * 0.10 : altura * 0.11);

  // Nome do evento.
  const tituloY = vertical ? altura * 0.19 : altura * 0.22;
  ctx.fillStyle = estilo === 'festa' && tituloY < altura * 0.28 ? '#ffffff' : tinta;
  ctx.font = `${estilo === 'elegante' ? '600' : '700'} ${Math.round(base * (vertical ? 0.067 : 0.058))}px ${estilo === 'elegante' ? 'Georgia, Times New Roman, serif' : 'Arial, Helvetica, sans-serif'}`;
  const linhasTitulo = linhasDoTexto(ctx, titulo, largura - margem * 2.3, 2);
  const passoTitulo = base * (vertical ? 0.078 : 0.068);
  linhasTitulo.forEach((linha, i) => ctx.fillText(linha, centroX, tituloY + i * passoTitulo));

  const tituloFinalY = tituloY + Math.max(0, linhasTitulo.length - 1) * passoTitulo;

  // Texto principal do usuário.
  const corpoY = vertical ? Math.max(altura * 0.30, tituloFinalY + base * 0.11) : altura * 0.41;
  ctx.fillStyle = suave;
  ctx.font = `400 ${Math.round(base * (vertical ? 0.035 : 0.030))}px Arial, Helvetica, sans-serif`;
  const larguraTexto = vertical ? largura - margem * 2.35 : largura * 0.43;
  const linhas = linhasDoTexto(ctx, texto, larguraTexto, vertical ? 6 : 5);
  const passo = base * (vertical ? 0.052 : 0.044);

  if (vertical) {
    linhas.forEach((linha, i) => ctx.fillText(linha, centroX, corpoY + i * passo));
  } else {
    const textoX = largura * 0.28;
    linhas.forEach((linha, i) => ctx.fillText(linha, textoX, corpoY + i * passo));
  }

  const qrImg = await carregarImagem(qrDataUrl);
  const qrTam = base * (vertical ? 0.43 : 0.47);
  const qrX = vertical ? centroX - qrTam / 2 : largura * 0.72 - qrTam / 2;
  const qrY = vertical
    ? Math.min(altura * 0.73 - qrTam / 2, corpoY + linhas.length * passo + base * 0.075)
    : altura * 0.52 - qrTam / 2;

  // Cartão branco atrás do QR para manter leitura em qualquer estilo.
  const qrPad = base * 0.033;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(64,35,44,0.12)';
  ctx.shadowBlur = base * 0.018;
  ctx.shadowOffsetY = base * 0.007;
  arredondado(ctx, qrX - qrPad, qrY - qrPad, qrTam + qrPad * 2, qrTam + qrPad * 2, base * 0.025);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(qrImg, qrX, qrY, qrTam, qrTam);

  const dicaY = vertical ? qrY + qrTam + base * 0.075 : altura * 0.80;
  ctx.fillStyle = acento;
  ctx.font = `700 ${Math.round(base * 0.030)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('APONTE A CÂMERA E PARTICIPE', vertical ? centroX : largura * 0.72, dicaY);

  ctx.fillStyle = suave;
  ctx.font = `400 ${Math.round(base * 0.022)}px Arial, Helvetica, sans-serif`;
  const linkCurto = urlMemorias.replace(/^https?:\/\//, '').replace(/\/$/, '');
  ctx.fillText(linkCurto, vertical ? centroX : largura * 0.72, dicaY + base * 0.045);

  return canvas;
}

export default function MateriaisMemorias({
  titulo,
  urlMemorias,
  qrDataUrl,
}: {
  titulo: string;
  urlMemorias: string;
  qrDataUrl: string;
}) {
  const [formatoId, setFormatoId] = useState<FormatoId>('a5-vertical');
  const [estilo, setEstilo] = useState<EstiloId>('elegante');
  const [texto, setTexto] = useState(TEXTO_SUGERIDO);
  const [previa, setPrevia] = useState('');
  const [gerando, setGerando] = useState<'previa' | 'png' | 'pdf' | ''>('');
  const [erro, setErro] = useState('');

  const formato = useMemo(
    () => FORMATOS.find((item) => item.id === formatoId) ?? FORMATOS[1],
    [formatoId],
  );

  useEffect(() => {
    if (!qrDataUrl) return;
    let cancelado = false;
    const timer = window.setTimeout(async () => {
      setGerando('previa');
      try {
        const canvas = await renderizarMaterial({
          formato,
          estilo,
          titulo,
          texto: texto.trim() || TEXTO_SUGERIDO,
          qrDataUrl,
          urlMemorias,
          dpi: 82,
        });
        if (!cancelado) setPrevia(canvas.toDataURL('image/png', 0.92));
      } catch (e: any) {
        if (!cancelado) setErro(e?.message || 'Não foi possível atualizar a prévia.');
      } finally {
        if (!cancelado) setGerando('');
      }
    }, 180);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [formato, estilo, titulo, texto, qrDataUrl, urlMemorias]);

  async function montarAlta() {
    if (!qrDataUrl) throw new Error('O QR Code ainda está sendo preparado.');
    return renderizarMaterial({
      formato,
      estilo,
      titulo,
      texto: texto.trim() || TEXTO_SUGERIDO,
      qrDataUrl,
      urlMemorias,
      dpi: 300,
    });
  }

  async function baixarPng() {
    if (gerando) return;
    setGerando('png'); setErro('');
    try {
      const canvas = await montarAlta();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Não foi possível criar o PNG.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plaquinha-Memorias-${nomeSeguro(titulo)}-${formato.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível baixar o PNG.');
    } finally {
      setGerando('');
    }
  }

  async function baixarPdf() {
    if (gerando) return;
    setGerando('pdf'); setErro('');
    try {
      const canvas = await montarAlta();
      const png = canvas.toDataURL('image/png', 1);
      const orientacao = formato.larguraMm > formato.alturaMm ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation: orientacao,
        unit: 'mm',
        format: [formato.larguraMm, formato.alturaMm],
        compress: true,
      });
      pdf.addImage(png, 'PNG', 0, 0, formato.larguraMm, formato.alturaMm, undefined, 'FAST');
      pdf.save(`Plaquinha-Memorias-${nomeSeguro(titulo)}-${formato.id}.pdf`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível baixar o PDF.');
    } finally {
      setGerando('');
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#c0607830' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold" style={{ color: '#40232c' }}>Materiais para imprimir</p>
          <p className="mt-1 text-xs" style={{ color: '#7c5560' }}>
            Monte uma plaquinha pronta com o QR das Memórias. O PNG sai em alta resolução e o PDF já no tamanho escolhido.
          </p>
        </div>
        <span className="rounded-full bg-[#fff5f8] px-3 py-1 text-[11px] font-semibold text-[#a04a63]">300 DPI</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c5560' }}>
              Tamanho
            </label>
            <select
              value={formatoId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormatoId(e.target.value as FormatoId)}
              className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: '#c0607840', color: '#40232c' }}
            >
              {FORMATOS.map((item) => (
                <option key={item.id} value={item.id}>{item.nome} — {item.detalhe}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c5560' }}>Estilo</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {ESTILOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEstilo(item.id)}
                  className="rounded-xl border px-3 py-2.5 text-left transition"
                  style={{
                    borderColor: estilo === item.id ? '#c06078' : '#c0607830',
                    background: estilo === item.id ? '#fff5f8' : '#fff',
                    color: '#40232c',
                  }}
                >
                  <span className="block text-sm font-semibold">{item.nome}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug" style={{ color: '#7c5560' }}>{item.detalhe}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor={`texto-memorias-${formatoId}`} className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c5560' }}>
                Texto da plaquinha
              </label>
              <button
                type="button"
                onClick={() => setTexto(TEXTO_SUGERIDO)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: '#a04a63' }}
              >
                <RotateCcw className="h-3 w-3" /> Usar sugestão
              </button>
            </div>
            <textarea
              id={`texto-memorias-${formatoId}`}
              value={texto}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTexto(e.target.value.slice(0, 260))}
              rows={4}
              className="w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm leading-relaxed outline-none"
              style={{ borderColor: '#c0607840', color: '#40232c' }}
              placeholder="Escreva a mensagem que seus convidados verão..."
            />
            <p className="mt-1 text-right text-[10px]" style={{ color: '#9b7b84' }}>{texto.length}/260</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void baixarPng()}
              disabled={!!gerando || !qrDataUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {gerando === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Baixar arte em PNG
            </button>
            <button
              type="button"
              onClick={() => void baixarPdf()}
              disabled={!!gerando || !qrDataUrl}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: '#c0607850', color: '#a04a63' }}
            >
              {gerando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Baixar PDF para imprimir
            </button>
          </div>

          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c5560' }}>Prévia</p>
          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border bg-[#f6f2f3] p-3" style={{ borderColor: '#c0607830' }}>
            {previa ? (
              <img src={previa} alt="Prévia da plaquinha das Memórias" className="max-h-[520px] max-w-full rounded-lg object-contain shadow-sm" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-xs" style={{ color: '#7c5560' }}>
                <Loader2 className="h-5 w-5 animate-spin text-[#c06078]" />
                Preparando a prévia…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff9fb] px-3 py-2.5 text-xs" style={{ color: '#7c5560' }}>
        <Download className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#a04a63]" />
        <span>Se preferir criar sua própria arte, use o botão <strong>Baixar QR em PNG</strong> logo acima. A plaquinha pronta e o QR puro apontam para o mesmo endereço.</span>
      </div>
    </div>
  );
}
