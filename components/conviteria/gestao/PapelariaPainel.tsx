'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Images,
  Loader2,
  Palette,
  QrCode,
  RotateCcw,
  Sparkles,
  TicketCheck,
  Type,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { ConviteConfig } from '@/lib/conviteria/tipos';
import { acharFonte } from '@/lib/conviteria/fontes';
import { acharTema } from '@/lib/conviteria/temas';
import {
  FORMATOS_PAPELARIA,
  MODELOS_PAPELARIA,
  PALETAS_PAPELARIA,
  PECAS_EVENTO,
  baixarCanvasPng,
  formatoPapelaria,
  nomeSeguro,
  renderizarArteCheckin,
  renderizarPecaEvento,
  type EstiloPapelaria,
  type FormatoPapelariaId,
  type PaletaPapelariaId,
  type PecaEventoId,
} from '@/lib/conviteria/papelaria-canvas';
import PapelariaMemorias from './PapelariaMemorias';

export type CategoriaPapelaria = 'evento' | 'checkin' | 'memorias';

type ConvidadoCheckin = {
  id: string;
  nome: string;
  familia_id?: string | null;
  qr_token: string;
  status: string;
};

type FamiliaCheckin = { id: string; nome: string; qr_token: string };
type AlvoQr = { id: string; nome: string; token: string; tipo: 'familia' | 'individual'; detalhe: string };

const CATEGORIAS: Array<{
  id: CategoriaPapelaria;
  nome: string;
  descricao: string;
  Icon: typeof Sparkles;
}> = [
  { id: 'evento', nome: 'Evento', descricao: 'Placas, mesas, menu e materiais gerais.', Icon: Sparkles },
  { id: 'checkin', nome: 'QR e check-in', descricao: 'Arte pronta com o QR de cada convidado ou família.', Icon: TicketCheck },
  { id: 'memorias', nome: 'Memórias', descricao: 'Plaquinhas para fotos, vídeos e desafios.', Icon: Images },
];

const CAMPO_CLARO = {
  backgroundColor: '#ffffff',
  color: '#40232c',
  WebkitTextFillColor: '#40232c',
  colorScheme: 'light',
} as const;

function downloadPdf(canvas: HTMLCanvasElement, formatoId: FormatoPapelariaId, nome: string) {
  const formato = formatoPapelaria(formatoId);
  const pdf = new jsPDF({
    orientation: formato.larguraMm > formato.alturaMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [formato.larguraMm, formato.alturaMm],
    compress: true,
  });
  pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, formato.larguraMm, formato.alturaMm, undefined, 'FAST');
  pdf.save(nome);
}

