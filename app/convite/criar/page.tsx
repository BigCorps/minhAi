'use client';

import { useEffect, useRef, useState } from 'react';
import Wizard from '@/components/conviteria/wizard/Wizard';
import RendaBackground from '@/components/conviteria/RendaBackground';
import BriefingResumo from '@/components/conviteria/BriefingResumo';
import '@/components/conviteria/wizard/wizard.css';
import type { EstadoWizard } from '@/lib/conviteria/wizard';
import type { ResumoBriefing } from '@/lib/conviteria/briefing';

const CHAVE = 'conviteia:rascunho';
const CHAVE_PUBLICAR = 'conviteia:publicar';
const COOKIE_RASCUNHO = 'conviteia_rascunho_pendente';
const UMA_SEMANA = 7 * 24 * 60 * 60;

function lerLocal(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}

function gravarLocal(chave: string, valor: string) {
  try { localStorage.setItem(chave, valor); } catch { /* Safari/restricoes */ }
}

function gravarSessao(chave: string, valor: string) {
  try { sessionStorage.setItem(chave, valor); } catch { /* backup fica no servidor */ }
}

function marcarRascunhoPendente(token: string) {
  if (!token || typeof document === 'undefined') return;
  const hostname = window.location.hostname.toLowerCase();
  const dominio = hostname === 'conviteia.com' || hostname.endsWith('.conviteia.com')
    ? '; Domain=.conviteia.com'
    : '';
  const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_RASCUNHO}=${encodeURIComponent(token)}; Max-Age=${UMA_SEMANA}; Path=/; SameSite=Lax${seguro}${dominio}`;
}

function tokenRecuperacaoDaUrl(): string | null {
  try {
    const valor = new URL(window.location.href).searchParams.get('retomar')?.trim() ?? '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
      ? valor
      : null;
  } catch {
    return null;
  }
}

function limparTokenRecuperacaoDaUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('retomar')) return;
    url.searchParams.delete('retomar');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* sem impacto */ }
}

export default function Criar() {
  const [inicial, setInicial] = useState<EstadoWizard | null>(null);
  const [resumoIA, setResumoIA] = useState<ResumoBriefing | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [concluindo, setConcluindo] = useState(false);
  const token = useRef<string>('');

  useEffect(() => {
    // Recuperacao manual de um rascunho salvo no servidor. Serve tambem para
    // suporte de casos anteriores a esta correcao (ex.: troca de navegador).
    const retomar = tokenRecuperacaoDaUrl();
    if (retomar) {
      token.current = retomar;
      gravarLocal(CHAVE, retomar);

      fetch(`/api/conviteria/rascunho?token=${encodeURIComponent(retomar)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.estado) setInicial(j.estado as EstadoWizard);
        })
        .catch(() => undefined)
        .finally(() => {
          limparTokenRecuperacaoDaUrl();
          setCarregando(false);
        });
      return;
    }

    // Briefing da landing tem prioridade. Ele só fica na sessão do navegador e
    // nunca é incluído no config público do convite.
    let bruto: string | null = null;
    try { bruto = sessionStorage.getItem('conviteia:briefing'); } catch { bruto = null; }

    if (bruto) {
      try {
        const pacote = JSON.parse(bruto) as {
          estado?: EstadoWizard;
          resumo?: ResumoBriefing;
        };

        if (pacote.estado?.cfg) {
          token.current = crypto.randomUUID();
          gravarLocal(CHAVE, token.current);
          try { sessionStorage.removeItem('conviteia:briefing'); } catch { /* noop */ }

          setInicial(pacote.estado);
          setResumoIA(pacote.resumo ?? null);

          // Salva imediatamente para o trabalho da IA não se perder se a pessoa
          // fechar a aba antes de editar o primeiro campo.
          fetch('/api/conviteria/rascunho', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.current, estado: pacote.estado }),
          }).catch(() => undefined);

          setCarregando(false);
          return;
        }
      } catch {
        try { sessionStorage.removeItem('conviteia:briefing'); } catch { /* noop */ }
      }
    }

    token.current = lerLocal(CHAVE) ?? crypto.randomUUID();
    gravarLocal(CHAVE, token.current);

    fetch(`/api/conviteria/rascunho?token=${encodeURIComponent(token.current)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.estado) setInicial(j.estado as EstadoWizard);
      })
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="wz-carregando">
        <RendaBackground />
        <img src="/brands/convite/icone-512.png" alt="" width={64} height={64} />
        <p>Preparando seu convite…</p>
      </div>
    );
  }

  return (
    <>
      {resumoIA && (
        <BriefingResumo
          resumo={resumoIA}
          aoContinuar={() => setResumoIA(null)}
        />
      )}

      <Wizard
        estadoInicial={inicial ?? undefined}
        concluindo={concluindo}
        aoSalvar={async (estado) => {
          await fetch('/api/conviteria/rascunho', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.current, estado }),
          }).catch(() => undefined);
        }}
        aoEnviarArquivo={async (tipo, arquivo) => {
          const fd = new FormData();
          fd.append('token', token.current);
          fd.append('tipo', tipo);
          fd.append('arquivo', arquivo);
          const r = await fetch('/api/conviteria/upload', { method: 'POST', body: fd });
          if (!r.ok) throw new Error('upload falhou');
          const { url } = await r.json();
          return url as string;
        }}
        aoConcluir={async (estado) => {
          if (concluindo) return;
          setConcluindo(true);

          try {
            // Nao dependa do autosave de 900 ms no ultimo clique. O estado exato
            // da ultima etapa precisa estar no servidor ANTES de abrir o login.
            const r = await fetch('/api/conviteria/rascunho', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token.current, estado }),
            });

            if (!r.ok) {
              throw new Error('Não foi possível salvar a etapa final do convite.');
            }

            gravarLocal(CHAVE, token.current);
            marcarRascunhoPendente(token.current);

            // Caminho rapido para navegadores que preservam sessionStorage.
            // Se Safari/iOS apagar, a tela de login recupera pelo token/cookie
            // diretamente do Supabase.
            gravarSessao(CHAVE_PUBLICAR, JSON.stringify(estado));

            window.location.href = '/convite/entrar?destino=publicar';
          } catch (e: any) {
            alert(e?.message ?? 'Não foi possível preparar o convite para publicação. Tente novamente.');
            setConcluindo(false);
          }
        }}
      />
    </>
  );
}
