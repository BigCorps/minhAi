'use client';

import { Campo, Texto } from '../Campos';
import type { PropsEtapa } from '../Wizard';

export default function Local({ estado, despachar }: PropsEtapa) {
  const l = estado.cfg.local ?? {};
  const campo = (caminho: string) => (v: string) =>
    despachar({ tipo: 'campo', caminho: `local.${caminho}`, valor: v });

  return (
    <>
      <Campo rotulo="Nome do espaço" dica="Opcional.">
        <Texto valor={l.nome ?? ''} placeholder="Espaço Villa Giordano" onChange={campo('nome')} />
      </Campo>
      <Campo rotulo="Rua e número">
        <Texto valor={l.logradouro ?? ''} placeholder="Rua Pascoal Daniel, 96" onChange={campo('logradouro')} />
      </Campo>
      <Campo rotulo="Bairro">
        <Texto valor={l.bairro ?? ''} placeholder="Vila Giordano" onChange={campo('bairro')} />
      </Campo>
      <Campo rotulo="Cidade e estado">
        <Texto valor={l.cidade ?? ''} placeholder="São Paulo - SP" onChange={campo('cidade')} />
      </Campo>
      <Campo rotulo="CEP">
        <Texto valor={l.cep ?? ''} placeholder="08020-370" maxLength={9} onChange={campo('cep')} />
      </Campo>
      <Campo
        rotulo="Link do Google Maps"
        dica="Abra o local no Maps, toque em Compartilhar e cole o link aqui."
      >
        <Texto valor={l.mapsUrl ?? ''} placeholder="https://maps.google.com/..." maxLength={500} onChange={campo('mapsUrl')} />
      </Campo>
    </>
  );
}
