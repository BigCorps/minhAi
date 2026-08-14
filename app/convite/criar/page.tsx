'use client';

import { useEffect, useRef, useState } from 'react';
import Wizard from '@/components/conviteria/wizard/Wizard';
import RendaBackground from '@/components/conviteria/RendaBackground';
import BriefingResumo from '@/components/conviteria/BriefingResumo';
import '@/components/conviteria/wizard/wizard.css';
import type { EstadoWizard } from '@/lib/conviteria/wizard';
import type { ResumoBriefing } from '@/lib/conviteria/briefing';

const CHAVE = 'conviteia:rascunho';

export default function Criar() {
  const [inicial, setInicial] = useState<EstadoWizard | null>(null);
  const [resumoIA, setResumoIA] = useState<ResumoBriefing | null>(null);
  const [carregando, setCarregando] = useState(true);
  const token = useRef<string>('');

  useEffect(() => {
    // Briefing da landing tem prioridade. Ele só fica na sessão do navegador e
    // nunca é incluído no config público do convite.
    const bruto = sessionStorage.getItem('conviteia:briefing');

    if (bruto) {
      try {
        const pacote = JSON.parse(bruto) as {
          estado?: EstadoWizard;
          resumo?: ResumoBriefing;
        };

        if (pacote.estado?.cfg) {
          token.current = crypto.randomUUID();
          localStorage.setItem(CHAVE, token.current);
          sessionStorage.removeItem('conviteia:briefing');

          setInicial(pacote.estado);
          setResumoIA(pacote.resumo ?? null);

          // Salva imediatamente para o trabalho da IA não se perder se a pessoa
          // fechar a aba antes de editar o primeiro campo.
          fetch('/api/conviteria/rascunho', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token.current,
              estado: pacote.estado,
            }),
          }).catch(() => undefined);

          setCarregando(false);
          return;
        }
      } catch {
        sessionStorage.removeItem('conviteia:briefing');
      }
    }

    token.current = localStorage.getItem(CHAVE) ?? crypto.randomUUID();
    localStorage.setItem(CHAVE, token.current);

    fetch(`/api/conviteria/rascunho?token=${token.current}`)
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
          sessionStorage.setItem('conviteia:publicar', JSON.stringify(estado));
          window.location.href = '/convite/entrar?destino=publicar';
        }}
      />
    </>
  );
}
