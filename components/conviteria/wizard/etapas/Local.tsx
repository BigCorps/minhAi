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

type Status = 'ocioso' | 'buscando' | 'nao-encontrado' | 'erro' | 'ok' | 'com-mapa';

/**
 * Geocodifica o endereco e devolve os dois links do mapa.
 *
 * A chave do Google fica na edge `google-maps-proxy`, nunca no cliente — por
 * isso o geocoding passa por la. Ja o iframe usa a forma classica
 * `maps.google.com/maps?q=...&output=embed`, que dispensa chave: usar a Embed
 * API obrigaria a por a key na src do iframe, ou seja, publica no HTML de
 * todo convite.
 */
async function linksDoMapa(termo: string) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
    body: { termo },
  });

  if (error) return null;
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;

  const q = `${loc.lat},${loc.lng}`;
  return {
    mapEmbedUrl: `https://maps.google.com/maps?q=${q}&z=16&output=embed`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
  };
}

export default function Local({ estado, despachar }: PropsEtapa) {
  const l = estado.cfg.local ?? {};
  const [status, setStatus] = useState<Status>('ocioso');

  // Ultimo CEP consultado: evita repetir a chamada quando a pessoa apaga e
  // redigita o mesmo numero.
  const ultimoCep = useRef('');

  const campo = (caminho: string) => (v: string) =>
    despachar({ tipo: 'campo', caminho: `local.${caminho}`, valor: v });

  async function buscarCep(bruto: string) {
    const cep = bruto.replace(/\D/g, '');
    if (cep.length !== 8 || cep === ultimoCep.current) return;
    ultimoCep.current = cep;
    setStatus('buscando');

    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!r.ok) throw new Error('falhou');
      const d = await r.json();

      if (d.erro) {
        setStatus('nao-encontrado');
        return;
      }

      // O ViaCEP devolve a rua SEM numero. Se a pessoa ja tinha digitado
      // "Rua X, 96", preserva o 96 e troca so o nome da rua — senao o
      // preenchimento automatico apagaria o numero que ela acabou de por.
      const numero = (l.logradouro ?? '').match(/,\s*(\d+[^,]*)$/)?.[1];
      const rua = d.logradouro
        ? (numero ? `${d.logradouro}, ${numero}` : d.logradouro)
        : (l.logradouro ?? '');

      if (rua) campo('logradouro')(rua);
      if (d.bairro) campo('bairro')(d.bairro);
      if (d.localidade) campo('cidade')(`${d.localidade} - ${d.uf}`);

      setStatus('ok');

      // Mapa: falha aqui e silenciosa de proposito. O endereco ja foi
      // preenchido, que e o que a pessoa pediu; sem mapa o convite continua
      // mostrando o endereco por escrito. Um alerta aqui so assustaria.
      const links = await linksDoMapa(
        [rua, d.bairro, d.localidade, d.uf].filter(Boolean).join(', ')
      );
      if (links) {
        campo('mapEmbedUrl')(links.mapEmbedUrl);
        campo('mapsUrl')(links.mapsUrl);
        setStatus('com-mapa');
      }
    } catch {
      // Falha de rede nao pode travar o cadastro: os campos seguem editaveis
      // a mao, e a mensagem diz isso em vez de so mostrar erro.
      setStatus('erro');
    }
  }

  return (
    <>
      {/* O CEP vem primeiro de proposito: ele preenche os tres campos abaixo,
          e pedir depois faria a pessoa digitar tudo duas vezes. */}
      <Campo rotulo="CEP" dica="Digite o CEP e o endereço é preenchido sozinho.">
        <Texto
          valor={l.cep ?? ''}
          placeholder="01310-100"
          maxLength={9}
          onChange={(v) => {
            const fmt = mascaraCep(v);
            campo('cep')(fmt);
            setStatus('ocioso');
            if (fmt.replace(/\D/g, '').length === 8) void buscarCep(fmt);
          }}
        />
        {status === 'buscando' && <p className="wz-status">Buscando endereço…</p>}
        {status === 'ok' && <p className="wz-status ok">Endereço preenchido. Confira o número.</p>}
        {status === 'com-mapa' && <p className="wz-status ok">Endereço e mapa preenchidos. Confira o número.</p>}
        {status === 'nao-encontrado' && <p className="wz-status erro">CEP não encontrado. Preencha abaixo.</p>}
        {status === 'erro' && <p className="wz-status erro">Não deu para consultar o CEP agora. Preencha abaixo.</p>}
      </Campo>

      <Campo rotulo="Nome do espaço" dica="Opcional.">
        <Texto valor={l.nome ?? ''} placeholder="Espaço Celebrare" onChange={campo('nome')} />
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
        dica="Preenchido pelo CEP. Só mexa se quiser apontar para outro ponto."
      >
        <Texto valor={l.mapsUrl ?? ''} placeholder="https://maps.google.com/..." maxLength={500} onChange={campo('mapsUrl')} />
      </Campo>
    </>
  );
}
