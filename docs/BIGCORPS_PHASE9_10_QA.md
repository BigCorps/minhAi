# BigCorps — QA final FuncionarIA e regressão compartilhada (Fases 9/10)

## Contexto
Repositório compartilhado `BigCorps/minhAi`. As Fases 9A–9K são gates de **contratos estruturais** e builds validados; não equivalem a aprovação visual em aparelhos físicos, confirmação de pagamento real ou simulação completa de um usuário autenticado.

## Fase 10A — cobertura automatizada
O gate `check:bigcorps-10` valida, em tempo de build, a presença dos entrypoints e os contratos compartilhados para:

- minhAi (raiz);
- Min.IA;
- ConviteIA;
- PixWiki;
- ConsultaTec;
- MelhorIA;
- ArteFinal;
- FuncionarIA.

Também verifica as marcas nos domínios, manifests PWA, associações Android TWA, `llms.txt` separados, criação de pagamentos exclusivamente server-side, cron jobs e proteção de opt-in do Mercado Livre.

O script é somente leitura e **não envia** pagamentos, pedidos, mensagens ou sincronizações. Executa no `prebuild` para impedir regressões em PRs/Preview.

**Achado histórico fora do escopo:** o manifest existente de ArteFinal oferece ícone 512×512, mas não declara `scope` nem ícone 192×192. A fase 10 verifica o contrato mínimo existente e registra o desvio; não altera o app ArteFinal sem validação específica.

## Fase 10B — smoke HTTP opcional
`npm run smoke:bigcorps-10` efetua apenas GETs em páginas públicas e no Digital Asset Links, usando o URL exato de `BIGCORPS_QA_BASE_URL`. Não deve rodar automaticamente em builds: Preview pode exigir autenticação Vercel. O script não efetua escrita nem tenta contornar proteção do Preview.

## Limites e pendências
- Sem navegador remoto autenticado neste ambiente, **não houve** screenshots, testes de teclado reais ou inspeção visual em 320/375/768/desktop.
- Retorno real de cartão, Pix, entrega e pedido não foi acionado por segurança financeira; precisa de plano de testes controlado com conta/valores definidos.
- A verificação HTTP live dos domínios reais depende de acesso externo ao deploy. `READY` no Vercel comprova compilação/deploy, não a experiência interativa.
- MonitorIA, Midia.Pro, DesafIA e Sr.Rotas vivem em outros repositórios e **não estão cobertos** por este gate. Não declarar regressão global BigCorps aprovada com estes resultados.
- Próximo passo: revisar provas de QA visual e retornar à coordenação de merge seguro com outras branches antes de produção. Fases 11–13 (financeiro, observabilidade, CI) continuam separadas.
