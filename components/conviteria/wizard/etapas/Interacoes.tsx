'use client';

import { MessageSquareText, UserCheck } from 'lucide-react';
import type { SecaoConfig, TipoSecao } from '@/lib/conviteria/tipos';
import type { PropsEtapa } from '../Wizard';
import '../interacoes.css';

type TipoInteracao = 'rsvp' | 'recados';

const PADRAO = {
  rsvp: {
    titulo: 'Confirmação de presença',
    texto: 'Sua presença é muito importante para nós. Confirme seu nome e quem da sua família irá ao evento.',
    botao: 'Confirmar presença',
  },
  recados: {
    titulo: 'Recados',
    texto: 'Queremos guardar suas palavras. Deixe um recado no nosso mural.',
    botao: 'Deixar um recado',
  },
} as const;

function maiorOrdem(secoes: SecaoConfig[]) {
  return secoes.reduce((maior, s) => Math.max(maior, s.ordem), 0);
}

export default function Interacoes({ estado, despachar }: PropsEtapa) {
  const secoes = estado.cfg.secoes;

  function secao(tipo: TipoInteracao) {
    return secoes.find((s) => s.tipo === tipo);
  }

  function alternar(tipo: TipoInteracao) {
    const atual = secao(tipo);

    if (atual) {
      despachar({ tipo: 'alternarSecao', secao: tipo });
      return;
    }

    despachar({
      tipo: 'campo',
      caminho: 'secoes',
      valor: [
        ...secoes,
        {
          tipo,
          ordem: maiorOrdem(secoes) + 10,
          ativo: true,
        },
      ],
    });
  }

  function configurar(tipo: TipoInteracao, chave: string, valor: string) {
    const atual = secao(tipo);

    if (!atual) {
      const nova: SecaoConfig = {
        tipo,
        ordem: maiorOrdem(secoes) + 10,
        ativo: true,
        config: { [chave]: valor },
      };

      despachar({
        tipo: 'campo',
        caminho: 'secoes',
        valor: [...secoes, nova],
      });
      return;
    }

    despachar({
      tipo: 'configSecao',
      secao: tipo as TipoSecao,
      chave,
      valor,
    });
  }

  const itens: Array<{
    tipo: TipoInteracao;
    Icone: typeof UserCheck;
    descricao: string;
    detalhe: string;
  }> = [
    {
      tipo: 'rsvp',
      Icone: UserCheck,
      descricao: 'Seus convidados informam nome, e-mail e quem da família irá ao evento.',
      detalhe: 'As confirmações ficam organizadas no painel do convite.',
    },
    {
      tipo: 'recados',
      Icone: MessageSquareText,
      descricao: 'Seus convidados podem deixar mensagens para os anfitriões.',
      detalhe: 'Você visualiza, aprova ou remove os recados pelo painel.',
    },
  ];

  return (
    <>
      <p className="wz-intro">
        Escolha como seus convidados vão interagir com o convite. Você pode
        personalizar os textos agora e reorganizar tudo depois em “Seções”.
      </p>

      <div className="wz-interacoes">
        {itens.map(({ tipo, Icone, descricao, detalhe }) => {
          const atual = secao(tipo);
          const ativo = atual?.ativo ?? false;
          const padrao = PADRAO[tipo];

          return (
            <section
              key={tipo}
              className={`wz-interacao-card${ativo ? ' ativo' : ''}`}
            >
              <div className="wz-interacao-topo">
                <span className="wz-interacao-icone">
                  <Icone className="h-5 w-5" />
                </span>

                <div className="wz-interacao-titulos">
                  <strong>{padrao.titulo}</strong>
                  <p>{descricao}</p>
                </div>

                <button
                  type="button"
                  className={`wz-interacao-toggle${ativo ? ' ativo' : ''}`}
                  onClick={() => alternar(tipo)}
                  aria-pressed={ativo}
                >
                  {ativo ? 'Ativado' : 'Ativar'}
                </button>
              </div>

              <p className="wz-interacao-detalhe">{detalhe}</p>

              {ativo && (
                <div className="wz-interacao-campos">
                  <label>
                    <span>Título no convite</span>
                    <input
                      type="text"
                      maxLength={80}
                      value={String(atual?.config?.titulo ?? padrao.titulo)}
                      onChange={(e) => configurar(tipo, 'titulo', e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Texto explicativo</span>
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={String(atual?.config?.texto ?? padrao.texto)}
                      onChange={(e) => configurar(tipo, 'texto', e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Texto do botão</span>
                    <input
                      type="text"
                      maxLength={60}
                      value={String(atual?.config?.rotuloBotao ?? padrao.botao)}
                      onChange={(e) => configurar(tipo, 'rotuloBotao', e.target.value)}
                    />
                  </label>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="wz-aviso">
        Na etapa “Seções” você ainda poderá desligar e mudar a posição de cada bloco.
      </p>
    </>
  );
}
