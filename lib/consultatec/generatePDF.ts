import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoFormatado } from '@/types/consultatec';

const RGB = {
  fundo: [242, 234, 211] as [number, number, number],
  card: [251, 246, 233] as [number, number, number],
  borda: [201, 191, 160] as [number, number, number],
  tinta: [28, 26, 20] as [number, number, number],
  muted: [107, 99, 80] as [number, number, number],
  destaque: [122, 97, 66] as [number, number, number],
  alerta: [122, 46, 46] as [number, number, number],
};

const str = (value: any, fallback = 'Não informado') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.map((v) => str(v, '')).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const rows = (items: Array<[string, any]>): [string, string][] =>
  items
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => [label, str(value)] as [string, string]);

function safeRows(resultado: ResultadoFormatado[] | [string, string][] | undefined): [string, string][] {
  if (!Array.isArray(resultado)) return [];
  return resultado.map((item: any) => {
    const label = Array.isArray(item) ? item[0] : item?.label;
    const value = Array.isArray(item) ? item[1] : item?.value;
    const text = str(value, '');
    return [str(label, 'Campo'), text.length > 1200 ? `${text.slice(0, 1200)}…` : text];
  });
}

export function generateConsultaTecPDF(input: {
  titulo: string;
  documento: string;
  action: string;
  result: any;
  resultadoFormatado?: ResultadoFormatado[] | [string, string][];
}): string {
  const doc = new jsPDF({ compress: true, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  const addHeader = () => {
    doc.setFillColor(...RGB.fundo);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(...RGB.tinta);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ConsultaTec', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...RGB.muted);
    doc.text(input.titulo, margin, 21);
    doc.text(`Documento: ${input.documento}`, margin, 27);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 27, { align: 'right' });
    y = 40;
  };

  const section = (title: string, body: [string, string][]) => {
    if (!body.length) return;
    if (y > 250) {
      doc.addPage();
      addHeader();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...RGB.destaque);
    doc.text(title, margin, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Informação']],
      body,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: RGB.tinta, lineColor: RGB.borda, lineWidth: 0.15 },
      headStyles: { fillColor: RGB.destaque, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: RGB.card },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5);
        doc.setTextColor(...RGB.muted);
        doc.text('Relatório informativo. Dados dependem das fontes consultadas e da atualização dos fornecedores.', margin, pageHeight - 7);
        doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 8;
  };

  addHeader();

  if (input.action === 'completa_cnpj') {
    const r = input.result ?? {};
    const dados = r.dados ?? {};
    const restr = r.restricoes ?? {};
    const score = r.score ?? restr.score ?? {};

    const alertRows: [string, string][] = (Array.isArray(r.alertas) ? r.alertas : []).map((a: any) => [str(a?.titulo, 'Alerta'), str(a?.detalhe)]);
    section('Resumo e alertas', alertRows);

    section('Score e risco', rows([
      ['Score', score?.score !== null && score?.score !== undefined ? `${score.score}/1000` : 'Não retornado pelo produto atual'],
      ['Probabilidade de inadimplência', score?.probabilidade_inadimplencia],
      ['Faixa / risco', score?.risco],
      ['Fonte', score?.fonte],
      ['Fatores', Array.isArray(score?.motivos) ? score.motivos.join('; ') : null],
    ]));

    section('Cadastro da empresa', rows([
      ['CNPJ', dados?.cnpj],
      ['Razão Social', dados?.razao_social],
      ['Nome Fantasia', dados?.nome_fantasia],
      ['Matriz / Filial', dados?.matriz_filial],
      ['Situação Cadastral', dados?.situacao],
      ['Data da Situação', dados?.data_situacao],
      ['Início das Atividades', dados?.data_inicio_atividade],
      ['Natureza Jurídica', dados?.natureza_juridica],
      ['Porte', dados?.porte],
      ['Capital Social', dados?.capital_social],
      ['CNAE Principal', [dados?.cnae_principal?.codigo, dados?.cnae_principal?.descricao].filter(Boolean).join(' - ')],
      ['Simples Nacional', dados?.simples?.opcao],
      ['MEI', dados?.mei?.opcao],
      ['Fonte Cadastral', dados?.fonte],
    ]));

    if (Array.isArray(dados?.qsa) && dados.qsa.length) {
      section('Quadro societário', dados.qsa.flatMap((s: any, index: number) => rows([
        [`Sócio ${index + 1}`, s?.nome],
        ['Qualificação', s?.qualificacao],
        ['Data de entrada', s?.data_entrada],
        ['Faixa etária', s?.faixa_etaria],
      ])));
    }

    if (Array.isArray(dados?.cnaes_secundarios) && dados.cnaes_secundarios.length) {
      section('CNAEs secundários', dados.cnaes_secundarios.map((c: any) => [str(c?.codigo, 'CNAE'), str(c?.descricao)] as [string, string]));
    }

    if (Array.isArray(restr?.restricoes) && restr.restricoes.length) {
      section('Restrições e apontamentos', restr.restricoes.flatMap((item: any, index: number) => rows([
        [`Restrição ${index + 1}`, item?.tipo],
        ['Quantidade', item?.quantidade],
        ['Valor total', item?.valor_total],
        ['Primeira ocorrência', item?.data_primeiro],
        ['Última ocorrência', item?.data_ultimo],
      ])));
    } else {
      section('Restrições e apontamentos', [['Situação', str(restr?.status, 'Nenhuma restrição retornada')]]);
    }

    const protestos = r?.protestos ?? restr?.protestos ?? {};
    section('Resumo de protestos', rows([
      ['Quantidade', protestos?.quantidade],
      ['Valor total', protestos?.valor_total],
      ['Primeira ocorrência', protestos?.data_primeiro],
      ['Última ocorrência', protestos?.data_ultimo],
    ]));

    if (Array.isArray(protestos?.detalhes) && protestos.detalhes.length) {
      const protestRows: [string, string][] = [];
      protestos.detalhes.slice(0, 100).forEach((p: any, index: number) => {
        protestRows.push([`Protesto ${index + 1}`, Object.entries(p ?? {}).map(([k, v]) => `${k}: ${str(v, '')}`).join(' | ')]);
      });
      section('Protestos detalhados', protestRows);
    }

    section('Endereço e contatos', rows([
      ['Endereço', [dados?.endereco?.logradouro, dados?.endereco?.numero, dados?.endereco?.complemento].filter(Boolean).join(', ')],
      ['Bairro', dados?.endereco?.bairro],
      ['Município / UF', [dados?.endereco?.municipio, dados?.endereco?.uf].filter(Boolean).join(' / ')],
      ['CEP', dados?.endereco?.cep],
      ['E-mail', dados?.contatos?.email],
      ['Telefones', Array.isArray(dados?.contatos?.telefones) ? dados.contatos.telefones.join(' · ') : dados?.contatos?.telefones],
    ]));

    if (Array.isArray(restr?.campos_adicionais) && restr.campos_adicionais.length) {
      section('Mais informações do fornecedor', restr.campos_adicionais.slice(0, 80).map((item: any) => [str(item?.campo), str(item?.valor)]));
    }

    if (r?.observacao) section('Observação', [['Nota', str(r.observacao)]]);
    if (Array.isArray(r?.fontes)) section('Fontes', r.fontes.map((f: any, i: number) => [`Fonte ${i + 1}`, str(f)] as [string, string]));
  } else {
    section('Resultado', safeRows(input.resultadoFormatado));
  }

  if (doc.getNumberOfPages() === 1) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(...RGB.muted);
    doc.text('Relatório informativo. Dados dependem das fontes consultadas e da atualização dos fornecedores.', margin, pageHeight - 7);
    doc.text('Página 1', pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  return doc.output('dataurlstring');
}
