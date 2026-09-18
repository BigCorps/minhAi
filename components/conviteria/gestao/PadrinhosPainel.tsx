'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

type Padrinho = {
  id: string;
  slug: string;
  nome: string;
  papel?: string | null;
  mensagem?: string | null;
  foto_url?: string | null;
  dress_code?: string | null;
  cores_recomendadas?: string[];
  resposta: string;
  respondido_em?: string | null;
};

type FormPadrinho = {
  id: string;
  nome: string;
  papel: string;
  mensagem: string;
  fotoUrl: string;
  dressCode: string;
  cores: string[];
  /** Ao criar a partir de outro convite/modelo, o backend duplica a mídia. */
  copiarFoto: boolean;
};

const CORES_PADRAO = ['#c8a0a8', '#ead8dc'];
const MAX_CORES = 8;
const vazio: FormPadrinho = {
  id: '',
  nome: '',
  papel: '',
  mensagem: '',
  fotoUrl: '',
  dressCode: '',
  cores: CORES_PADRAO,
  copiarFoto: false,
};

function formDePadrinho(p: Padrinho, duplicando = false): FormPadrinho {
  return {
    id: duplicando ? '' : p.id,
    // Em duplicação o que normalmente muda é justamente o nome dos padrinhos.
    nome: duplicando ? '' : p.nome,
    papel: p.papel ?? '',
    mensagem: p.mensagem ?? '',
    fotoUrl: p.foto_url ?? '',
    dressCode: p.dress_code ?? '',
    cores:
      Array.isArray(p.cores_recomendadas) && p.cores_recomendadas.length
        ? p.cores_recomendadas.slice(0, MAX_CORES)
        : CORES_PADRAO,
    copiarFoto: duplicando && !!p.foto_url,
  };
}

