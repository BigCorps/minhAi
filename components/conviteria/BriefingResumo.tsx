'use client';

import { Check, Lightbulb, Sparkles, WandSparkles, X } from 'lucide-react';
import type { ResumoBriefing } from '@/lib/conviteria/briefing';
import './briefing.css';

export default function BriefingResumo({
  resumo,
  aoContinuar,
}: {
  resumo: ResumoBriefing;
  aoContinuar: () => void;
}) {
  return (
    <div className="cv-briefing-resumo-fundo" role="dialog" aria-modal="true">
      <div className="cv-briefing-resumo">
        <button
          type="button"
          className="cv-briefing-resumo-fechar"
          onClick={aoContinuar}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="cv-briefing-resumo-icone">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2>{resumo.titulo}</h2>
        <p className="cv-briefing-resumo-mensagem">{resumo.mensagem}</p>

        {resumo.adiantados.length > 0 && (
          <section>
            <h3>
              <Check className="h-4 w-4" />
              Já adiantei
            </h3>
            <div className="cv-briefing-chips">
              {resumo.adiantados.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        )}

        {resumo.sugestoes.length > 0 && (
          <section>
            <h3>
              <WandSparkles className="h-4 w-4" />
              Sugeri para combinar com sua ideia
            </h3>
            <div className="cv-briefing-chips cv-briefing-chips-sugestao">
              {resumo.sugestoes.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        )}

        {resumo.pendencias.length > 0 && (
          <section>
            <h3>
              <Lightbulb className="h-4 w-4" />
              Você escolhe ou confirma nas próximas etapas
            </h3>
            <ul className="cv-briefing-pendencias">
              {resumo.pendencias.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {resumo.pedidosEspeciais.length > 0 && (
          <div className="cv-briefing-especial">
            <strong>Também guardei estes pedidos especiais:</strong>
            <ul>
              {resumo.pedidosEspeciais.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Eles não serão aplicados automaticamente agora, mas você pode montar
              todo o restante do convite normalmente.
            </p>
          </div>
        )}

        <p className="cv-briefing-revisar">
          Nada está definitivo. Você poderá revisar e alterar tudo antes de publicar.
        </p>

        <button type="button" className="cv-briefing-continuar" onClick={aoContinuar}>
          Continuar personalizando
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
