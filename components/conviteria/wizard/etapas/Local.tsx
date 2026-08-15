'use client';

import { useRef, useState } from 'react';
import { Campo, Texto } from '../Campos';
import type { PropsEtapa } from '../Wizard';
import { createClient } from '@/lib/supabase-browser';

/** 00000000 -> 00000-000. Formata enquanto a pessoa digita. */
function mascaraCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

type Status =
  | 'ocioso'
  | 'buscando'
  | 'nao-encontrado'
  | 'erro'
  | 'ok'
  | 'com-mapa';

interface Achado {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  mapEmbedUrl?: string;
  mapsUrl?: string;
  /** O que o Google entendeu. Mostrado para a pessoa conferir. */
  confirmacao?: string;
}

/**
 * Chama a edge `google-maps-proxy`.
 *
 * A chave do Google fica na edge, nunca no cliente. Já o iframe usa a forma
 * clássica `maps.google.com/maps?q=...&output=embed`, que dispensa chave:
 * usar a Embed API obrigaria a pôr a key na src do iframe, ou seja, pública
 * no HTML de todo convite.
 */
async function geocodificar(termo: string) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { termo },
  });
  if (error) return null;
  return data?.results?.[0] ?? null;
}

/**
 * Extrai os campos do `address_components` do Google.
 *
 * Os tipos são estáveis, mas nem todo endereço traz todos: rua sem número
 * não tem `street_number`, e em cidade pequena o bairro pode vir em
 * `sublocality` ou não vir. Por isso cada campo é opcional e o que faltar
 * simplesmente não sobrescreve o que a pessoa já digitou.
 */
