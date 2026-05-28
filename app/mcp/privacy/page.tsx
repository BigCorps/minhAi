// app/mcp/privacy/page.tsx

export const metadata = {
  title: 'Privacidade — minhAi MCP Connector',
  description: 'Política de privacidade do conector MCP da plataforma minhAi',
}

export default function McpPrivacyPage() {
  return (
    <main style={{
      maxWidth: '720px',
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

      <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
        Política de Privacidade
      </h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '40px' }}>
        minhAi MCP Connector · Última atualização: maio de 2026
        <br />
        BigCorps Tecnologia Ltda — CNPJ 14.282.244/0001-19
      </p>

      <Section title="1. Dados coletados pelo connector">
        <p>Quando você conecta o minhAi ao Claude ou ChatGPT, o connector armazena:</p>
        <ul>
          <li><strong>Token de acesso OAuth</strong> — identifica sua conta para autenticar requisições</li>
          <li><strong>Nome do cliente MCP</strong> — indica qual plataforma fez a conexão (Claude, ChatGPT)</li>
          <li><strong>Data e hora do último uso</strong> — para auditoria e segurança</li>
          <li><strong>Empresa selecionada</strong> — qual assistente minhAi está associado à conexão</li>
        </ul>
        <p>O connector <strong>não coleta</strong> conversas, mensagens trocadas com o modelo de IA, dados pessoais adicionais ou informações de pagamento além do necessário para processar cada transação solicitada.</p>
      </Section>

      <Section title="2. Uso dos dados">
        <p>Os dados coletados são usados exclusivamente para:</p>
        <ul>
          <li>Autenticar requisições enviadas pelo cliente MCP</li>
          <li>Debitar os créditos corretos da conta minhAi associada</li>
          <li>Registrar o histórico de uso no dashboard do usuário</li>
          <li>Garantir a segurança e integridade das operações</li>
        </ul>
      </Section>

      <Section title="3. Compartilhamento de dados">
        <p>Os dados <strong>não são compartilhados</strong> com terceiros, exceto:</p>
        <ul>
          <li><strong>Anthropic (Claude) e OpenAI (ChatGPT):</strong> recebem apenas o resultado das tools executadas</li>
          <li><strong>APIs públicas brasileiras:</strong> CNPJ/CPF são enviados à Receita Federal, Quod e Correios para processamento</li>
          <li><strong>Banco Inter e InfinitePay:</strong> dados necessários para processar pagamentos PIX e cobranças</li>
        </ul>
      </Section>

      <Section title="4. Armazenamento e segurança">
        <ul>
          <li>Dados armazenados em servidores no Brasil (Supabase sa-east-1 — São Paulo)</li>
          <li>Tokens gerados com UUID v4 e armazenados com segurança</li>
          <li>Tokens expiram automaticamente em 24 horas e são renovados via refresh_token</li>
          <li>A conexão pode ser revogada a qualquer momento pelo usuário</li>
        </ul>
      </Section>

      <Section title="5. Seus direitos (LGPD)">
        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
        <ul>
          <li><strong>Acessar</strong> os dados: Dashboard → Configurações → Integrações MCP</li>
          <li><strong>Revogar</strong> o acesso do connector a qualquer momento</li>
          <li><strong>Solicitar exclusão</strong> de todos os dados via contato@bigcorps.com.br</li>
          <li><strong>Portabilidade</strong> dos dados mediante solicitação formal</li>
        </ul>
      </Section>

      <Section title="6. Retenção de dados">
        <ul>
          <li>Tokens ativos mantidos enquanto a conexão existir</li>
          <li>Tokens revogados deletados imediatamente</li>
          <li>Logs de uso mantidos por 90 dias para auditoria e suporte</li>
          <li>Após exclusão da conta minhAi, todos os dados do connector são deletados em até 7 dias</li>
        </ul>
      </Section>

      <Section title="7. Contato">
        <p>
          <strong>BigCorps Tecnologia Ltda</strong><br />
          Email: <a href="mailto:contato@bigcorps.com.br" style={{ color: '#3b82f6' }}>contato@bigcorps.com.br</a><br />
          WhatsApp: (11) 98731-1425<br />
          Site: <a href="https://minhai.app" style={{ color: '#3b82f6' }}>minhai.app</a>
        </p>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
        {title}
      </h2>
      <div style={{ color: '#334155' }}>{children}</div>
    </section>
  )
}