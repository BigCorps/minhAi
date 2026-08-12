'use client';

import { useEffect, useRef, useState } from 'react';
import Wizard from '@/components/conviteria/wizard/Wizard';
import type { EstadoWizard } from '@/lib/conviteria/wizard';

// Token do rascunho: fica no navegador para a pessoa poder fechar a aba e
// voltar depois. Ainda não existe conta neste ponto do fluxo.
const CHAVE = 'conviteia:rascunho';

export default function Criar() {
  const [inicial, setInicial] = useState<EstadoWizard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const token = useRef<string>('');

  useEffect(() => {
    token.current = localStorage.getItem(CHAVE) ?? crypto.randomUUID();
    localStorage.setItem(CHAVE, token.current);

    fetch(`/api/conviteria/rascunho?token=${token.current}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.estado) setInicial(j.estado as EstadoWizard); })
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <div className="wz-carregando">Carregando…</div>;

  return (
    <Wizard
      estadoInicial={inicial ?? undefined}
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
      aoConcluir={(estado) => {
        // Guarda o estado final e manda para o cadastro. A publicação só
        // acontece depois do login, porque a rota exige token de sessão.
        sessionStorage.setItem('conviteia:publicar', JSON.stringify(estado));
        window.location.href = '/conviteia/entrar?destino=publicar';
      }}
    />
  );
}