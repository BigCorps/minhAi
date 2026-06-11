'use client'
// Contato · Serviços
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesContato() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Contato',
        color: '#f59e0b',
        funcoes: [
          { nome: 'Nosso WhatsApp',   desc: 'QR Code do WhatsApp' },
          { nome: 'Nosso Instagram',  desc: 'QR Code do Instagram' },
          { nome: 'Nosso Facebook',   desc: 'QR Code do Facebook' },
          { nome: 'Nosso TikTok',     desc: 'QR Code do TikTok' },
          { nome: 'Nosso LinkedIn',   desc: 'QR Code do LinkedIn' },
          { nome: 'Nosso Twitter/X',  desc: 'QR Code do Twitter/X' },
          { nome: 'Nosso Site',       desc: 'QR Code do site' },
          { nome: 'Nosso Email',      desc: 'QR Code do e-mail' },
          { nome: 'Nosso Telefone',   desc: 'QR Code do telefone' },
        ],
      }}
      cat2={{
        nome: 'Serviços',
        color: '#ef4444',
        funcoes: [
          { nome: 'Cardápio',          desc: 'Cardápio digital com QR Code' },
          { nome: 'Wi-Fi QR Code',     desc: 'Conectar ao Wi-Fi pelo QR' },
          { nome: 'Chamar Gerente',    desc: 'Notificação urgente por SMS/email' },
          { nome: 'Enviar SMS',        desc: 'SMS para qualquer número' },
          { nome: 'Lista de Compras',  desc: 'Gerencia lista por voz' },
          { nome: 'Impressão Local',   desc: 'Impressão na rede',   premium: true },
          { nome: 'Impressão Remota',  desc: 'Impressão remota',    premium: true },
          { nome: 'Impressão Recibo',  desc: 'Impressora térmica',  premium: true },
          { nome: 'Nosso QR Code',     desc: 'QR com mensagem de voz' },
        ],
      }}
    />
  )
}
