'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Download, ExternalLink, Eye, EyeOff, Image as ImageIcon, Loader2, QrCode, Trash2, UserRound, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import JSZip from 'jszip';
import * as QRCode from 'qrcode';
import MateriaisMemorias from './MateriaisMemorias';

type Midia = {
  id: string;
  tipo: 'foto' | 'video';
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  nomeConvidado?: string | null;
  status: 'reservado' | 'pendente' | 'aprovado' | 'oculto' | 'excluido';
  createdAt: string;
};

type Dados = {
  ativo: boolean;
  status: string;
  precoCentavos: number;
  aprovacaoManual: boolean;
  expiraEm: string | null;
  ornamentoId?: string | null;
  limites: { fotos: number; videos: number; bytes: number };
  uso: { fotos: number; videos: number; bytes: number };
  urlMemorias: string;
  urlAlbum: string;
  midias: Midia[];
};

type GrupoPessoa = {
  chave: string;
  nome: string;
  midias: Midia[];
  fotos: number;
  videos: number;
  bytes: number;
  ultimoEnvio: string;
};

function mb(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`; }
function diasAte(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}
function ext(mime: string, tipo: string) {
  if (tipo === 'video') return mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : 'mp4';
  return mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('heic') ? 'heic' : 'jpg';
}
function chaveNome(nome?: string | null) {
  return (nome?.replace(/\s+/g, ' ').trim() || 'Sem identificação').normalize('NFKC').toLocaleLowerCase('pt-BR');
}
function formatarData(iso: string) {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function MemoriasPainel({ eventoId, titulo }: { eventoId: string; slug: string; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [qr, setQr] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [visao, setVisao] = useState<'arquivos' | 'pessoas'>('arquivos');
  const [pessoaAberta, setPessoaAberta] = useState<string | null>(null);
  const [excluindoGrupo, setExcluindoGrupo] = useState<string | null>(null);

  const token = useCallback(async () => (await createClient().auth.getSession()).data.session?.access_token ?? '', []);
  const buscarDados = useCallback(async (): Promise<Dados> => {
    const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}`, {
      headers: { Authorization: `Bearer ${await token()}` },
      cache: 'no-store',
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro || 'Falha ao carregar Memórias.');
    return j as Dados;
  }, [eventoId, token]);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try { setDados(await buscarDados()); }
    catch (e: any) { setErro(e.message || 'Falha ao carregar Memórias.'); }
    finally { setCarregando(false); }
  }, [buscarDados]);

  useEffect(() => { if (aberto && !dados) void carregar(); }, [aberto, dados, carregar]);
  useEffect(() => {
    if (!dados?.urlMemorias) return;
    QRCode.toDataURL(dados.urlMemorias, { width: 1600, margin: 4, errorCorrectionLevel: 'H' })
      .then(setQr).catch(() => setQr(''));
  }, [dados?.urlMemorias]);

  const pct = useMemo(() => dados ? Math.min(100, Math.round((dados.uso.bytes / dados.limites.bytes) * 100)) : 0, [dados]);
  const diasRestantes = useMemo(() => diasAte(dados?.expiraEm ?? null), [dados?.expiraEm]);
  const midiasAtivas = useMemo(
    () => (dados?.midias ?? []).filter((m) => m.status !== 'excluido' && m.status !== 'reservado'),
    [dados?.midias],
  );
  const grupos = useMemo<GrupoPessoa[]>(() => {
    const mapa = new Map<string, GrupoPessoa>();
    for (const m of midiasAtivas) {
      const nome = m.nomeConvidado?.replace(/\s+/g, ' ').trim() || 'Sem identificação';
      const chave = chaveNome(nome);
      const atual = mapa.get(chave) ?? { chave, nome, midias: [], fotos: 0, videos: 0, bytes: 0, ultimoEnvio: m.createdAt };
      atual.midias.push(m);
      if (m.tipo === 'foto') atual.fotos++;
      else atual.videos++;
      atual.bytes += m.tamanhoBytes;
      if (new Date(m.createdAt).getTime() > new Date(atual.ultimoEnvio).getTime()) atual.ultimoEnvio = m.createdAt;
      mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => new Date(b.ultimoEnvio).getTime() - new Date(a.ultimoEnvio).getTime());
  }, [midiasAtivas]);

  async function patch(body: any) {
    const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.erro || 'Não foi possível salvar.');
    await carregar();
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir esta memória definitivamente?')) return;
    const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}&memoriaId=${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` },
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) { setErro(j?.erro || 'Não foi possível excluir.'); return; }
    await carregar();
  }

  async function excluirGrupo(grupo: GrupoPessoa) {
    const quantidade = grupo.midias.length;
    if (!window.confirm(`Excluir definitivamente ${quantidade} arquivo${quantidade === 1 ? '' : 's'} enviado${quantidade === 1 ? '' : 's'} por ${grupo.nome}?`)) return;
    setExcluindoGrupo(grupo.chave); setErro('');
    try {
      const r = await fetch(`/api/conviteria/memorias/painel?eventoId=${encodeURIComponent(eventoId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ memoriaIds: grupo.midias.map((m) => m.id) }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.erro || 'Não foi possível excluir os envios desta pessoa.');
      setPessoaAberta(null);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível excluir os envios desta pessoa.');
    } finally {
      setExcluindoGrupo(null);
    }
  }

  async function baixarQr() {
    if (!qr) return;
    const a = document.createElement('a'); a.href = qr; a.download = `QR-Memorias-${titulo.replace(/[^a-z0-9]+/gi, '-')}.png`; a.click();
  }

  async function baixarTudo() {
    if (!dados?.midias.length || baixando) return;
    setBaixando(true); setErro('');
    try {
      const frescos = await buscarDados();
      setDados(frescos);

      const zip = new JSZip();
      const raiz = zip.folder(`Memorias-${titulo.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Evento'}`)!;
      const fotos = raiz.folder('fotos')!;
      const videos = raiz.folder('videos')!;
      let fi = 0, vi = 0;
      for (const m of frescos.midias.filter((x) => x.status !== 'excluido' && x.status !== 'reservado')) {
        const r = await fetch(m.url);
        if (!r.ok) continue;
        const blob = await r.blob();
        const autor = (m.nomeConvidado || 'sem-identificacao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'convidado';
        if (m.tipo === 'foto') fotos.file(`${autor}-foto-${String(++fi).padStart(3, '0')}.${ext(m.mimeType, m.tipo)}`, blob);
        else videos.file(`${autor}-video-${String(++vi).padStart(3, '0')}.${ext(m.mimeType, m.tipo)}`, blob);
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Memorias-${titulo.replace(/[^a-z0-9]+/gi, '-')}.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { setErro('Não foi possível montar o ZIP. Tente em um computador ou baixe os arquivos individualmente.'); }
    finally { setBaixando(false); }
  }

  const cartaoMidia = (m: Midia) => (
    <div key={m.id} className="overflow-hidden rounded-xl border" style={{ borderColor:'#c0607828' }}>
      <div className="aspect-square bg-black/5">{m.tipo === 'foto' ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <video src={m.url} className="h-full w-full object-cover" preload="metadata" />}</div>
      <div className="p-2">
        <p className="mb-1 truncate text-[11px] font-medium text-[#69434f]" title={m.nomeConvidado || 'Sem identificação'}>por {m.nomeConvidado || 'Sem identificação'}</p>
        <div className="flex items-center justify-between gap-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700' : m.status === 'pendente' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{m.status}</span><span className="text-[10px] text-gray-400">{mb(m.tamanhoBytes)}</span></div>
        <div className="mt-2 flex gap-1">{m.status !== 'aprovado' && <button title="Aprovar" onClick={() => void patch({ memoriaId:m.id,status:'aprovado' }).catch((x) => setErro(x.message))} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700"><Check className="h-3.5 w-3.5" /></button>}{m.status === 'aprovado' && <button title="Ocultar" onClick={() => void patch({ memoriaId:m.id,status:'oculto' }).catch((x) => setErro(x.message))} className="rounded-lg bg-gray-100 p-1.5 text-gray-600"><EyeOff className="h-3.5 w-3.5" /></button>}{m.status === 'oculto' && <button title="Mostrar" onClick={() => void patch({ memoriaId:m.id,status:'aprovado' }).catch((x) => setErro(x.message))} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700"><Eye className="h-3.5 w-3.5" /></button>}<button title="Excluir" onClick={() => void excluir(m.id)} className="rounded-lg bg-red-50 p-1.5 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></div>
      </div>
    </div>
  );

  return (
    <section className="mt-3 border-t pt-3" style={{ borderColor: '#c0607822' }}>
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold" style={{ background:'#fff5f8', color:'#a04a63' }}>
        <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Memórias do Evento</span><span>{aberto ? '−' : '+'}</span>
      </button>
      {!aberto ? null : carregando && !dados ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color:'#c06078' }} /></div> : erro && !dados ? <p className="p-3 text-sm text-red-700">{erro}</p> : dados && !dados.ativo ? (
        <div className="mt-3 rounded-2xl border p-4" style={{ borderColor:'#c0607833', background:'#fff' }}>
          <p className="font-semibold" style={{ color:'#40232c' }}>Álbum colaborativo + slideshow ao vivo</p>
          <p className="mt-1 text-sm" style={{ color:'#7c5560' }}>Até 300 fotos, 30 vídeos e modo telão em tempo real por R$ 19,90 neste convite.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/convite/pagar?evento=${eventoId}&memorias=1`} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background:'#c06078' }}>Ativar por R$ 19,90</Link>
            <a href="/memorias" target="_blank" className="rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor:'#c0607844', color:'#a04a63' }}>Conhecer</a>
          </div>
        </div>
      ) : dados ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border bg-white p-4" style={{ borderColor:'#c0607830' }}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold" style={{ color:'#40232c' }}>Memórias ativas</p>{dados.expiraEm && <p className="text-xs" style={{ color:'#7c5560' }}>Disponíveis até {new Date(dados.expiraEm).toLocaleDateString('pt-BR')}{diasRestantes != null && diasRestantes <= 15 ? ` · ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'} restante${diasRestantes === 1 ? '' : 's'}` : ''}</p>}</div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ativo</span></div>
            <div className="mt-3 flex justify-between text-xs" style={{ color:'#7c5560' }}><span>{dados.uso.fotos}/{dados.limites.fotos} fotos · {dados.uso.videos}/{dados.limites.videos} vídeos</span><span>{mb(dados.uso.bytes)} / {mb(dados.limites.bytes)}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f7e2e6]"><div className="h-full bg-[#c06078]" style={{ width:`${pct}%` }} /></div>{diasRestantes != null && diasRestantes <= 15 && <p className={`mt-3 rounded-xl px-3 py-2 text-xs ${diasRestantes <= 1 ? 'bg-red-50 text-red-700' : diasRestantes <= 7 ? 'bg-amber-50 text-amber-800' : 'bg-[#fff5f8] text-[#7c5560]'}`}>{diasRestantes <= 1 ? 'As Memórias expiram em até 24 horas. Baixe seus arquivos agora.' : `Faltam ${diasRestantes} dias para as Memórias expirarem. Recomendamos baixar o ZIP.`}</p>}
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-[#fff9fb] px-3 py-3 text-sm"><span><strong className="block" style={{ color:'#40232c' }}>Aprovar antes de exibir</strong><span className="text-xs" style={{ color:'#7c5560' }}>Desligado por padrão: novos envios entram direto no álbum.</span></span><input type="checkbox" checked={dados.aprovacaoManual} onChange={(e) => void patch({ aprovacaoManual:e.target.checked }).catch((x) => setErro(x.message))} className="h-5 w-5 accent-[#c06078]" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div className="rounded-2xl border bg-white p-3 text-center" style={{ borderColor:'#c0607830' }}>{qr ? <img src={qr} alt="QR Code das Memórias" className="mx-auto w-full max-w-36" /> : <QrCode className="mx-auto h-20 w-20 text-[#c06078]" />}<button onClick={() => void baixarQr()} className="mt-2 text-xs font-semibold" style={{ color:'#a04a63' }}>Baixar QR em PNG</button></div>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor:'#c0607830' }}><p className="text-xs font-semibold uppercase tracking-wide" style={{ color:'#a04a63' }}>Compartilhar com convidados</p><p className="mt-1 break-all text-sm" style={{ color:'#40232c' }}>{dados.urlMemorias}</p><p className="mt-1 text-xs text-[#7c5560]">No dia do evento este QR também aparece automaticamente no canto do slideshow.</p><div className="mt-3 flex flex-wrap gap-2"><a href={dados.urlMemorias} target="_blank" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium" style={{ borderColor:'#c0607844',color:'#a04a63' }}>Abrir envios <ExternalLink className="h-3 w-3" /></a><a href={dados.urlAlbum} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-[#c06078] px-3 py-2 text-xs font-semibold text-white">Abrir álbum/telão <ExternalLink className="h-3 w-3" /></a><button onClick={() => void baixarTudo()} disabled={baixando || !dados.midias.length} className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor:'#c0607844',color:'#a04a63' }}>{baixando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Baixar tudo (.zip)</button></div></div>
          </div>

          {qr && <MateriaisMemorias titulo={titulo} urlMemorias={dados.urlMemorias} qrDataUrl={qr} ornamentoInicial={dados.ornamentoId ?? undefined} />}

          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}

          {midiasAtivas.length > 0 && (
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor:'#c0607830' }}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold" style={{ color:'#40232c' }}>Arquivos recebidos</p><p className="text-xs text-[#7c5560]">Veja cada arquivo ou organize os envios pelo nome do convidado.</p></div>
                <button onClick={() => void carregar()} className="text-xs" style={{ color:'#a04a63' }}>Atualizar</button>
              </div>
              <div className="mb-4 inline-flex rounded-xl bg-[#fff5f8] p-1">
                <button onClick={() => setVisao('arquivos')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${visao === 'arquivos' ? 'bg-white text-[#a04a63] shadow-sm' : 'text-[#7c5560]'}`}><ImageIcon className="mr-1 inline h-3.5 w-3.5" />Arquivos</button>
                <button onClick={() => setVisao('pessoas')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${visao === 'pessoas' ? 'bg-white text-[#a04a63] shadow-sm' : 'text-[#7c5560]'}`}><Users className="mr-1 inline h-3.5 w-3.5" />Por pessoa ({grupos.length})</button>
              </div>

              {visao === 'arquivos' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{midiasAtivas.map(cartaoMidia)}</div>
              ) : (
                <div className="space-y-3">
                  {grupos.map((grupo) => {
                    const expandido = pessoaAberta === grupo.chave;
                    return (
                      <div key={grupo.chave} className="overflow-hidden rounded-2xl border border-[#c0607828]">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fffafc] p-3">
                          <button type="button" onClick={() => setPessoaAberta(expandido ? null : grupo.chave)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5dce3] text-[#a04a63]"><UserRound className="h-5 w-5" /></span>
                            <span className="min-w-0"><strong className="block truncate text-sm text-[#40232c]">{grupo.nome}</strong><span className="block text-xs text-[#7c5560]">{grupo.fotos} foto{grupo.fotos === 1 ? '' : 's'} · {grupo.videos} vídeo{grupo.videos === 1 ? '' : 's'} · {mb(grupo.bytes)} · último {formatarData(grupo.ultimoEnvio)}</span></span>
                            {expandido ? <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-[#a04a63]" /> : <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#a04a63]" />}
                          </button>
                          <button disabled={excluindoGrupo === grupo.chave} onClick={() => void excluirGrupo(grupo)} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">{excluindoGrupo === grupo.chave ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Excluir todos</button>
                        </div>
                        {expandido && <div className="grid grid-cols-2 gap-3 border-t border-[#c0607820] p-3 sm:grid-cols-4">{grupo.midias.map(cartaoMidia)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
