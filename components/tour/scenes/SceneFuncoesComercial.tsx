'use client'
// Comercial · Financeiro
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesComercial() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Comercial',
        color: '#3b82f6',
        funcoes: [
          { nome: 'Modo Venda',        desc: 'Catálogo + carrinho de compras' },
          { nome: 'Nossos Produtos',   desc: 'Busca por voz, nome ou categoria' },
          { nome: 'Fazer Pedido',      desc: 'Monta pedido por voz',           spark: true },
          { nome: 'Registrar Venda',   desc: 'Venda manual no sistema' },
          { nome: 'Cadastrar Produto', desc: 'Com sugestão de imagens',        spark: true },
          { nome: 'Gerar Cupom',       desc: 'Cupons de desconto e indicação' },
          { nome: 'Link na Bio',       desc: 'Página de links da empresa' },
          { nome: 'Enviar Email',      desc: 'Via Gmail conectado' },
          { nome: 'Auxiliar Produção', desc: 'Fichas técnicas e custos',       spark: true, premium: true },
        ],
      }}
      cat2={{
        nome: 'Financeiro',
        color: '#32bcad',
        funcoes: [
          { nome: 'Gerar PIX',         desc: 'QR Code + confirmação automática' },
          { nome: 'TEF Crédito',       desc: 'Maquininha Point — crédito' },
          { nome: 'TEF Débito',        desc: 'Maquininha Point — débito' },
          { nome: 'NFC/TAP Crédito',   desc: 'Aproximar cartão — crédito' },
          { nome: 'NFC/TAP Débito',    desc: 'Aproximar cartão — débito' },
          { nome: 'Link de Pagamento', desc: 'Cobrança via InfinitePay' },
        ],
      }}
    />
  )
}
