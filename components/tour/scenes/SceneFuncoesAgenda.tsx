'use client'
// Agendamento · Identificação
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesAgenda() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Agendamento',
        color: '#10b981',
        funcoes: [
          { nome: 'Marcar Evento',       desc: 'Google Agenda + Meet',       premium: true },
          { nome: 'Ver Agenda',          desc: 'Calendário com eventos',     premium: true },
          { nome: 'Reagendamento',       desc: 'Nova data e horário',        premium: true },
          { nome: 'Cancelar Agendamento',desc: 'Cancela compromisso',        premium: true },
          { nome: 'Confirmar Presença',  desc: 'Confirmação de agendamento', premium: true },
          { nome: 'Horários Disponíveis',desc: 'Consulta disponibilidade',   premium: true },
        ],
      }}
      cat2={{
        nome: 'Identificação',
        color: '#a855f7',
        funcoes: [
          { nome: 'Fazer Login',         desc: 'Login de clientes' },
          { nome: 'Novo Cadastro',       desc: 'Campos configuráveis' },
          { nome: 'Gerar Senha',         desc: 'Senha de fila em tempo real' },
          { nome: 'Modo Fila',           desc: 'Painel de fila' },
          { nome: 'Pré-Atendimento',     desc: 'Formulário antes do atendimento' },
          { nome: 'Pesquisas e Avaliações', desc: 'Avaliação de atendimento' },
        ],
      }}
    />
  )
}
