'use client';

// components/conviteria/HeaderDono.tsx
//
// Barra de administracao no convite publicado, visivel APENAS para o dono.
//
// O convidado nunca ve: ele nao tem conta, e uma barra de administracao sobre o
// convite quebraria a ilusao de peca impressa, que e o produto. Por isso a
// checagem e dupla — precisa haver sessao E o evento precisa ser dessa conta.
//
// A verificacao roda no cliente e o resultado nao e segredo: saber que existe
// um botao "editar" nao da acesso a nada. Quem protege de verdade e o PATCH em
// /api/conviteria/evento, que confere posse no servidor.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Pencil, LayoutGrid } from 'lucide-react';

export default function HeaderDono({ eventoId }: { eventoId: string }) {
  const [dono, setDono] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getSession();
      const acesso = data.session?.access_token;
      if (!acesso) return;

      // Reusa a rota de edicao: se ela devolve 200 para este id, a pessoa e a
      // dona. Nao ha endpoint novo nem regra de posse duplicada.
      const r = await fetch(`/api/conviteria/evento?id=${encodeURIComponent(eventoId)}`, {
        headers: { Authorization: `Bearer ${acesso}` },
      });
      if (!cancelado && r.ok) setDono(true);
    })();

    return () => { cancelado = true; };
  }, [eventoId]);

  if (!dono) return null;

  return (
    <div className="cv-header-dono">
      <span className="cv-header-dono-rotulo">Você está vendo seu convite</span>
      <div className="cv-header-dono-acoes">
        <a href={`/convite/editar/${eventoId}`}>
          <Pencil className="w-4 h-4" aria-hidden="true" />
          Editar
        </a>
        <a href="/convite/painel">
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          Painel
        </a>
      </div>
    </div>
  );
}
