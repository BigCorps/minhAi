'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import './briefing.css';

const EXEMPLOS = [
  {
    rotulo: 'Casamento',
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

type ModoBriefing = 'completo' | 'campo' | 'acoes' | 'landing';

export default function BriefingInteligente({
  modo = 'completo',
  texto: textoControlado,
  aoTexto,
}: {
  modo?: ModoBriefing;
  texto?: string;
  aoTexto?: (texto: string) => void;
}) {
  const [textoInterno, setTextoInterno] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const controlado = typeof textoControlado === 'string';
  const texto = controlado ? textoControlado : textoInterno;

  function definirTexto(valor: string) {
    if (!controlado) setTextoInterno(valor);
    aoTexto?.(valor);
  }

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

  const mostrarCampo =
    modo === 'completo' ||
    modo === 'campo' ||
    modo === 'landing';

  const mostrarAcoes =
    modo === 'completo' ||
    modo === 'acoes' ||
    modo === 'landing';

  return (
    <section
      className={`cv-briefing-box cv-briefing-modo-${modo}`}
      aria-label="Crie seu convite com IA"
    >
      {mostrarCampo && (
        <div className="cv-briefing-campo-wrap">
          <textarea
            value={texto}
            maxLength={2500}
            onChange={(e) => definirTexto(e.target.value)}
            placeholder="Ex.: Vou casar com João dia 10 de novembro de 2026 às 19h em São Paulo. Quero um convite romântico rosa, com nossa foto, confirmação de presença e lista de presentes…"
            aria-label="Conte como você imagina seu convite"
          />

          {texto.length > 0 && (
            <span className="cv-briefing-contador">{texto.length}/2500</span>
          )}
        </div>
      )}

      {mostrarAcoes && (
        <>
          <div className="cv-briefing-exemplos">
            <span>Não sabe por onde começar? Experimente:</span>
            <div>
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex.rotulo}
                  type="button"
                  onClick={() => {
                    definirTexto(ex.texto);
                    setErro('');
                  }}
                >
                  {ex.rotulo}
                </button>
              ))}
            </div>
          </div>

          {texto.trim() && modo === 'acoes' && (
            <p className="cv-briefing-texto-pronto">
              Sua descrição da primeira tela está pronta para ser interpretada.
            </p>
          )}

          {erro && <p className="cv-briefing-erro">{erro}</p>}

          {modo === 'landing' ? (
            <div className="cv-briefing-botoes-landing">
              <Link
                href="/convite/entrar"
                className="cv-briefing-botao-lateral"
              >
                Já Tenho Conta
              </Link>

              <button
                type="button"
                className="cv-briefing-criar cv-briefing-criar-landing"
                onClick={criar}
                disabled={carregando}
              >
                <Sparkles className="h-5 w-5" />
                <span>
                  {carregando ? 'Entendendo…' : 'Criar meu Convite com IA'}
                </span>
                {!carregando && <ArrowRight className="h-5 w-5" />}
              </button>

              <Link
                href="/convite/criar"
                className="cv-briefing-botao-lateral"
              >
                Começar do Zero
              </Link>
            </div>
          ) : (
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
          )}

          {carregando && (
            <div className="cv-briefing-pensando" aria-live="polite">
              <span />
              Estou separando o que já consigo preencher e o que é melhor você escolher.
            </div>
          )}
        </>
      )}
    </section>
  );
}
