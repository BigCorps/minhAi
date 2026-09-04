'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ORNAMENTOS_ASSETS } from '@/lib/conviteria/ornamentos';

type FormatoId = 'a4-vertical' | 'a5-vertical' | '10x15' | '15x21' | 'a4-horizontal';
type PaletaId = 'rose' | 'sage' | 'noite';

type Formato = {
  id: FormatoId;
  nome: string;
  detalhe: string;
  larguraMm: number;
  alturaMm: number;
};

type Paleta = {
  id: PaletaId;
  nome: string;
  fundo: string;
  papelQr: string;
  tinta: string;
  suave: string;
  acento: string;
  detalhe: string;
};

const FORMATOS: Formato[] = [
  { id: 'a4-vertical', nome: 'A4 vertical', detalhe: '21 × 29,7 cm', larguraMm: 210, alturaMm: 297 },
  { id: 'a5-vertical', nome: 'A5 vertical', detalhe: '14,8 × 21 cm', larguraMm: 148, alturaMm: 210 },
  { id: '10x15', nome: '10 × 15 cm', detalhe: 'porta-retrato / mesa', larguraMm: 100, alturaMm: 150 },
  { id: '15x21', nome: '15 × 21 cm', detalhe: 'plaquinha de mesa', larguraMm: 150, alturaMm: 210 },
  { id: 'a4-horizontal', nome: 'A4 horizontal', detalhe: '29,7 × 21 cm', larguraMm: 297, alturaMm: 210 },
];

const PALETAS: Paleta[] = [
  { id: 'rose', nome: 'Rosé clássico', fundo: '#fffaf8', papelQr: '#ffffff', tinta: '#40232c', suave: '#7c5560', acento: '#b75d78', detalhe: '#e8bdc9' },
  { id: 'sage', nome: 'Sálvia & creme', fundo: '#fbfaf5', papelQr: '#ffffff', tinta: '#3f4436', suave: '#66705a', acento: '#7d8b6a', detalhe: '#cdd0bb' },
  { id: 'noite', nome: 'Noite elegante', fundo: '#171416', papelQr: '#fffdf8', tinta: '#fff8ec', suave: '#d3c7b7', acento: '#c9a86a', detalhe: '#66553a' },
];

const ORNAMENTOS = ORNAMENTOS_ASSETS;

const TITULO_SUGERIDO = 'Compartilhe suas memórias';
const TEXTO_SUGERIDO = 'Escaneie o QR Code e envie as fotos e vídeos que você fizer neste dia especial. Não precisa instalar nenhum aplicativo.';

function nomeSeguro(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'Evento';
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar o QR Code.'));
    img.src = src;
  });
}

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, raio: number) {
  const r = Math.min(raio, largura / 2, altura / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, r);
  ctx.arcTo(x + largura, y + altura, x, y + altura, r);
  ctx.arcTo(x, y + altura, x, y, r);
  ctx.arcTo(x, y, x + largura, y, r);
  ctx.closePath();
}

function linhasDoTexto(ctx: CanvasRenderingContext2D, texto: string, larguraMaxima: number, maxLinhas: number) {
  const resultado: string[] = [];
  const paragrafos = texto.replace(/\r/g, '').split('\n');
  for (const paragrafo of paragrafos) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean);
    if (!palavras.length) { if (resultado.length < maxLinhas) resultado.push(''); continue; }
    let linha = '';
    for (const palavra of palavras) {
      const teste = linha ? `${linha} ${palavra}` : palavra;
      if (ctx.measureText(teste).width <= larguraMaxima || !linha) linha = teste;
      else { resultado.push(linha); linha = palavra; if (resultado.length >= maxLinhas) break; }
    }
    if (resultado.length >= maxLinhas) break;
    if (linha) resultado.push(linha);
  }
  if (resultado.length > maxLinhas) resultado.length = maxLinhas;
  return resultado;
}

function path(ctx: CanvasRenderingContext2D, d: string, cor: string, largura = 1.2, alpha = 0.65) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

