'use client';

// app/convite/editar/[id]/page.tsx
//
// Reusa o Wizard inteiro em modo edicao. Segmento estatico "editar" antes do
// dinamico de proposito: `app/convite/[slug]` ja existe para o convite
// publicado, e dois segmentos dinamicos irmaos com nomes diferentes nao
// convivem no App Router.

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Wizard from '@/components/conviteria/wizard/Wizard';
import { createClient } from '@/lib/supabase-browser';
import type { EstadoWizard } from '@/lib/conviteria/wizard';
import '@/components/conviteria/wizard/wizard.css';

export default function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [estado, setEstado] = useState<EstadoWizard | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const autorizacao = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const acesso = await autorizacao();
      if (!acesso) {
        router.replace('/convite/entrar');
        return;
      }

      const r = await fetch(`/api/conviteria/evento?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${acesso}` },
      });
      const d = await r.json().catch(() => null);
      if (cancelado) return;

      if (!r.ok) {
        setErro(d?.erro ?? 'Não foi possível abrir este convite.');
        return;
      }

      // Abre na etapa 0: quem entrou para editar geralmente sabe o que quer
      // mudar, e a trilha do topo leva direto a qualquer etapa.
      setEstado({ etapa: 0, cfg: d.cfg });
    })();

    return () => { cancelado = true; };
  }, [id, autorizacao, router]);

  async function salvar(novo: EstadoWizard) {
    setSalvando(true);
    setErro(null);

    const acesso = await autorizacao();
    if (!acesso) {
      setErro('Sua sessão expirou. Entre de novo.');
      setSalvando(false);
      return;
    }

    const r = await fetch('/api/conviteria/evento', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${acesso}`,
      },
      body: JSON.stringify({ id, cfg: novo.cfg }),
    });

    const d = await r.json().catch(() => null);
    setSalvando(false);

    if (!r.ok) {
      setErro(d?.erro ?? 'Não foi possível salvar.');
      return;
    }

    router.push('/convite/painel');
  }

  if (erro) {
    return (
      <div className="wz-carregando">
        <p>{erro}</p>
        <a href="/convite/painel" style={{ color: '#a04a63', textDecoration: 'underline' }}>
          Voltar aos meus convites
        </a>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="wz-carregando">
        <img src="/brands/convite/icone-512.png" alt="" width={64} height={64} />
        <p>Abrindo seu convite…</p>
      </div>
    );
  }

  return (
    <Wizard
      modo="editar"
      estadoInicial={estado}
      aoConcluir={(novo) => { if (!salvando) void salvar(novo); }}
      aoEnviarArquivo={async (tipo, arquivo) => {
        // Na edicao o arquivo pertence ao EVENTO, nao a um rascunho: a rota
        // exige Bearer e confere a posse antes de aceitar.
        const acesso = await autorizacao();
        if (!acesso) throw new Error('sessão expirada');

        const fd = new FormData();
        fd.append('eventoId', id);
        fd.append('tipo', tipo);
        fd.append('arquivo', arquivo);
        const r = await fetch('/api/conviteria/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${acesso}` },
          body: fd,
        });
        if (!r.ok) throw new Error('upload falhou');
        const { url } = await r.json();
        return url as string;
      }}
    />
  );
}
