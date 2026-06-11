'use client'
// Localização · Informação
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesLocalizacao() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Localização',
        color: '#6366f1',
        funcoes: [
          { nome: 'Nosso Endereço',    desc: 'Mapa interativo com QR Code' },
          { nome: 'Buscar Endereço',   desc: 'Endereço completo por CEP ou nome' },
          { nome: 'Traçar Rota',       desc: 'Calcula e exibe rota no mapa' },
          { nome: 'Consultar CEP',     desc: 'CEP com mapa e relatório' },
          { nome: 'Rastreio Correios', desc: 'Rastreia encomendas em tempo real' },
          { nome: 'Consultar DDD',     desc: 'Estado e cidades por DDD', premium: true },
        ],
      }}
      cat2={{
        nome: 'Informação',
        color: '#14b8a6',
        funcoes: [
          { nome: 'Cotação de Câmbio',   desc: 'Moedas em tempo real' },
          { nome: 'Clima e Tempo',       desc: 'Previsão atual e semanal' },
          { nome: 'Ver Notícias',        desc: '5 manchetes do momento' },
          { nome: 'Calculadora de Juros',desc: 'Juros simples e compostos' },
          { nome: 'Calculadora de IMC',  desc: 'IMC com classificação OMS' },
          { nome: 'Converter Medidas',   desc: 'Peso, volume, temperatura...' },
          { nome: 'Feriados Nacionais',  desc: 'Lista de feriados por ano' },
          { nome: 'Pesquisar Produto',   desc: '5 resultados mais relevantes' },
        ],
      }}
    />
  )
}
