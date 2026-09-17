'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import type {
  ConviteConfig,
  InformacaoItem,
  ProgramacaoItem,
} from '@/lib/conviteria/tipos';

type GestaoCfg = {
  rsvpRestrito: boolean;
  qrModo: 'familia' | 'individual';
};

type Props = {
  eventoId: string;
  token: string;
  cfg: ConviteConfig;
  gestao: GestaoCfg;
  aoSalvar: (cfg: ConviteConfig, g: GestaoCfg) => void;
};

export default function DetalhesPainel({
  eventoId,
  token,
  cfg,
  gestao,
  aoSalvar,
}: Props) {
  const [rsvpRestrito, setRsvp] = useState(gestao.rsvpRestrito);
  const [qrModo, setQr] = useState(gestao.qrModo);
  const [url, setUrl] = useState(cfg.listaPresentesExternaUrl ?? '');
  const [programacao, setProgramacao] = useState<ProgramacaoItem[]>(cfg.programacao ?? []);
  const [informacoes, setInformacoes] = useState<InformacaoItem[]>(cfg.informacoes ?? []);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  function atualizarInformacao(indice: number, patch: Partial<InformacaoItem>) {
    setInformacoes((xs) =>
      xs.map((x, i) => (i === indice ? { ...x, ...patch } : x)),
    );
  }

  async function enviarImagem(
    indice: number,
    itemId: string,
    arquivo: File,
  ) {
    if (arquivo.size > 4 * 1024 * 1024) {
      setMsg('A imagem deve ter no máximo 4 MB.');
      return;
    }

    setEnviandoImagem(itemId);
    setMsg('');

    try {
      const fd = new FormData();
      fd.append('eventoId', eventoId);
      fd.append('tipo', 'informacao');
      fd.append('arquivo', arquivo);

      const r = await fetch('/api/conviteria/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.url) {
        throw new Error(d?.erro || 'Não foi possível enviar a imagem.');
      }

      atualizarInformacao(indice, { imagemUrl: d.url as string });
      setMsg('Imagem carregada. Salve os detalhes para confirmar a alteração.');
    } catch (e: any) {
      setMsg(e?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setEnviandoImagem(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    setMsg('');

    try {
      const r = await fetch('/api/conviteria/gestao', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventoId,
          rsvpRestrito,
          qrModo,
          listaPresentesExternaUrl: url,
          programacao,
          informacoes,
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(d?.erro || 'Não foi possível salvar.');
      }

      aoSalvar(d.config, { rsvpRestrito, qrModo });
      setMsg('Alterações salvas.');
    } catch (e: any) {
      setMsg(e?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <h2 className="font-semibold">Confirmação de presença</h2>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={rsvpRestrito}
            onChange={(e) => setRsvp(e.target.checked)}
            className="mt-1"
          />
          <span>
            <strong>Somente convidados cadastrados podem confirmar</strong>
            <small className="block text-[#7c5560]">
              A pessoa localiza a família pelo e-mail ou telefone cadastrado e
              só pode marcar nomes da lista.
            </small>
          </span>
        </label>

        <div className="mt-4">
          <p className="text-sm font-medium">QR padrão</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setQr('familia')}
              className={`rounded-xl px-3 py-2 text-sm ${
                qrModo === 'familia'
                  ? 'bg-[#c06078] text-white'
                  : 'bg-[#fff5f8]'
              }`}
            >
              Por família
            </button>
            <button
              onClick={() => setQr('individual')}
              className={`rounded-xl px-3 py-2 text-sm ${
                qrModo === 'individual'
                  ? 'bg-[#c06078] text-white'
                  : 'bg-[#fff5f8]'
              }`}
            >
              Individual
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <h2 className="font-semibold">Lista externa de presentes</h2>
        <p className="mt-1 text-sm text-[#7c5560]">
          Cole somente a URL da lista em outra loja/site. Ela pode coexistir
          com os presentes do ConviteIA.
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="mt-3 w-full rounded-xl border border-[#c0607833] px-3 py-2.5"
        />
      </div>

      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Programação</h2>
            <p className="text-sm text-[#7c5560]">
              Cerimônia, recepção, jantar, parabéns e outros momentos.
            </p>
          </div>
          <button
            onClick={() =>
              setProgramacao((p) => [
                ...p,
                { id: crypto.randomUUID(), horario: '', titulo: '' },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#fff5f8] px-3 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {programacao.map((p, i) => (
            <div
              key={p.id}
              className="grid gap-2 rounded-xl bg-[#fff9fb] p-3 sm:grid-cols-[110px_1fr_auto]"
            >
              <input
                value={p.horario}
                onChange={(e) =>
                  setProgramacao((xs) =>
                    xs.map((x, j) =>
                      j === i ? { ...x, horario: e.target.value } : x,
                    ),
                  )
                }
                placeholder="19:30"
                className="rounded-lg border px-3 py-2"
              />
              <div className="space-y-2">
                <input
                  value={p.titulo}
                  onChange={(e) =>
                    setProgramacao((xs) =>
                      xs.map((x, j) =>
                        j === i ? { ...x, titulo: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Recepção"
                  className="w-full rounded-lg border px-3 py-2"
                />
                <input
                  value={p.descricao ?? ''}
                  onChange={(e) =>
                    setProgramacao((xs) =>
                      xs.map((x, j) =>
                        j === i ? { ...x, descricao: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Descrição opcional"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <button
                onClick={() =>
                  setProgramacao((xs) => xs.filter((_, j) => j !== i))
                }
                className="p-2 text-red-500"
                aria-label={`Excluir ${p.titulo || 'item da programação'}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#c0607833] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Informações aos convidados</h2>
            <p className="text-sm text-[#7c5560]">
              Traje, crianças, estacionamento, transporte, hospedagem, fotos ou
              texto livre. Você também pode adicionar uma imagem de referência.
            </p>
          </div>
          <button
            onClick={() =>
              setInformacoes((p) => [
                ...p,
                {
                  id: crypto.randomUUID(),
                  tipo: 'outro',
                  titulo: '',
                  texto: '',
                },
              ])
            }
            className="inline-flex items-center gap-1 rounded-lg bg-[#fff5f8] px-3 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {informacoes.map((p, i) => (
            <div
              key={p.id}
              className="rounded-xl bg-[#fff9fb] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                <select
                  value={p.tipo}
                  onChange={(e) =>
                    atualizarInformacao(i, {
                      tipo: e.target.value as InformacaoItem['tipo'],
                    })
                  }
                  className="rounded-lg border px-3 py-2"
                >
                  <option value="traje">Traje</option>
                  <option value="criancas">Crianças</option>
                  <option value="estacionamento">Estacionamento</option>
                  <option value="transporte">Transporte</option>
                  <option value="hospedagem">Hospedagem</option>
                  <option value="fotos">Fotos</option>
                  <option value="outro">Outro</option>
                </select>

                <div className="space-y-2">
                  <input
                    value={p.titulo}
                    onChange={(e) =>
                      atualizarInformacao(i, { titulo: e.target.value })
                    }
                    placeholder="Título"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <textarea
                    value={p.texto}
                    onChange={(e) =>
                      atualizarInformacao(i, { texto: e.target.value })
                    }
                    placeholder="Informação"
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <button
                  onClick={() =>
                    setInformacoes((xs) => xs.filter((_, j) => j !== i))
                  }
                  className="self-start p-2 text-red-500"
                  aria-label={`Excluir ${p.titulo || 'informação'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 border-t border-[#c060781a] pt-3">
                {p.imagemUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <img
                      src={p.imagemUrl}
                      alt={p.titulo ? `Referência de ${p.titulo}` : 'Imagem de referência'}
                      className="h-32 w-full rounded-xl border border-[#c0607826] object-cover sm:w-44"
                    />
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c0607833] bg-white px-3 py-2 text-xs font-semibold text-[#a04a63]">
                        {enviandoImagem === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        Trocar imagem
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                          className="hidden"
                          disabled={enviandoImagem === p.id}
                          onChange={(e) => {
                            const arquivo = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (arquivo) void enviarImagem(i, p.id, arquivo);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          atualizarInformacao(i, { imagemUrl: undefined })
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-500"
                      >
                        <X className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c0607833] bg-white px-3 py-2 text-xs font-semibold text-[#a04a63]">
                      {enviandoImagem === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      Adicionar imagem
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                        className="hidden"
                        disabled={enviandoImagem === p.id}
                        onChange={(e) => {
                          const arquivo = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (arquivo) void enviarImagem(i, p.id, arquivo);
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-[#7c5560]">
                      Opcional · JPG, PNG, WebP ou HEIC · até 4 MB
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando || !!enviandoImagem}
          className="inline-flex items-center gap-2 rounded-xl bg-[#c06078] px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar detalhes
        </button>
        {msg && <p className="text-sm text-[#7c5560]">{msg}</p>}
      </div>
    </section>
  );
}
