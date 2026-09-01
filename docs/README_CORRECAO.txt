FuncionarIA - Correção visual fotorrealista + nova FuncionarIA v3

Este pacote deve ser aplicado SOBRE a versão atual do repositório, preservando os caminhos.

Corrige:
1. Recoloração do uniforme:
   - cria máscaras alpha reais em public/funcionaria/avatar-packs/processed-v3/*/masks
   - evita que a cor da camiseta pinte rosto, pele, cabelo e corpo inteiro.

2. Tamanho das 3 opções:
   - Opção 2 permanece como referência de escala.
   - Opção 1 recebe normalização de escala 1.08.
   - Opção 3 recebe normalização de escala 1.05.
   - a mesma normalização vale para onboarding, dashboard, slug e widget porque todos usam o renderer compartilhado.

3. Boca:
   - novos overlays com máscara elíptica suave apenas na região da boca.
   - remove o efeito de retângulo de pele ao falar.
   - reduz e padroniza a escala dos recortes entre as 3 opções.
   - mantém a posição relativa por opção para reduzir desalinhamento.

4. Nova FuncionarIA:
   - /onboarding passa a ser sempre um fluxo NOVO, mesmo quando já existe uma empresa selecionada.
   - edição da atual continua por ?edit=visual, ?edit=skills ou ?edit=setup.
   - o botão "Concluir configuração" do dashboard passa a usar ?edit=setup.
   - nome e subdomínio só ficam bloqueados em modo de edição da FuncionarIA existente.

Supabase:
- Nenhum SQL novo é necessário para esta correção.
- O avatar_option_id aplicado anteriormente continua sendo usado normalmente.

Teste recomendado:
A. Abra /onboarding e confirme que Nome da empresa e Subdomínio estão livres para uma nova FuncionarIA.
B. No Passo 4, alterne Opção 1, 2 e 3.
C. Troque cor da camiseta e gola/mangas e confirme que apenas o uniforme muda.
D. Clique em Simular fala nas três opções.
E. Conclua/salve e confira dashboard e slug público.
