# BigCorps Support — Gate 2

Gate 2 endurece segurança e adiciona autoatendimento baseado em conhecimento, sem ativar custo novo de IA.

## Mudanças

- o token da conversa deixa de aparecer em URL e deixa de ser guardado em `localStorage`;
- o token passa a ficar em cookie `HttpOnly`, `SameSite=Lax`, com hash no banco;
- o hash de visitante exige `SUPPORT_TOKEN_SECRET` ou reutiliza `SDR_TOKEN_SECRET`; sem segredo o fluxo falha fechado;
- mensagens que aparentam conter senha/token/secret são substituídas por placeholder antes de persistir;
- quando a conversa está em atendimento humano, o bot não interfere;
- se uma conversa resolvida recebe nova mensagem, ela reabre automaticamente;
- base curta de conhecimento por produto responde dúvidas frequentes sem chamada de modelo;
- IA opcional recebe apenas contexto curado do produto e permanece atrás de `BIGCORPS_SUPPORT_AI_ENABLED=true`.

## Custos

A flag de IA continua desligada em produção. O autoatendimento deste gate usa regras + base de conhecimento e não cria nova despesa de modelo.

## Próximo gate

Gate 3 pode ativar IA em piloto controlado, adicionar telemetria de resolução/encaminhamento e preparar um SDK/widget remoto para produtos que vivem fora deste repositório.
