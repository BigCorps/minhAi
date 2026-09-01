# FuncionarIA — integração fotorrealista v2

Este pacote foi montado **sobre os arquivos atuais do repositório BigCorps/minhAi**.

## O que corrige

O repositório já tinha:
- os packs de avatar;
- `FuncionarIAAvatarPhoto.tsx`;
- `lib/funcionaria-avatar-options.ts`.

Porém, as telas reais ainda chamavam o renderer antigo `FuncionarIACharacter`.

Este pacote troca o renderer nos pontos corretos e preserva:
- onboarding sem cadastro até o final;
- verificação de subdomínio;
- Passos 2 e 3 já corrigidos;
- UX grande do Passo 4 e botão Ampliar;
- upload do logo no dashboard;
- layout da página slug com atendimento à direita;
- voz feminina da FuncionarIA.

## Onde os novos avatares aparecem

- Onboarding / Passo 4
- Dashboard / Minha FuncionarIA
- Página pública do slug
- Widget

## Seleção

No Passo 4 aparecem:
- Opção 1
- Opção 2
- Opção 3

Sem nome fixo e sem rótulos de aparência.

## Banco de dados

Execute `sql/FuncionarIA_3_Avatars_SQL.sql`.

Ele:
1. cria `funcionaria_company_settings.avatar_option_id`;
2. atualiza `funcionaria_save_visual` para persistir a escolha;
3. atualiza `funcionaria_public_profile` para a página slug/widget receberem a opção selecionada.

O SQL não cria tabelas novas e não altera habilidades, pagamentos, créditos ou dados de clientes.

## Ordem

1. Sobrepor o conteúdo deste ZIP no repositório.
2. Executar `sql/FuncionarIA_3_Avatars_SQL.sql` no Supabase da minhAi.
3. Fazer deploy.
4. Testar o Passo 4 e trocar entre as 3 opções.
5. Finalizar/salvar e conferir dashboard + slug.

## Compatibilidade

Empresas que já existem recebem `option-1` por padrão.
