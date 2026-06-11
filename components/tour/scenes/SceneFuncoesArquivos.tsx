'use client'
// Arquivos · Câmera
import SceneFuncoesCategorias from './SceneFuncoesCategorias'

export default function SceneFuncoesArquivos() {
  return (
    <SceneFuncoesCategorias
      cat1={{
        nome: 'Arquivos',
        color: '#06b6d4',
        funcoes: [
          { nome: 'Relatório de Arquivos', desc: 'Planilhas e PDFs em dashboards', spark: true },
          { nome: 'Remover Fundo',         desc: 'Fundo transparente de imagens' },
          { nome: 'Converter Arquivos',    desc: 'JPG, PNG, WebP, PDF, TXT' },
          { nome: 'Duplicar Imagem',       desc: 'Cópias otimizadas para impressão' },
          { nome: 'Editar Imagem',         desc: 'Brilho, contraste, corte, rotação' },
          { nome: 'Juntar PDFs',           desc: 'Mescla múltiplos PDFs' },
        ],
      }}
      cat2={{
        nome: 'Câmera',
        color: '#84cc16',
        funcoes: [
          { nome: 'Ler QR Code',        desc: 'Leitura pela câmera' },
          { nome: 'Ler Código de Barras',desc: 'Leitura de código de barras' },
          { nome: 'Identificar Fraude', desc: 'Boletos, links e imagens', spark: true },
          { nome: 'Imagem em Texto',    desc: 'OCR de imagens' },
          { nome: 'Tabela em Texto',    desc: 'Extrai tabelas para CSV' },
          { nome: 'Contrato em Texto',  desc: 'Digitaliza contratos' },
          { nome: 'Enviar Arquivo',     desc: 'Cliente envia arquivo via QR' },
          { nome: 'Gerar QR Code',      desc: 'QR de qualquer texto ou link' },
        ],
      }}
    />
  )
}
