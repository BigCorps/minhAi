'use client'
// Conhecimento · Consultas
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesConhecimento() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Conhecimento',
        color: '#8b5cf6',
        funcoes: [
          { nome: 'Respostas Rápidas',    desc: 'Suas próprias perguntas frequentes' },
          { nome: 'Perguntas Gerais',     desc: 'Dúvidas gerais via ChatGPT',          meta: true },
          { nome: 'Criador de Posts',     desc: 'Artes e posts com IA',                spark: true },
          { nome: 'Criar Orçamento',      desc: 'Orçamentos gerados por IA',           spark: true },
          { nome: 'Transcrever Áudio',    desc: 'Áudio para texto',                    meta: true },
          { nome: 'Transcrever Vídeo',    desc: 'Vídeo para texto' },
          { nome: 'Texto em Áudio',       desc: 'Gera MP3 a partir de texto' },
          { nome: 'Traduzir Texto',       desc: 'Tradução entre idiomas com IA' },
          { nome: 'Clima e Tempo',        desc: 'Previsão do tempo em tempo real' },
        ],
      }}
      cat2={{
        nome: 'Consultas',
        color: '#fbbf24',
        funcoes: [
          { nome: 'Dados CPF',           desc: 'Dados cadastrais de CPF',      premium: true },
          { nome: 'Dados CNPJ',          desc: 'Dados cadastrais de CNPJ',     premium: true },
          { nome: 'Restrições CPF',      desc: 'Score e restrições de crédito',premium: true },
          { nome: 'Restrições CNPJ',     desc: 'Score e restrições de CNPJ',   premium: true },
          { nome: 'Consulta Protestos',  desc: 'Pendências em cartório',       premium: true },
          { nome: 'Consultar Placa',     desc: 'Dados completos de veículos',  premium: true },
        ],
      }}
    />
  )
}
