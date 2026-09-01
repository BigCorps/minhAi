// components/analytics/ClarityInit.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Clarity from '@microsoft/clarity';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ POR QUE ESTE COMPONENTE VIROU CONSCIENTE DE ROTA
//
// O Clarity grava a sessão: movimento do ponteiro, toques e o conteúdo da
// tela. Dentro da MelhorIA isso significaria enviar para a Microsoft telas com
// nome de medicamento, dosagem, horário, consulta médica e resultado de exame.
//
// Isso é dado pessoal SENSÍVEL de saúde (LGPD, art. 5º II e art. 11), e
// mandá-lo para um terceiro seria:
//
//   · compartilhamento de dado de saúde sem base legal específica;
//   · contradição direta com a Data safety da Play Store, onde declaramos que
//     dado de saúde NÃO é compartilhado com terceiros;
//   · quebra do que o nosso próprio aviso de privacidade promete.
//
// A LANDING continua sendo gravada. Ela é página pública de marketing, sem
// login e sem nenhum dado de saúde — é justamente ali que a gravação é útil,
// para entender onde a pessoa desiste antes de criar a conta.
//
// As outras marcas (minhAi, ConviteIA, Pix Wiki, ArteFinal, ConsultaTec)
// seguem exatamente como estavam.
// ─────────────────────────────────────────────────────────────────────────────

const MELHORIA_HOSTS = ['melhoria.org', 'www.melhoria.org'];

/**
 * A gravação é permitida nesta tela?
 *
 * Atenção ao detalhe do caminho: em melhoria.org o middleware faz REWRITE, que
 * não muda a barra de endereço. Então o navegador enxerga `/` na landing e
 * `/app`, `/remedios` etc. nas telas internas — nunca `/melhoria/...`.
 * Em desenvolvimento (`localhost:3000/melhoria`) acontece o contrário, e por
 * isso os dois formatos são tratados.
 */
function podeGravar(pathname: string): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  const ehHostMelhoria = MELHORIA_HOSTS.includes(host);
  const ehCaminhoMelhoria =
    pathname === '/melhoria' || pathname.startsWith('/melhoria/');

  // Outra marca: nada muda.
  if (!ehHostMelhoria && !ehCaminhoMelhoria) return true;

  // Dentro da MelhorIA, só a landing.
  return pathname === '/' || pathname === '/melhoria' || pathname === '/melhoria/';
}

export default function ClarityInit() {
  const pathname = usePathname();

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (typeof window === 'undefined' || !projectId) return;

    if (!podeGravar(pathname)) {
      // Não inicializa. E se por algum caminho o Clarity já estiver rodando
      // (por exemplo, a pessoa entrou pela landing), retira o consentimento —
      // é o que a biblioteca oferece para interromper a coleta em tempo de
      // execução, já que não existe um `stop()`.
      try {
        Clarity.consentV2({
          ad_Storage: 'denied',
          analytics_Storage: 'denied',
        });
      } catch {
        // Clarity não inicializado: não é erro.
      }
      return;
    }

    Clarity.init(projectId);
  }, [pathname]);

  return null;
}
