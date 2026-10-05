# Validação — 05/10/2026

## Concluído

- Conferência somente leitura dos schemas dos dois Supabases e do código base dos dois repositórios.
- Consulta da nova fórmula de MRR em produção, como SELECT isolado: resultado 0 centavos. Nenhuma definição/função de produção foi substituída nessa conferência.
- Compilação e execução dos dois scripts SQL em PGlite/Postgres local com fixtures de schema derivadas dos nomes/tipos reais. Enums externos foram representados por texto; isto não substitui teste em staging com o schema completo.
- 19 testes de comportamento comercial: deduplicação, revisão obrigatória, opt-in WhatsApp, exclusão entre canais, reserva de fila, pausa antes de envio, resultado desconhecido, orçamento, concorrência de busca, falta de saldo, permissões, janela do mesmo número, cortesias, anual /12, ausência de pagamento, taxa de presente excluída da aquisição, conciliação idempotente, ativação e cancelamento.
- 6 testes MonitorIA: anual VIP, normalização padrão anual, exclusão de câmera VIP da contagem padrão, cortesia, cancelamento e permissão privada.
- 11 asserções de catálogo: normalização, identidade, rejeição de quebra de linha no email, horário de Brasília, pontuação e template marketing com saída.
- `git diff --check` sem problemas.
- TypeScript: checagem global contém erros preexistentes em outras áreas e em Edge Functions Deno. Não foram encontrados erros nos arquivos novos do SDR e nos arquivos alterados do Admin na conferência final. O projeto já tem `ignoreBuildErrors` na configuração; isso não foi adicionado pelo pacote.
- Build Next/Webpack compilou com avisos. A coleta de dados parou em rotas preexistentes (`/api/ml/webhook` sem URL Supabase e `/api/groq/classify` sem GROQ_API_KEY) por ausência das variáveis locais. **Build completo de produção não aprovado neste ambiente.**
- Corrigido um fechamento de `div` ausente em `components/layout/UserMenu.tsx`, que impedia a compilação antes da checagem. Nenhuma refatoração de produto nesse arquivo.

## Ainda precisa de homologação com suas configurações

- Aplicar SQL nos projetos corretos, conferir Advisors/RLS e rodar VALIDAR-MINHAI.sql.
- Build/deploy com as variáveis reais já existentes do projeto.
- Login Admin e visualização em desktop/celular. Não houve sessão autenticada de navegador apontada para a versão nova nesta execução.
- Chaves reais dos três fornecedores: busca, formato da resposta, escopos, extrato de créditos e data do trial. Não houve cobrança de API nem criação de lista real durante os testes locais.
- Submissão/aprovação de marketing na Meta e escolha do número de envio.
- Gmail: recebimento real, detecção de resposta e follow-up bloqueado. WhatsApp: opt-in, template, inbound e interrupção.
- Compra real controlada, atribuição correta, confirmação de ativação e reversão conforme estados do meio de pagamento. Não foi simulada venda no banco real.

Os testes automatizados reproduzíveis ficam em `tests/` na raiz do ZIP; ver seu README. Não copiar fixtures SQL para o Supabase de produção.
