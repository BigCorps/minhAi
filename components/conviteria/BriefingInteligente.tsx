'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import './briefing.css';

const EXEMPLOS = [
  {
    rotulo: 'Casamento romântico',
    texto: 'Vou casar com João no dia 10 de novembro de 2026 às 19h, em São Paulo. Quero um convite romântico em tons de rosa, com nossa foto, confirmação de presença e lista de presentes.',
  },
  {
    rotulo: '15 anos',
    texto: 'Quero um convite de 15 anos para a Maria, dia 20 de março de 2027 às 20h, no Espaço Celebrare. Quero algo elegante em lavanda, com foto, música e confirmação de presença.',
  },
  {
    rotulo: 'Aniversário infantil',
    texto: 'Preciso de um convite de aniversário infantil para o Pedro. Quero algo alegre e divertido, com foto, lista de presentes e confirmação de presença. Ainda vou escolher a data e o local.',
  },
  {
    rotulo: 'Evento empresarial',
    texto: 'Quero um convite para a confraternização da empresa, dia 12 de dezembro de 2026 às 18h, na Av. Paulista, 1000, São Paulo. Estilo moderno e clean, com confirmação de presença.',
  },
];

export default function BriefingInteligente() {
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function criar() {
    setErro('');

    if (texto.trim().length < 15) {
      setErro('Conte um pouco mais sobre como você imagina seu convite.');
      return;
    }

    setCarregando(true);

    try {
      const r = await fetch('/api/conviteria/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto.trim() }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(j?.erro || 'Não consegui interpretar sua ideia agora.');
      }

      sessionStorage.setItem('conviteia:briefing', JSON.stringify(j));
      window.location.href = '/convite/criar?origem=ia';
    } catch (e: any) {
      setErro(e.message || 'Não consegui interpretar sua ideia agora.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="cv-briefing-box" aria-labelledby="cv-briefing-titulo">
      <div className="cv-briefing-selo">
        <Sparkles className="h-4 w-4" />
        Comece com IA
      </div>

      <h2 id="cv-briefing-titulo">Como você imagina seu convite?</h2>

      <p className="cv-briefing-sub">
        Conte do seu jeito. Nomes, data, local, estilo, cores, presentes,
        música ou qualquer detalhe que você já tenha em mente.
      </p>

      <textarea
        value={texto}
        maxLength={2500}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex.: Vou casar com João dia 10 de novembro de 2026 às 19h em São Paulo. Quero um convite romântico rosa, com nossa foto, confirmação de presença e lista de presentes…"
        aria-label="Conte como você imagina seu convite"
      />

      <div className="cv-briefing-rodape-campo">
        <span>{texto.length}/2500</span>
        <span>Você poderá revisar tudo depois.</span>
      </div>

      <div className="cv-briefing-exemplos">
        <span>Experimente:</span>
        <div>
          {EXEMPLOS.map((ex) => (
            <button
              key={ex.rotulo}
              type="button"
              onClick={() => {
                setTexto(ex.texto);
                setErro('');
              }}
            >
              {ex.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="cv-briefing-erro">{erro}</p>}

      <button
        type="button"
        className="cv-briefing-criar"
        onClick={criar}
        disabled={carregando}
      >
        <Sparkles className="h-5 w-5" />
        {carregando ? 'Entendendo sua ideia…' : 'Criar meu convite com IA'}
        {!carregando && <ArrowRight className="h-5 w-5" />}
      </button>

      {carregando && (
        <div className="cv-briefing-pensando" aria-live="polite">
          <span />
          Estou separando o que já consigo preencher e o que é melhor você escolher.
        </div>
      )}
    </section>
  );
}