function extrairComponentes(resultado: {
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
}): Achado {
  const comp = resultado.address_components ?? [];
  const pega = (tipo: string, curto = false) => {
    const c = comp.find((x) => x.types.includes(tipo));
    return c ? (curto ? c.short_name : c.long_name) : undefined;
  };

  const rua = pega('route');
  const numero = pega('street_number');
  const bairro = pega('sublocality_level_1') ?? pega('sublocality') ?? pega('neighborhood');
  const cidade = pega('administrative_area_level_2') ?? pega('locality');
  const uf = pega('administrative_area_level_1', true);

  const achado: Achado = {
    cep: pega('postal_code'),
    logradouro: rua ? (numero ? `${rua}, ${numero}` : rua) : undefined,
    bairro,
    cidade: cidade ? (uf ? `${cidade} - ${uf}` : cidade) : undefined,
    confirmacao: resultado.formatted_address,
  };

  const loc = resultado.geometry?.location;
  if (loc) {
    const q = `${loc.lat},${loc.lng}`;
    achado.mapEmbedUrl = `https://maps.google.com/maps?q=${q}&z=16&output=embed`;
    achado.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  return achado;
}

export default function Local({ estado, despachar }: PropsEtapa) {
  const l = estado.cfg.local ?? {};
  const [status, setStatus] = useState<Status>('ocioso');
  const [busca, setBusca] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  // Último termo consultado: evita repetir a chamada quando a pessoa aperta
  // Enter duas vezes ou apaga e redigita o mesmo texto.
  const ultimoTermo = useRef('');

  const campo = (caminho: string) => (v: string) =>
    despachar({ tipo: 'campo', caminho: `local.${caminho}`, valor: v });

  /** Aplica só o que veio preenchido, sem apagar o que a pessoa já digitou. */
  function aplicar(a: Achado) {
    if (a.cep) campo('cep')(mascaraCep(a.cep));
    if (a.logradouro) campo('logradouro')(a.logradouro);
    if (a.bairro) campo('bairro')(a.bairro);
    if (a.cidade) campo('cidade')(a.cidade);
    if (a.mapEmbedUrl) campo('mapEmbedUrl')(a.mapEmbedUrl);
    if (a.mapsUrl) campo('mapsUrl')(a.mapsUrl);
    setConfirmacao(a.confirmacao ?? '');
    setStatus(a.mapEmbedUrl ? 'com-mapa' : 'ok');
  }

  /** Caminho do CEP: ViaCEP é gratuito e não tem cota, então vale a pena. */
  async function porCep(cep: string) {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) throw new Error('falhou');
    const d = await r.json();
    if (d.erro) return null;

    // O ViaCEP devolve a rua SEM número. Se a pessoa já tinha digitado
    // "Rua X, 96", preserva o 96 e troca só o nome da rua — senão o
    // preenchimento automático apagaria o número que ela acabou de pôr.
    const numero = (l.logradouro ?? '').match(/,\s*(\d+[^,]*)$/)?.[1];
    const rua = d.logradouro
      ? numero
        ? `${d.logradouro}, ${numero}`
        : d.logradouro
      : l.logradouro ?? '';

    const achado: Achado = {
      cep,
      logradouro: rua || undefined,
      bairro: d.bairro || undefined,
      cidade: d.localidade ? `${d.localidade} - ${d.uf}` : undefined,
      confirmacao: [rua, d.bairro, d.localidade].filter(Boolean).join(', '),
    };

    // Mapa: falha aqui é silenciosa de propósito. O endereço já foi
    // preenchido, que é o que a pessoa pediu; sem mapa o convite continua
    // mostrando o endereço por escrito. Um alerta aqui só assustaria.
    const g = await geocodificar(
      [rua, d.bairro, d.localidade, d.uf].filter(Boolean).join(', ')
    );
    if (g) {
      const comp = extrairComponentes(g);
      achado.mapEmbedUrl = comp.mapEmbedUrl;
      achado.mapsUrl = comp.mapsUrl;
    }

    return achado;
  }

  async function buscar(termo: string) {
    const limpo = termo.trim();
    if (limpo.length < 3 || limpo === ultimoTermo.current) return;
    ultimoTermo.current = limpo;
    setStatus('buscando');
    setConfirmacao('');

    try {
      const digitos = limpo.replace(/\D/g, '');
      const ehCep = digitos.length === 8 && limpo.replace(/[\d\s-]/g, '') === '';

      const achado = ehCep ? await porCep(digitos) : null;

      if (achado) {
        aplicar(achado);
        return;
      }

      // Não é CEP, ou o CEP não existe: tenta como endereço livre.
      // "Brasil" no fim evita que "Rua Augusta" caia em outro país.
      const g = await geocodificar(ehCep ? limpo : `${limpo}, Brasil`);
      if (!g) {
        setStatus('nao-encontrado');
        return;
      }
      aplicar(extrairComponentes(g));
    } catch {
      // Falha de rede não pode travar o cadastro: os campos seguem editáveis
      // à mão, e a mensagem diz isso em vez de só mostrar erro.
      setStatus('erro');
    }
  }

  return (
    <>
      {/* Campo único de busca: aceita CEP, endereço ou nome do local.
          A busca NÃO dispara a cada tecla — só no Enter, no botão ou ao sair
          do campo. Geocoding do Google é cobrado por chamada; disparar por
          tecla multiplicaria o custo por vinte sem melhorar nada. Exceção: um
          CEP completo dispara sozinho, porque aí a consulta é no ViaCEP, que
          é gratuito e sem cota. */}
      <Campo
        rotulo="Buscar endereço"
        dica="Digite o CEP, o endereço ou o nome do local. Confira o resultado antes de seguir."
      >
        <div className="wz-busca">
          <input
            type="text"
            className="wz-input"
            value={busca}
            placeholder="01310-100 ou Av. Paulista, 1000"
            maxLength={160}
            onChange={(e) => {
              const v = e.target.value;
              setBusca(v);
              setStatus('ocioso');
              const d = v.replace(/\D/g, '');
              if (d.length === 8 && v.replace(/[\d\s-]/g, '') === '') void buscar(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void buscar(busca);
              }
            }}
            onBlur={() => void buscar(busca)}
          />
          <button
            type="button"
            className="wz-busca-btn"
            onClick={() => void buscar(busca)}
            disabled={status === 'buscando'}
          >
            {status === 'buscando' ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {status === 'ok' && <p className="wz-status ok">Endereço preenchido. Confira abaixo.</p>}
        {status === 'com-mapa' && <p className="wz-status ok">Endereço e mapa preenchidos. Confira abaixo.</p>}
        {status === 'nao-encontrado' && <p className="wz-status erro">Não encontramos. Preencha nos campos abaixo.</p>}
        {status === 'erro' && <p className="wz-status erro">Não deu para consultar agora. Preencha nos campos abaixo.</p>}

        {/* Mostrar o que o Google entendeu é essencial numa busca por texto
            livre: "Rua Augusta" existe em dezenas de cidades, e sem essa
            confirmação a pessoa publicaria o convite apontando para a rua
            errada sem nunca perceber. */}
        {confirmacao && <p className="wz-confirmacao">Encontramos: {confirmacao}</p>}
      </Campo>

      <Campo rotulo="Nome do espaço" dica="Opcional.">
        <Texto valor={l.nome ?? ''} placeholder="Espaço Celebrare" onChange={campo('nome')} />
      </Campo>
      <Campo rotulo="CEP">
        <Texto
          valor={l.cep ?? ''}
          placeholder="01310-100"
          maxLength={9}
          onChange={(v) => campo('cep')(mascaraCep(v))}
        />
      </Campo>
      <Campo rotulo="Rua e número">
        <Texto valor={l.logradouro ?? ''} placeholder="Av. Paulista, 1000" onChange={campo('logradouro')} />
      </Campo>
      <Campo rotulo="Bairro">
        <Texto valor={l.bairro ?? ''} placeholder="Bela Vista" onChange={campo('bairro')} />
      </Campo>
      <Campo rotulo="Cidade e estado">
        <Texto valor={l.cidade ?? ''} placeholder="São Paulo - SP" onChange={campo('cidade')} />
      </Campo>
      <Campo
        rotulo="Link do Google Maps"
        dica="Preenchido pela busca. Só mexa se quiser apontar para outro ponto."
      >
        <Texto valor={l.mapsUrl ?? ''} placeholder="https://maps.google.com/..." maxLength={500} onChange={campo('mapsUrl')} />
      </Campo>
    </>
  );
}
