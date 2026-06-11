'use client'
// Multimídia · Utilitários
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesMidia() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Multimídia',
        color: '#ec4899',
        funcoes: [
          { nome: 'Tocar Música',       desc: 'YouTube Music por voz' },
          { nome: 'Tocar Vídeo',        desc: 'YouTube por comando de voz' },
          { nome: 'Playlist',           desc: 'Playlists com navegação por voz', premium: true },
          { nome: 'Sequência de Vídeos',desc: 'Sequência automática de vídeos' },
          { nome: 'Painel de Ofertas',  desc: 'Slideshow do Google Drive',        premium: true },
          { nome: 'Porta Retrato',      desc: 'Fotos com música de fundo',        premium: true },
          { nome: 'Vídeo de Instruções',desc: 'Tutorial ou explicativo' },
          { nome: 'Canal do YouTube',   desc: 'Canal da empresa com QR Code' },
          { nome: 'Vídeo Chamada',      desc: 'Google Meet entre colaboradores',  premium: true },
        ],
      }}
      cat2={{
        nome: 'Utilitários',
        color: '#f97316',
        funcoes: [
          { nome: 'Emitir Nota Fiscal', desc: 'NFe, NFSe e NFCe',    spark: true, premium: true },
          { nome: 'Criar Lembrete',     desc: 'Lembrete por voz' },
          { nome: 'Alarme',             desc: 'Alarme por horário' },
          { nome: 'Cronômetro',         desc: 'Inicia cronômetro' },
          { nome: 'Temporizador',       desc: 'Contagem regressiva' },
          { nome: 'Lembrete de Remédios',desc: 'Lembretes em horários fixos' },
          { nome: 'Segunda Via Boleto', desc: 'Gera PDF com código de barras' },
          { nome: 'Criar Anotação',     desc: 'Nota salva no dashboard' },
          { nome: 'Relógio Mundial',    desc: 'Horas ao redor do mundo' },
        ],
      }}
    />
  )
}