function folha(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, cor: string, alpha = 0.65) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot * Math.PI / 180);
  ctx.fillStyle = cor; ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function rosa(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, paleta: Paleta) {
  ctx.save();
  ctx.translate(x, y);
  for (let camada = 0; camada < 3; camada++) {
    const n = 7 - camada;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + camada * 0.35;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = camada === 0 ? paleta.detalhe : paleta.acento;
      ctx.globalAlpha = camada === 0 ? 0.58 : 0.42 + camada * 0.12;
      ctx.beginPath();
      ctx.ellipse(0, -r * (0.42 - camada * 0.05), r * (0.22 - camada * 0.025), r * (0.48 - camada * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = paleta.acento; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function desenharOrnamentoBase(ctx: CanvasRenderingContext2D, id: string, paleta: Paleta) {
  const a = paleta.acento;
  const d = paleta.detalhe;
  if (id === 'casamento-original') {
    path(ctx, 'M4 118 C40 112 66 92 84 62 C96 42 104 24 106 6', a, 1.35, .62);
    path(ctx, 'M2 74 C30 70 52 54 64 30 C70 18 74 10 76 2', a, 1, .38);
    [ [22,108,-30], [43,98,-42], [65,78,-52], [86,50,-65], [98,27,-72] ].forEach(([x,y,r]) => folha(ctx,x,y,5.5,11,r,d,.62));
    rosa(ctx, 34, 38, 25, paleta); rosa(ctx, 75, 82, 18, paleta); rosa(ctx, 16, 92, 13, paleta);
  } else if (id === 'alta-costura') {
    path(ctx, 'M8 104 C27 94 38 72 41 48 C44 25 57 12 78 8', a, 1.1, .62);
    path(ctx, 'M18 108 C44 92 58 67 61 39 C63 23 74 14 98 8', a, .75, .3);
    path(ctx, 'M34 75 C41 59 50 49 64 42 C74 37 82 28 86 16', a, .9, .55);
    folha(ctx, 58, 34, 8, 14, 28, d, .6); folha(ctx, 82, 22, 6, 11, 44, a, .45);
    [32,48,68,87].forEach((v,i)=>{ ctx.save(); ctx.fillStyle=a; ctx.globalAlpha=.6; ctx.beginPath(); ctx.arc(v,95-i*23,i===1?2.8:2,0,Math.PI*2); ctx.fill(); ctx.restore(); });
  } else if (id === 'imperial') {
    path(ctx, 'M9 104 C18 82 23 59 20 40 C19 27 27 19 39 22 C51 25 50 41 39 43 C30 45 27 35 33 31 M20 61 C39 58 54 45 59 27 C63 14 75 9 87 13 C101 18 99 35 88 38 C77 41 73 29 80 24', a, 1.25, .72);
    path(ctx, 'M18 92 C40 84 58 72 73 55', a, .85, .4);
    folha(ctx, 60, 60, 10, 18, 42, d, .52);
    ctx.save(); ctx.translate(63,28); ctx.rotate(Math.PI/4); ctx.fillStyle=a; ctx.globalAlpha=.6; ctx.fillRect(-6,-6,12,12); ctx.restore();
  } else if (id === 'art-deco') {
    path(ctx, 'M10 104 L10 56 L56 10 M21 104 L21 63 L63 21 M33 104 L33 71 L71 33 M13 70 L42 70 L70 42 L70 13', a, 1.15, .62);
    ctx.save(); ctx.translate(65,52); ctx.rotate(Math.PI/4); ctx.fillStyle=d; ctx.globalAlpha=.65; ctx.fillRect(-9,-9,18,18); ctx.restore();
  } else if (id === 'organico-chic') {
    path(ctx, 'M-3 94 C23 70 20 43 47 26 C64 15 77 12 101 4', a, 1.2, .55);
    path(ctx, 'M8 113 C37 91 47 70 49 45 C51 24 67 17 92 15', a, .8, .3);
    folha(ctx, 26, 67, 12, 17, -42, d, .55); folha(ctx, 57, 42, 10, 14, 35, a, .45); folha(ctx, 80, 20, 7, 11, 50, d, .5);
  } else if (id === 'radical') {
    path(ctx, 'M8 103 L31 73 L23 66 L56 31 L48 23 L83 8', a, 2, .72);
    path(ctx, 'M17 108 L45 76 L37 68 L73 34', a, .8, .35);
    path(ctx, 'M34 88 L47 65 L57 70 L69 48 L77 53 L91 29', d, 3.1, .55);
    ctx.save(); ctx.fillStyle=a; ctx.globalAlpha=.7; ctx.beginPath(); ctx.arc(87,20,4.2,0,Math.PI*2); ctx.fill(); ctx.restore();
  } else if (id === 'geometrico') {
    path(ctx, 'M8 72 L38 18 L64 64 L92 12', a, 1.45, .68);
    ctx.save(); ctx.fillStyle=d; ctx.globalAlpha=.75; ctx.beginPath(); ctx.arc(38,18,5,0,Math.PI*2); ctx.fill(); ctx.fillStyle=a; ctx.beginPath(); ctx.arc(64,64,4,0,Math.PI*2); ctx.fill(); ctx.restore();
  } else if (id === 'minimal') {
    path(ctx, 'M12 62 C34 44 45 26 56 8 M24 74 C47 61 67 43 84 18', a, 1.2, .48);
  } else if (id === 'festivo') {
    path(ctx, 'M12 30 Q32 55 54 26 T98 28', a, 1.35, .58);
    [20,38,58,78,96].forEach((x,i)=>{ ctx.save(); ctx.fillStyle=i%2?d:a; ctx.globalAlpha=.72; ctx.beginPath(); ctx.arc(x,28+(i%2)*11,3+(i%3),0,Math.PI*2); ctx.fill(); ctx.restore(); });
  } else if (id === 'classico') {
    path(ctx, 'M10 82 C26 31 66 26 74 8 C76 36 58 53 30 61 C54 62 78 49 98 27', a, 1.35, .68);
    path(ctx, 'M29 60 C20 50 20 40 28 34 M51 48 C43 37 45 27 54 21', a, 1, .45);
  } else if (id === 'rustico') {
    path(ctx, 'M8 88 C31 59 51 43 90 18', a, 1.35, .62);
    [[26,74,-35],[42,61,-35],[58,48,-35],[73,35,-35]].forEach(([x,y,r])=>folha(ctx,x,y,9,4.5,r,d,.72));
  } else {
    path(ctx, 'M10 92 C31 66 42 45 72 20', a, 1.3, .62);
    folha(ctx,38,63,10,5,-38,d,.72); folha(ctx,56,45,10,5,25,d,.72);
    ctx.save(); ctx.fillStyle=a; ctx.globalAlpha=.64; ctx.beginPath(); ctx.arc(74,20,11,0,Math.PI*2); ctx.fill(); ctx.fillStyle=paleta.fundo; ctx.globalAlpha=.9; ctx.beginPath(); ctx.arc(74,20,5,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function desenharCanto(ctx: CanvasRenderingContext2D, id: string, paleta: Paleta, x: number, y: number, tamanho: number, flipX = false, flipY = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((flipX ? -1 : 1) * tamanho / 120, (flipY ? -1 : 1) * tamanho / 120);
  desenharOrnamentoBase(ctx, id, paleta);
  ctx.restore();
}

function desenharDivisor(ctx: CanvasRenderingContext2D, id: string, paleta: Paleta, x: number, y: number, largura: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = paleta.acento; ctx.fillStyle = paleta.acento; ctx.lineWidth = Math.max(1, largura * .005); ctx.globalAlpha = .55;
  ctx.beginPath(); ctx.moveTo(-largura / 2, 0); ctx.lineTo(-largura * .12, 0); ctx.moveTo(largura * .12, 0); ctx.lineTo(largura / 2, 0); ctx.stroke();
  if (id === 'art-deco') {
    ctx.rotate(Math.PI/4); ctx.fillRect(-largura*.025,-largura*.025,largura*.05,largura*.05);
  } else if (id === 'casamento-original' || id === 'floral') {
    ctx.beginPath(); ctx.arc(0,0,largura*.035,0,Math.PI*2); ctx.fill();
    folha(ctx,-largura*.055,0,largura*.025,largura*.012,-25,paleta.detalhe,.8); folha(ctx,largura*.055,0,largura*.025,largura*.012,25,paleta.detalhe,.8);
  } else {
    ctx.beginPath(); ctx.arc(0,0,largura*.018,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

async function renderizarMaterial({ formato, paleta, ornamentoId, tituloEvento, tituloChamada, texto, qrDataUrl, urlMemorias, dpi }: {
  formato: Formato; paleta: Paleta; ornamentoId: string; tituloEvento: string; tituloChamada: string; texto: string; qrDataUrl: string; urlMemorias: string; dpi: number;
}) {
  const pxPorMm = dpi / 25.4;
  const largura = Math.round(formato.larguraMm * pxPorMm);
  const altura = Math.round(formato.alturaMm * pxPorMm);
  const canvas = document.createElement('canvas');
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu montar a arte.');

  const vertical = altura >= largura;
  const base = Math.min(largura, altura);
  const margem = base * .07;
  const ornTam = base * (vertical ? .31 : .27);
  ctx.fillStyle = paleta.fundo; ctx.fillRect(0, 0, largura, altura);

  // Moldura dupla bem leve para a peça já parecer material gráfico acabado.
  ctx.strokeStyle = paleta.acento; ctx.lineWidth = Math.max(2, base*.003); ctx.globalAlpha = .58;
  arredondado(ctx, margem*.48, margem*.48, largura-margem*.96, altura-margem*.96, base*.025); ctx.stroke();
  ctx.strokeStyle = paleta.detalhe; ctx.lineWidth = Math.max(1, base*.0014); ctx.globalAlpha = .62;
  arredondado(ctx, margem*.72, margem*.72, largura-margem*1.44, altura-margem*1.44, base*.018); ctx.stroke();
  ctx.globalAlpha = 1;

  desenharCanto(ctx, ornamentoId, paleta, margem*.45, margem*.45, ornTam, false, false);
  desenharCanto(ctx, ornamentoId, paleta, largura-margem*.45, altura-margem*.45, ornTam, true, true);

  const qr = await carregarImagem(qrDataUrl);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (vertical) {
    const centroX = largura/2;
    ctx.fillStyle = paleta.tinta;
    ctx.font = `600 ${Math.round(base*.072)}px Georgia, serif`;
    const tituloLinhas = linhasDoTexto(ctx, tituloChamada.trim() || TITULO_SUGERIDO, largura-margem*2.3, 2);
    const tituloY = altura*.18 - (tituloLinhas.length-1)*base*.045;
    tituloLinhas.forEach((l,i)=>ctx.fillText(l,centroX,tituloY+i*base*.09));

    desenharDivisor(ctx, ornamentoId, paleta, centroX, altura*.285, base*.34);

    ctx.fillStyle = paleta.suave;
    ctx.font = `400 ${Math.round(base*.032)}px Arial, sans-serif`;
    const corpo = linhasDoTexto(ctx, texto.trim() || TEXTO_SUGERIDO, largura-margem*2.6, 5);
    corpo.forEach((l,i)=>ctx.fillText(l,centroX,altura*.34+i*base*.047));

    const qrTam = Math.min(base*.46, altura*.34);
    const qrX = centroX-qrTam/2; const qrY = altura*.50;
    ctx.fillStyle = paleta.papelQr; ctx.shadowColor='rgba(0,0,0,.12)'; ctx.shadowBlur=base*.018; ctx.shadowOffsetY=base*.008;
    arredondado(ctx,qrX-base*.025,qrY-base*.025,qrTam+base*.05,qrTam+base*.05,base*.022); ctx.fill();
    ctx.shadowColor='transparent'; ctx.drawImage(qr,qrX,qrY,qrTam,qrTam);

    ctx.fillStyle = paleta.suave; ctx.font = `500 ${Math.round(base*.021)}px Arial, sans-serif`;
    ctx.fillText('Aponte a câmera para o QR Code',centroX,qrY+qrTam+base*.065);
    ctx.font = `400 ${Math.round(base*.017)}px Arial, sans-serif`;
    const urlCurta = urlMemorias.replace(/^https?:\/\//,'');
    ctx.fillText(urlCurta,centroX,qrY+qrTam+base*.105);

    ctx.fillStyle = paleta.tinta; ctx.font = `600 ${Math.round(base*.03)}px Georgia, serif`;
    const eventoLinhas = linhasDoTexto(ctx,tituloEvento,largura-margem*2.5,2);
    const eventoY = altura*.91-(eventoLinhas.length-1)*base*.02;
    eventoLinhas.forEach((l,i)=>ctx.fillText(l,centroX,eventoY+i*base*.042));
  } else {
    const esquerda = largura*.34; const direita = largura*.72;
    ctx.fillStyle=paleta.tinta; ctx.font=`600 ${Math.round(base*.072)}px Georgia, serif`;
    const tituloLinhas=linhasDoTexto(ctx,tituloChamada.trim()||TITULO_SUGERIDO,largura*.46,3);
    tituloLinhas.forEach((l,i)=>ctx.fillText(l,esquerda,altura*.27+i*base*.085));
    desenharDivisor(ctx,ornamentoId,paleta,esquerda,altura*.48,base*.28);
    ctx.fillStyle=paleta.suave; ctx.font=`400 ${Math.round(base*.031)}px Arial, sans-serif`;
    const corpo=linhasDoTexto(ctx,texto.trim()||TEXTO_SUGERIDO,largura*.43,5);
    corpo.forEach((l,i)=>ctx.fillText(l,esquerda,altura*.57+i*base*.045));
    ctx.fillStyle=paleta.tinta; ctx.font=`600 ${Math.round(base*.026)}px Georgia, serif`; ctx.fillText(tituloEvento,esquerda,altura*.84);

    const qrTam=base*.48; const qrX=direita-qrTam/2; const qrY=altura*.5-qrTam/2;
    ctx.fillStyle=paleta.papelQr; ctx.shadowColor='rgba(0,0,0,.14)'; ctx.shadowBlur=base*.018; ctx.shadowOffsetY=base*.008;
    arredondado(ctx,qrX-base*.025,qrY-base*.025,qrTam+base*.05,qrTam+base*.05,base*.022); ctx.fill(); ctx.shadowColor='transparent';
    ctx.drawImage(qr,qrX,qrY,qrTam,qrTam);
    ctx.fillStyle=paleta.suave; ctx.font=`500 ${Math.round(base*.02)}px Arial, sans-serif`; ctx.fillText('Escaneie e envie agora',direita,qrY+qrTam+base*.06);
    ctx.font=`400 ${Math.round(base*.015)}px Arial, sans-serif`; ctx.fillText(urlMemorias.replace(/^https?:\/\//,''),direita,qrY+qrTam+base*.095);
  }
  return canvas;
}

export default function MateriaisMemorias({ titulo, urlMemorias, qrDataUrl, ornamentoInicial }: { titulo: string; urlMemorias: string; qrDataUrl: string; ornamentoInicial?: string }) {
  const [formatoId,setFormatoId]=useState<FormatoId>('a5-vertical');
  const [paletaId,setPaletaId]=useState<PaletaId>('rose');
  const inicial = ORNAMENTOS.some((o)=>o.id===ornamentoInicial) ? ornamentoInicial! : 'casamento-original';
  const [ornamentoId,setOrnamentoId]=useState(inicial);
  const [tituloChamada,setTituloChamada]=useState(TITULO_SUGERIDO);
  const [texto,setTexto]=useState(TEXTO_SUGERIDO);
  const [preview,setPreview]=useState('');
  const [gerando,setGerando]=useState<'preview'|'png'|'pdf'|null>(null);
  const [erro,setErro]=useState('');

  const formato=useMemo(()=>FORMATOS.find((f)=>f.id===formatoId)!,[formatoId]);
  const paleta=useMemo(()=>PALETAS.find((p)=>p.id===paletaId)!,[paletaId]);

  useEffect(()=>{
    let cancelado=false;
    setGerando('preview'); setErro('');
    const id=window.setTimeout(()=>{
      void renderizarMaterial({formato,paleta,ornamentoId,tituloEvento:titulo,tituloChamada,texto,qrDataUrl,urlMemorias,dpi:105})
        .then((canvas)=>{ if(!cancelado) setPreview(canvas.toDataURL('image/png')); })
        .catch((e)=>{ if(!cancelado) setErro(e?.message||'Não foi possível montar a prévia.'); })
        .finally(()=>{ if(!cancelado) setGerando(null); });
    },180);
    return()=>{cancelado=true;window.clearTimeout(id);};
  },[formato,paleta,ornamentoId,titulo,tituloChamada,texto,qrDataUrl,urlMemorias]);

  async function gerar(tipo:'png'|'pdf'){
    setGerando(tipo);setErro('');
    try{
      const canvas=await renderizarMaterial({formato,paleta,ornamentoId,tituloEvento:titulo,tituloChamada,texto,qrDataUrl,urlMemorias,dpi:300});
      const data=canvas.toDataURL('image/png');
      const base=`Plaquinha-Memorias-${nomeSeguro(titulo)}-${formato.id}`;
      if(tipo==='png'){
        const a=document.createElement('a');a.href=data;a.download=`${base}.png`;a.click();
      }else{
        const orientacao=formato.larguraMm>formato.alturaMm?'landscape':'portrait';
        const pdf=new jsPDF({orientation:orientacao,unit:'mm',format:[formato.larguraMm,formato.alturaMm],compress:true});
        pdf.addImage(data,'PNG',0,0,formato.larguraMm,formato.alturaMm,undefined,'FAST');
        pdf.save(`${base}.pdf`);
      }
    }catch(e:any){setErro(e?.message||'Não foi possível gerar o material.');}
    finally{setGerando(null);}
  }

  function restaurar(){setTituloChamada(TITULO_SUGERIDO);setTexto(TEXTO_SUGERIDO);setPaletaId('rose');setOrnamentoId(inicial);}

  return <div className="rounded-2xl border bg-white p-4" style={{borderColor:'#c0607830'}}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="flex items-center gap-2 font-semibold text-[#40232c]"><Sparkles className="h-4 w-4 text-[#a04a63]"/>Materiais para imprimir</p><p className="mt-1 text-xs text-[#7c5560]">Escolha um ornamento do ConviteIA, personalize o texto e baixe a plaquinha pronta.</p></div>
      <button type="button" onClick={restaurar} className="inline-flex items-center gap-1 rounded-full bg-[#fff5f8] px-3 py-2 text-xs font-semibold text-[#a04a63]"><RotateCcw className="h-3.5 w-3.5"/>Restaurar sugestão</button>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#69434f]">Tamanho<select value={formatoId} onChange={(e)=>setFormatoId(e.target.value as FormatoId)} className="mt-1.5 w-full rounded-xl border border-[#c0607835] bg-white px-3 py-2.5 text-sm font-normal text-[#40232c]">{FORMATOS.map((f)=><option key={f.id} value={f.id}>{f.nome} — {f.detalhe}</option>)}</select></label>
          <label className="text-xs font-semibold text-[#69434f]">Cores<select value={paletaId} onChange={(e)=>setPaletaId(e.target.value as PaletaId)} className="mt-1.5 w-full rounded-xl border border-[#c0607835] bg-white px-3 py-2.5 text-sm font-normal text-[#40232c]">{PALETAS.map((p)=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        </div>

        <label className="block text-xs font-semibold text-[#69434f]">Arabesco / ornamento<select value={ornamentoId} onChange={(e)=>setOrnamentoId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#c0607835] bg-white px-3 py-2.5 text-sm font-normal text-[#40232c]">{ORNAMENTOS.map((o)=><option key={o.id} value={o.id}>{o.nome} — {o.descricao}</option>)}</select><span className="mt-1 block font-normal text-[#8b6872]">Quando possível, abrimos já com o ornamento usado no próprio convite.</span></label>

        <label className="block text-xs font-semibold text-[#69434f]">Título<input value={tituloChamada} onChange={(e)=>setTituloChamada(e.target.value)} maxLength={70} className="mt-1.5 w-full rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal text-[#40232c]"/></label>
        <label className="block text-xs font-semibold text-[#69434f]">Mensagem<textarea value={texto} onChange={(e)=>setTexto(e.target.value)} maxLength={260} rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal leading-relaxed text-[#40232c]"/><span className="mt-1 block text-right font-normal text-[#9a7c84]">{texto.length}/260</span></label>

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(gerando)} onClick={()=>void gerar('png')} className="inline-flex items-center gap-2 rounded-full bg-[#c06078] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{gerando==='png'?<Loader2 className="h-4 w-4 animate-spin"/>:<ImageIcon className="h-4 w-4"/>}Baixar PNG 300 DPI</button>
          <button type="button" disabled={Boolean(gerando)} onClick={()=>void gerar('pdf')} className="inline-flex items-center gap-2 rounded-full border border-[#c0607845] px-4 py-2.5 text-sm font-semibold text-[#a04a63] disabled:opacity-50">{gerando==='pdf'?<Loader2 className="h-4 w-4 animate-spin"/>:<FileText className="h-4 w-4"/>}Baixar PDF</button>
        </div>
        {erro&&<p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}
      </div>

      <div className="rounded-2xl bg-[#f7f3f4] p-3">
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8b6872]">Prévia</p>
        <div className="grid min-h-64 place-items-center overflow-hidden rounded-xl bg-[#ded7d9] p-3">
          {preview?<img src={preview} alt="Prévia da plaquinha" className="max-h-[470px] max-w-full rounded-sm shadow-xl"/>:<Loader2 className="h-6 w-6 animate-spin text-[#a04a63]"/>}
        </div>
        <p className="mt-2 text-center text-[10px] text-[#8b6872]">A prévia é leve. O arquivo baixado é gerado em 300 DPI e no tamanho físico escolhido.</p>
      </div>
    </div>
  </div>;
}