export default function PadrinhosPainel({
  eventoId,
  token,
  slug,
}: {
  eventoId: string;
  token: string;
  slug: string;
}) {
  const [lista, setLista] = useState<Padrinho[]>([]);
  const [form, setForm] = useState<FormPadrinho>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [temModelo, setTemModelo] = useState(false);

  const chaveModelo = useMemo(
    () => `conviteia:padrinhos:modelo:${eventoId}`,
    [eventoId],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const r = await fetch(
      `/api/conviteria/gestao/padrinhos?eventoId=${encodeURIComponent(eventoId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    const d = await r.json().catch(() => null);
    if (r.ok) setLista(d.padrinhos ?? []);
    else setErro(d?.erro ?? 'Falha ao carregar.');
    setCarregando(false);
  }, [eventoId, token]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Mantém o último modelo apenas neste navegador e apenas para este evento.
  // Nome/id nunca são reaproveitados, porque cada convite continua individual.
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveModelo);
      if (!bruto) return;
      const salvo = JSON.parse(bruto) as Partial<FormPadrinho>;
      const cores = Array.isArray(salvo.cores)
        ? salvo.cores.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, MAX_CORES)
        : [];
      setForm({
        ...vazio,
        papel: String(salvo.papel ?? ''),
        mensagem: String(salvo.mensagem ?? ''),
        fotoUrl: String(salvo.fotoUrl ?? ''),
        dressCode: String(salvo.dressCode ?? ''),
        cores: cores.length ? cores : CORES_PADRAO,
        copiarFoto: !!salvo.fotoUrl,
      });
      setTemModelo(true);
    } catch {
      // localStorage indisponível/corrompido não impede a gestão.
    }
  }, [chaveModelo]);

  function guardarModelo(base: FormPadrinho) {
    const modelo: FormPadrinho = {
      ...base,
      id: '',
      nome: '',
      copiarFoto: !!base.fotoUrl,
    };
    try {
      localStorage.setItem(chaveModelo, JSON.stringify(modelo));
      setTemModelo(true);
    } catch {
      // O convite continua funcionando mesmo sem armazenamento local.
    }
    return modelo;
  }

  function usarUltimoModelo() {
    try {
      const bruto = localStorage.getItem(chaveModelo);
      if (!bruto) return;
      const salvo = JSON.parse(bruto) as Partial<FormPadrinho>;
      const cores = Array.isArray(salvo.cores)
        ? salvo.cores.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, MAX_CORES)
        : [];
      setForm({
        ...vazio,
        papel: String(salvo.papel ?? ''),
        mensagem: String(salvo.mensagem ?? ''),
        fotoUrl: String(salvo.fotoUrl ?? ''),
        dressCode: String(salvo.dressCode ?? ''),
        cores: cores.length ? cores : CORES_PADRAO,
        copiarFoto: !!salvo.fotoUrl,
      });
      setErro('');
      document.getElementById('padrinho-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setErro('Não foi possível recuperar o último modelo neste navegador.');
    }
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.set('eventoId', eventoId);
    fd.set('tipo', 'padrinho');
    fd.set('arquivo', file);
    const r = await fetch('/api/conviteria/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.erro || 'Falha no upload.');
    setForm((f) => ({ ...f, fotoUrl: d.url, copiarFoto: false }));
  }

  async function salvar() {
    if (!form.nome.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      const r = await fetch('/api/conviteria/gestao/padrinhos', {
        method: form.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventoId, ...form }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível salvar.');

      // Usa os dados efetivamente persistidos (inclusive a URL da foto copiada)
      // como ponto de partida para o próximo convite.
      const salvo = d?.padrinho as Padrinho | undefined;
      const base = salvo ? formDePadrinho(salvo, true) : { ...form, id: '', nome: '' };
      const modelo = guardarModelo(base);
      setForm(modelo);
      await carregar();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este convite individual?')) return;
    await fetch(
      `/api/conviteria/gestao/padrinhos?eventoId=${encodeURIComponent(eventoId)}&id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    await carregar();
  }

  function editar(p: Padrinho) {
    setForm(formDePadrinho(p, false));
    setErro('');
    document.getElementById('padrinho-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function duplicar(p: Padrinho) {
    const copia = formDePadrinho(p, true);
    guardarModelo(copia);
    setForm(copia);
    setErro('');
    document.getElementById('padrinho-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function adicionarCor() {
    setForm((f) =>
      f.cores.length >= MAX_CORES
        ? f
        : { ...f, cores: [...f.cores, '#d8c2c8'] },
    );
  }

  function removerCor(indice: number) {
    setForm((f) => ({
      ...f,
      cores:
        f.cores.length <= 1
          ? f.cores
          : f.cores.filter((_, i) => i !== indice),
    }));
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div id="padrinho-form" className="scroll-mt-5 rounded-2xl border border-[#c0607833] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">Convite individual</h2>
            {!form.id && temModelo && (
              <p className="mt-1 text-xs text-[#7c5560]">
                O último modelo deste evento já fica disponível para acelerar os próximos convites.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {temModelo && !form.id && (
              <button
                type="button"
                onClick={usarUltimoModelo}
                className="rounded-lg border border-[#c0607833] bg-[#fff9fb] px-2.5 py-1.5 text-xs font-semibold text-[#a04a63]"
              >
                Usar último modelo
              </button>
            )}
            <button
              type="button"
              onClick={() => setForm(vazio)}
              className="rounded-lg border border-[#c0607833] bg-white px-2.5 py-1.5 text-xs text-[#7c5560]"
            >
              Novo em branco
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="João & Maria"
            className="rounded-xl border px-3 py-2"
          />
          <input
            value={form.papel}
            onChange={(e) => setForm({ ...form, papel: e.target.value })}
            placeholder="Padrinhos de casamento"
            className="rounded-xl border px-3 py-2"
          />
          <textarea
            rows={5}
            value={form.mensagem}
            onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
            placeholder="Mensagem personalizada"
            className="rounded-xl border px-3 py-2"
          />
          <textarea
            rows={3}
            value={form.dressCode}
            onChange={(e) => setForm({ ...form, dressCode: e.target.value })}
            placeholder="Traje / orientação"
            className="rounded-xl border px-3 py-2"
          />

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm">
            <ImagePlus className="h-4 w-4" />
            {form.fotoUrl ? 'Trocar foto' : 'Foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = '';
                if (f) void upload(f).catch((x) => setErro(x.message));
              }}
            />
          </label>
          {form.fotoUrl && (
            <img src={form.fotoUrl} alt="" className="h-36 w-full rounded-xl object-cover" />
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Cores recomendadas</p>
                <p className="text-[11px] text-[#7c5560]">Escolha de 1 a {MAX_CORES} cores.</p>
              </div>
              <button
                type="button"
                onClick={adicionarCor}
                disabled={form.cores.length >= MAX_CORES}
                className="inline-flex items-center gap-1 rounded-lg border border-[#c0607833] bg-[#fff9fb] px-2.5 py-1.5 text-xs font-semibold text-[#a04a63] disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Cor
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.cores.map((c, i) => (
                <div key={`${i}-${c}`} className="relative">
                  <input
                    type="color"
                    value={c}
                    aria-label={`Cor recomendada ${i + 1}`}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cores: form.cores.map((x, j) =>
                          j === i ? e.target.value : x,
                        ),
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded-lg border bg-white p-1"
                  />
                  {form.cores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerCor(i)}
                      aria-label={`Remover cor ${i + 1}`}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-[#c0607833] bg-white text-[12px] font-bold leading-none text-[#a04a63] shadow-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={salvar}
            disabled={salvando || !form.nome.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c06078] px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {form.id ? 'Atualizar' : 'Criar convite'}
          </button>
        </div>
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>

      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <h2 className="font-semibold">Padrinhos convidados</h2>
        {carregando ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {lista.map((p) => {
              const url = `https://${slug}.conviteia.com/padrinhos/${p.slug}`;
              return (
                <div key={p.id} className="rounded-xl bg-[#fff9fb] p-4">
                  <div className="flex gap-3">
                    {p.foto_url && (
                      <img src={p.foto_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{p.nome}</p>
                          <p className="text-xs text-[#7c5560]">
                            {p.resposta === 'aceito' ? 'Aceito ❤️' : 'Aguardando resposta'}
                          </p>
                          {Array.isArray(p.cores_recomendadas) && p.cores_recomendadas.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.cores_recomendadas.slice(0, MAX_CORES).map((cor, i) => (
                                <span
                                  key={`${cor}-${i}`}
                                  className="h-4 w-4 rounded-full border border-black/10"
                                  style={{ backgroundColor: cor }}
                                  title={cor}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex">
                          <button onClick={() => duplicar(p)} className="p-2" title="Duplicar convite" aria-label={`Duplicar convite de ${p.nome}`}>
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => editar(p)} className="p-2" title="Editar convite" aria-label={`Editar convite de ${p.nome}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => excluir(p.id)} className="p-2 text-red-500" title="Excluir convite" aria-label={`Excluir convite de ${p.nome}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <a href={url} target="_blank" rel="noreferrer" className="truncate text-xs text-[#a04a63]">
                          {url}
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(url)}
                          title="Copiar link"
                          aria-label={`Copiar link de ${p.nome}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {lista.length === 0 && (
              <p className="py-10 text-center text-sm text-[#7c5560]">
                Nenhum convite individual criado.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