export default function PapelariaPainel({
  cfg,
  slug,
  eventoId,
  token,
  qrModo,
  categoriaInicial = 'evento',
}: {
  cfg: ConviteConfig;
  slug: string;
  eventoId: string;
  token: string;
  qrModo: 'familia' | 'individual';
  categoriaInicial?: CategoriaPapelaria;
}) {
  const tema = useMemo(() => acharTema(cfg.temaId), [cfg.temaId]);
  const fonte = useMemo(() => acharFonte(cfg.fonteId), [cfg.fonteId]);
  const modeloDoConvite = useMemo(() => {
    const desejado = cfg.ornamentoId || tema.ornamentoSugerido || 'floral';
    return MODELOS_PAPELARIA.some((m) => m.id === desejado) ? desejado : MODELOS_PAPELARIA[0].id;
  }, [cfg.ornamentoId, tema.ornamentoSugerido]);

  const [categoria, setCategoria] = useState<CategoriaPapelaria>(categoriaInicial);
  const [paletaId, setPaletaId] = useState<PaletaPapelariaId>('convite');
  const [ornamentoId, setOrnamentoId] = useState<string>(modeloDoConvite);

  const [peca, setPeca] = useState<PecaEventoId>('boas-vindas');
  const [formatoEvento, setFormatoEvento] = useState<FormatoPapelariaId>('a3');
  const [titulo, setTitulo] = useState('Sejam bem-vindos');
  const [texto, setTexto] = useState('Que alegria ter você conosco neste dia especial.');
  const [numero, setNumero] = useState('01');
  const [menu, setMenu] = useState('Entrada\nPrato principal\nSobremesa\nBebidas');
  const [previewEvento, setPreviewEvento] = useState('');

  const [pessoas, setPessoas] = useState<ConvidadoCheckin[]>([]);
  const [familias, setFamilias] = useState<FamiliaCheckin[]>([]);
  const [carregandoConvidados, setCarregandoConvidados] = useState(false);
  const [alvoId, setAlvoId] = useState('');
  const [formatoCheckin, setFormatoCheckin] = useState<FormatoPapelariaId>('10x15');
  const [previewCheckin, setPreviewCheckin] = useState('');
  const [gerando, setGerando] = useState<'evento' | 'checkin' | null>(null);
  const [erro, setErro] = useState('');

  const estilo = useMemo<EstiloPapelaria>(() => ({ paletaId, ornamentoId }), [paletaId, ornamentoId]);

  useEffect(() => { setCategoria(categoriaInicial); }, [categoriaInicial]);
  useEffect(() => { setOrnamentoId(modeloDoConvite); }, [modeloDoConvite]);

  useEffect(() => {
    const padrao = PECAS_EVENTO[peca].formato;
    setFormatoEvento(padrao);
    if (peca === 'boas-vindas') { setTitulo('Sejam bem-vindos'); setTexto('Que alegria ter você conosco neste dia especial.'); }
    if (peca === 'qr-convite') { setTitulo('Nosso convite'); setTexto(''); }
    if (peca === 'agradecimento') { setTitulo('Obrigado!'); setTexto('Obrigado por fazer parte deste momento especial.'); }
  }, [peca]);

  useEffect(() => {
    let cancelado = false;
    setErro('');
    const timer = window.setTimeout(() => {
      void renderizarPecaEvento({
        cfg,
        slug,
        peca,
        formato: formatoPapelaria(formatoEvento),
        titulo,
        texto,
        numero,
        menu,
        dpi: 105,
        estilo,
      })
        .then((canvas) => { if (!cancelado) setPreviewEvento(canvas.toDataURL('image/png')); })
        .catch((e) => { if (!cancelado) setErro(e?.message || 'Não foi possível montar a prévia.'); });
    }, 120);
    return () => { cancelado = true; window.clearTimeout(timer); };
  }, [cfg, slug, peca, formatoEvento, titulo, texto, numero, menu, estilo]);

  useEffect(() => {
    if (categoria !== 'checkin') return;
    let cancelado = false;
    setCarregandoConvidados(true);
    setErro('');
    void fetch(`/api/conviteria/gestao/checkin?eventoId=${encodeURIComponent(eventoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.erro || 'Não foi possível carregar os QR Codes do evento.');
        if (cancelado) return;
        setPessoas(d?.convidados ?? []);
        setFamilias(d?.familias ?? []);
      })
      .catch((e) => { if (!cancelado) setErro(e?.message || 'Não foi possível carregar os QR Codes do evento.'); })
      .finally(() => { if (!cancelado) setCarregandoConvidados(false); });
    return () => { cancelado = true; };
  }, [categoria, eventoId, token]);

  const alvos = useMemo<AlvoQr[]>(() => {
    if (qrModo === 'individual') {
      return pessoas.map((p) => ({ id: `p:${p.id}`, nome: p.nome, token: p.qr_token, tipo: 'individual', detalhe: 'Convidado individual' }));
    }

    const familiasComMembros = new Set(pessoas.map((p) => p.familia_id).filter(Boolean));
    const grupos: AlvoQr[] = familias
      .filter((f) => familiasComMembros.has(f.id))
      .map((f) => ({ id: `f:${f.id}`, nome: f.nome, token: f.qr_token, tipo: 'familia', detalhe: 'Família / grupo' }));
    const avulsos: AlvoQr[] = pessoas
      .filter((p) => !p.familia_id)
      .map((p) => ({ id: `p:${p.id}`, nome: p.nome, token: p.qr_token, tipo: 'individual', detalhe: 'Convidado individual' }));
    return [...grupos, ...avulsos];
  }, [pessoas, familias, qrModo]);

  const alvo = useMemo(() => alvos.find((a) => a.id === alvoId) ?? alvos[0] ?? null, [alvos, alvoId]);

  useEffect(() => {
    if (!alvo || alvoId) return;
    setAlvoId(alvo.id);
  }, [alvo, alvoId]);

  useEffect(() => {
    if (!alvo) { setPreviewCheckin(''); return; }
    let cancelado = false;
    setErro('');
    const timer = window.setTimeout(() => {
      void renderizarArteCheckin({
        cfg,
        slug,
        qrToken: alvo.token,
        nome: alvo.nome,
        formato: formatoPapelaria(formatoCheckin),
        dpi: 105,
        estilo,
      })
        .then((canvas) => { if (!cancelado) setPreviewCheckin(canvas.toDataURL('image/png')); })
        .catch((e) => { if (!cancelado) setErro(e?.message || 'Não foi possível montar a arte do check-in.'); });
    }, 100);
    return () => { cancelado = true; window.clearTimeout(timer); };
  }, [alvo, cfg, slug, formatoCheckin, estilo]);

  function restaurarVisualConvite() {
    setPaletaId('convite');
    setOrnamentoId(modeloDoConvite);
  }

  async function baixarEvento(tipo: 'png' | 'pdf') {
    setGerando('evento'); setErro('');
    try {
      const canvas = await renderizarPecaEvento({
        cfg,
        slug,
        peca,
        formato: formatoPapelaria(formatoEvento),
        titulo,
        texto,
        numero,
        menu,
        dpi: 300,
        estilo,
      });
      const base = `Papelaria-${nomeSeguro(PECAS_EVENTO[peca].nome)}-${nomeSeguro(cfg.anfitrioes.exibicao)}-${formatoEvento}`;
      if (tipo === 'png') baixarCanvasPng(canvas, `${base}.png`);
      else downloadPdf(canvas, formatoEvento, `${base}.pdf`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar o material.');
    } finally { setGerando(null); }
  }

  async function baixarCheckin(tipo: 'png' | 'pdf') {
    if (!alvo) return;
    setGerando('checkin'); setErro('');
    try {
      const canvas = await renderizarArteCheckin({
        cfg,
        slug,
        qrToken: alvo.token,
        nome: alvo.nome,
        formato: formatoPapelaria(formatoCheckin),
        dpi: 300,
        estilo,
      });
      const base = `Check-in-${nomeSeguro(alvo.nome)}-${formatoCheckin}`;
      if (tipo === 'png') baixarCanvasPng(canvas, `${base}.png`);
      else downloadPdf(canvas, formatoCheckin, `${base}.pdf`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar a arte de check-in.');
    } finally { setGerando(null); }
  }

  async function baixarQrPuro() {
    if (!alvo) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const src = await QRCode.toDataURL(`https://${slug}.conviteia.com/entrada/${alvo.token}`, { width: 1200, margin: 2, errorCorrectionLevel: 'H' });
      const a = document.createElement('a');
      a.href = src;
      a.download = `QR-check-in-${nomeSeguro(alvo.nome)}.png`;
      a.click();
    } catch { setErro('Não foi possível baixar somente o QR Code.'); }
  }

  const controlesEstilo = (
    <div className="rounded-2xl border border-[#c0607825] bg-[#fff9fb] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#40232c]"><Palette className="h-4 w-4 text-[#a04a63]" />Modelo e cores</p>
          <p className="mt-1 text-xs leading-5 text-[#7c5560]">Mesmo padrão da Papelaria de Memórias: escolha o acabamento visual sem perder a identidade tipográfica do convite.</p>
        </div>
        <button type="button" onClick={restaurarVisualConvite} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#c0607830] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#a04a63]"><RotateCcw className="h-3.5 w-3.5" />Convite</button>
      </div>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Modelo / ornamento
          <select value={ornamentoId} onChange={(e) => setOrnamentoId(e.target.value)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
            {MODELOS_PAPELARIA.map((m) => <option key={m.id} value={m.id}>{m.nome} — {m.descricao}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Cores
          <select value={paletaId} onChange={(e) => setPaletaId(e.target.value as PaletaPapelariaId)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
            {PALETAS_PAPELARIA.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <span className="font-normal text-[#9b7b84]">{PALETAS_PAPELARIA.find((p) => p.id === paletaId)?.descricao}</span>
        </label>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-[#7c5560]">
        <Type className="mt-0.5 h-4 w-4 shrink-0 text-[#a04a63]" />
        <span><strong className="text-[#40232c]">Tipografia: {fonte.nome}</strong><br />A fonte de destaque e a fonte de leitura são as mesmas do convite. Elas são carregadas antes da prévia e antes do arquivo em 300 DPI, evitando o fallback parecido com Comic Sans.</span>
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl border border-[#c0607830] bg-white">
        <div className="bg-[linear-gradient(135deg,#fff9fb_0%,#fff2f6_55%,#fdf8f2_100%)] px-5 py-6 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#a04a63] shadow-sm"><Sparkles className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-semibold text-[#40232c]">Papelaria</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#7c5560]">Todos os materiais visuais do evento ficam reunidos aqui. Evento, QR de check-in e Memórias seguem a mesma linguagem: modelos elegantes, cores ajustáveis e a tipografia do convite.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {CATEGORIAS.map(({ id, nome, descricao, Icon }) => (
              <button key={id} type="button" onClick={() => setCategoria(id)} className={`rounded-2xl border p-3 text-left transition ${categoria === id ? 'border-[#c0607860] bg-white shadow-sm' : 'border-white/80 bg-white/55 hover:bg-white'}`}>
                <span className="flex items-center gap-2 font-semibold text-[#40232c]"><Icon className="h-4 w-4 text-[#a04a63]" />{nome}</span>
                <span className="mt-1 block text-xs leading-5 text-[#7c5560]">{descricao}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{erro}</p>}

      {categoria === 'evento' && (
        <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
              <div>
                <p className="font-semibold text-[#40232c]">Material do evento</p>
                <p className="mt-1 text-xs leading-5 text-[#7c5560]">Escolha a peça e o tamanho. A composição usa automaticamente a identidade do convite como ponto de partida.</p>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Peça
                  <select value={peca} onChange={(e) => setPeca(e.target.value as PecaEventoId)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
                    {(Object.keys(PECAS_EVENTO) as PecaEventoId[]).map((id) => <option key={id} value={id}>{PECAS_EVENTO[id].nome}</option>)}
                  </select>
                  <span className="font-normal text-[#9b7b84]">{PECAS_EVENTO[peca].descricao}</span>
                </label>

                <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Tamanho
                  <select value={formatoEvento} onChange={(e) => setFormatoEvento(e.target.value as FormatoPapelariaId)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
                    {FORMATOS_PAPELARIA.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.detalhe}</option>)}
                  </select>
                </label>

                {(peca === 'boas-vindas' || peca === 'qr-convite' || peca === 'agradecimento') && <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal" /></label>}
                {(peca === 'numero-mesa' || peca === 'cartao-mesa') && <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Número da mesa<input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={8} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal" /></label>}
                {peca === 'menu' ? <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Itens do menu<textarea rows={7} value={menu} onChange={(e) => setMenu(e.target.value)} maxLength={500} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal leading-6" /></label> : (peca !== 'numero-mesa' && peca !== 'qr-convite' && peca !== 'cartao-mesa') && <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Mensagem<textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal leading-6" /></label>}
              </div>
            </div>

            {controlesEstilo}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void baixarEvento('png')} disabled={gerando === 'evento'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{gerando === 'evento' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}PNG 300 DPI</button>
              <button type="button" onClick={() => void baixarEvento('pdf')} disabled={gerando === 'evento'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#40232c] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FileText className="h-4 w-4" />PDF</button>
            </div>
          </div>

          <Preview imagem={previewEvento} legenda="Prévia do material" />
        </div>
      )}

      {categoria === 'checkin' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#c0607830] bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5f8] text-[#a04a63]"><QrCode className="h-5 w-5" /></span>
              <div><p className="font-semibold text-[#40232c]">QR de check-in com arte</p><p className="mt-1 text-sm leading-6 text-[#7c5560]">O arquivo sai pronto para enviar ou imprimir e agora usa os mesmos modelos, cores e tipografia das demais peças. O QR isolado continua disponível apenas como opção técnica.</p></div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
                {carregandoConvidados ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#a04a63]" /></div> : alvos.length === 0 ? <div className="rounded-xl bg-[#fff9fb] p-4 text-sm text-[#7c5560]">Cadastre convidados na Central para liberar as artes individuais de check-in.</div> : <div className="grid gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-[#69434f]">{qrModo === 'familia' ? 'Família / convidado' : 'Convidado'}
                    <select value={alvo?.id ?? ''} onChange={(e) => setAlvoId(e.target.value)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
                      {alvos.map((a) => <option key={a.id} value={a.id}>{a.nome} — {a.detalhe}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#69434f]">Formato da arte
                    <select value={formatoCheckin} onChange={(e) => setFormatoCheckin(e.target.value as FormatoPapelariaId)} style={CAMPO_CLARO} className="rounded-xl border border-[#c0607835] px-3 py-2.5 text-sm font-normal">
                      {FORMATOS_PAPELARIA.filter((f) => ['10x15','15x21','a5','a4'].includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.detalhe}</option>)}
                    </select>
                  </label>
                  <div className="rounded-xl bg-[#fff9fb] p-3 text-xs leading-5 text-[#7c5560]">Modo de check-in atual: <strong className="text-[#40232c]">{qrModo === 'familia' ? 'por família / grupo' : 'individual'}</strong>. A Papelaria respeita essa configuração ao listar os QR Codes.</div>
                </div>}
              </div>

              {alvos.length > 0 && controlesEstilo}

              {alvos.length > 0 && <div className="grid gap-2">
                <button type="button" onClick={() => void baixarCheckin('png')} disabled={!alvo || gerando === 'checkin'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{gerando === 'checkin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar arte do check-in</button>
                <button type="button" onClick={() => void baixarCheckin('pdf')} disabled={!alvo || gerando === 'checkin'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c0607840] bg-white px-4 py-2.5 text-sm font-semibold text-[#a04a63] disabled:opacity-50"><FileText className="h-4 w-4" />PDF para imprimir</button>
                <button type="button" onClick={() => void baixarQrPuro()} disabled={!alvo} className="text-xs font-semibold text-[#7c5560] underline decoration-[#c0607850] underline-offset-4 disabled:opacity-50">Baixar somente o QR Code</button>
              </div>}
            </div>
            <Preview imagem={previewCheckin} legenda={alvo ? `Arte de check-in · ${alvo.nome}` : 'Prévia do QR de check-in'} />
          </div>
        </div>
      )}

      {categoria === 'memorias' && <PapelariaMemorias eventoId={eventoId} token={token} cfg={cfg} />}
    </section>
  );
}

function Preview({ imagem, legenda }: { imagem: string; legenda: string }) {
  return (
    <div className="rounded-2xl border border-[#c0607833] bg-white p-4">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[.16em] text-[#8b6872]">{legenda}</p>
      <div className="grid min-h-[560px] place-items-center overflow-auto rounded-2xl bg-[radial-gradient(circle_at_top,#eee5e8,#ddd5d7)] p-5">
        {imagem ? <img src={imagem} alt={legenda} className="max-h-[720px] max-w-full rounded-sm bg-white shadow-2xl" /> : <Loader2 className="h-7 w-7 animate-spin text-[#a04a63]" />}
      </div>
      <p className="mt-3 text-center text-[10px] leading-4 text-[#8b6872]">A prévia é otimizada para a tela. Os downloads são gerados novamente em 300 DPI e no tamanho físico escolhido.</p>
    </div>
  );
}
