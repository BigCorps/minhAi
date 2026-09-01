// app/mcp/readme/page.tsx

export const metadata = {
  title: 'Documentação — minhAi MCP Connector',
  description: 'Como conectar e usar o minhAi no Claude e ChatGPT via MCP',
}

export default function McpReadmePage() {
  return (
    <main style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '48px 24px',
      fontFamily: 'system-ui, sans-serif',
      color: '#1e293b',
      lineHeight: '1.7',
    }}>
      <img
        src="https://minhai.app/icons/icon-192x192.png"
        alt="minhAi"
        style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '24px' }}
      />

      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
        minhAi MCP Connector
      </h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>
        Funcionário de IA para empresas brasileiras — disponível como connector no Claude e ChatGPT.
      </p>

      <Section title="O que é">
        <p>
          O <strong>minhAi</strong> é uma plataforma SaaS brasileira que permite criar assistentes de IA
          para empresas de qualquer tamanho. Com o MCP connector, você executa mais de 15 funções
          por linguagem natural diretamente no Claude ou ChatGPT — sem abrir nenhum app.
        </p>
      </Section>

      <Section title="Como conectar">
        <SubTitle>Claude (claude.ai)</SubTitle>
        <ol>
          <li>Acesse <strong>Settings → Connectors → Add custom connector</strong></li>
          <li>Cole a URL: <Code>https://mcp.minhai.app</Code></li>
          <li>Clique em <strong>Connect</strong> e faça login com sua conta minhAi</li>
          <li>Selecione qual assistente conectar e autorize o acesso</li>
        </ol>

        <SubTitle>ChatGPT</SubTitle>
        <ol>
          <li>Acesse <strong>Settings → Connectors → Add custom connector</strong></li>
          <li>Cole a URL: <Code>https://mcp.minhai.app</Code></li>
          <li>Autentique com sua conta minhAi</li>
        </ol>
      </Section>

      <Section title="Funções disponíveis">
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
          Todas as funções consomem créditos da conta minhAi conectada.
          Cada execução pede confirmação antes de ser realizada.
        </p>

        <SubTitle>💰 Pagamentos</SubTitle>
        <Table rows={[
          ['gerar_pix',       'Gera QR Code PIX para cobrança instantânea',          '1'],
          ['confirmar_pix',   'Confirma se um PIX foi pago em tempo real',            '1'],
          ['link_pagamento',  'Gera link de pagamento via InfinitePay',               '1'],
          ['emitir_nota',     'Emite nota fiscal eletrônica (NF-e/NFS-e)',            '3'],
        ]} />

        <SubTitle>📅 Agenda</SubTitle>
        <Table rows={[
          ['agendar_compromisso', 'Cria evento no Google Calendar', '3'],
          ['ver_agenda',          'Lista compromissos por período',  '1'],
        ]} />

        <SubTitle>🔍 Consultas</SubTitle>
        <Table rows={[
          ['dados_cnpj',   'Dados completos de empresa na Receita Federal',  '1'],
          ['dados_cpf',    'Dados cadastrais de CPF na Receita Federal',     '1'],
          ['restricoes_cpf',   'Score de crédito e restrições via Quod',         '2'],
          ['consultar_cep',    'Endereço completo por CEP',                      '1'],
          ['consultar_placa',  'Dados de veículo pela placa',                    '2'],
          ['cotacao_cambio',   'Cotações de moedas e cripto em tempo real',      '1'],
          ['rastreio_correios','Rastreia encomendas dos Correios',               '1'],
        ]} />

        <SubTitle>🤖 IA e documentos</SubTitle>
        <Table rows={[
          ['criar_orcamento',   'Cria orçamento com IA baseado na tabela de preços', '2'],
          ['traduzir_texto',    'Traduz texto para qualquer idioma',                  '1'],
          ['identificar_fraude','Analisa URL ou boleto para detectar fraudes',        '2'],
          ['transcrever_audio', 'Transcreve arquivo de áudio para texto',             '2'],
        ]} />

        <SubTitle>📡 Comunicação e utilidades</SubTitle>
        <Table rows={[
          ['enviar_email', 'Envia email via Gmail conectado',          '1'],
          ['gerar_qrcode', 'Gera QR Code de qualquer texto ou URL',   '1'],
        ]} />
      </Section>

      <Section title="Exemplos de uso">
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '10px', padding: '20px',
        }}>
          {[
            '"Gera um PIX de R$150 para pagamento do serviço"',
            '"Consulta o CNPJ 14.282.244/0001-19"',
            '"Agenda uma reunião para amanhã às 14h"',
            '"Rastreia a encomenda BR123456789BR"',
            '"Verifica se esse link é fraude: http://banco-seguro.xyz"',
            '"Cotação do dólar agora"',
            '"Emite uma nota de serviço de R$500"',
          ].map((ex, i) => (
            <p key={i} style={{
              fontFamily: 'monospace', fontSize: '13px',
              color: '#0f172a', margin: '6px 0',
            }}>
              {ex}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Pré-requisitos">
        <ul>
          <li>Conta ativa no minhAi: <a href="https://minhai.app" style={{ color: '#3b82f6' }}>minhai.app</a></li>
          <li>Créditos disponíveis (plano gratuito inclui 20 créditos iniciais)</li>
          <li>Funções específicas requerem integrações no dashboard:
            <ul style={{ marginTop: '6px' }}>
              <li>PIX: chave PIX cadastrada</li>
              <li>Agenda: Google Calendar conectado</li>
              <li>Email: Gmail conectado</li>
              <li>Nota fiscal: certificado digital configurado</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="Autenticação">
        <p>
          O minhAi MCP usa <strong>OAuth 2.0 com Authorization Code Flow</strong>.
          Nenhuma senha é compartilhada com o cliente MCP — apenas um token de acesso
          com validade de 24 horas, renovável automaticamente.
        </p>
        <p>
          O acesso pode ser revogado a qualquer momento em{' '}
          <strong>Dashboard → Configurações → Integrações MCP</strong>.
        </p>
      </Section>

      <Section title="Suporte">
        <p>
          Site: <a href="https://minhai.app" style={{ color: '#3b82f6' }}>minhai.app</a><br />
          WhatsApp: (11) 92682-8418<br />
          Email: <a href="mailto:contato@bigcorps.com.br" style={{ color: '#3b82f6' }}>contato@bigcorps.com.br</a><br />
          Desenvolvido pela <strong>BigCorps Tecnologia Ltda</strong> — CNPJ 14.282.244/0001-19
        </p>
      </Section>
    </main>
  )
}

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '14px', color: '#0f172a' }}>
        {title}
      </h2>
      <div style={{ color: '#334155' }}>{children}</div>
    </section>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px', color: '#0f172a' }}>
      {children}
    </h3>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      background: '#f1f5f9', border: '1px solid #e2e8f0',
      borderRadius: '5px', padding: '2px 7px',
      fontFamily: 'monospace', fontSize: '13px', color: '#0f172a',
    }}>
      {children}
    </code>
  )
}

function Table({ rows }: { rows: [string, string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '8px' }}>
      <thead>
        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {['Função', 'O que faz', 'Créditos'].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '8px 12px',
              fontWeight: 600, color: '#475569', fontSize: '12px',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([fn, desc, credits]) => (
          <tr key={fn} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a', whiteSpace: 'nowrap' }}>{fn}</td>
            <td style={{ padding: '8px 12px', color: '#475569' }}>{desc}</td>
            <td style={{ padding: '8px 12px', color: '#64748b', textAlign: 'center' }}>{credits}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
