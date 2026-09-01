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
  return resultado
    .map((item: any) => {
      const label = Array.isArray(item) ? item[0] : item?.label;
      const value = Array.isArray(item) ? item[1] : item?.value;
      const text = str(value, '');
      return [str(label, 'Campo'), text.length > 1200 ? `${text.slice(0, 1200)}…` : text] as [string, string];
    })
    .filter(([label]) => !/fonte|fornecedor|provedor/i.test(label));
}

function nonZeroRestriction(item: any) {
  const quantidade = Number(item?.quantidade ?? 0);
  let raw = String(item?.valor_total ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (raw.includes(',') && raw.includes('.')) raw = raw.replace(/\./g, '').replace(',', '.');
  else if (raw.includes(',')) raw = raw.replace(',', '.');
  raw = raw.replace(/[^0-9.-]/g, '');
  const valor = raw ? Number(raw) : 0;
  const detalhes = Array.isArray(item?.detalhes) ? item.detalhes : [];
  return quantidade > 0 || (Number.isFinite(valor) && Math.abs(valor) > 0) || detalhes.length > 0;
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 0;
  const footerDrawnPages = new Set<number>();

  const footer = () => {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    if (footerDrawnPages.has(pageNumber)) return;
    footerDrawnPages.add(pageNumber);

    doc.setFontSize(7.5);
    doc.setTextColor(...RGB.muted);
    doc.text('Relatório informativo ConsultaTec. Consulte os avisos e condições de uso ao final do documento.', margin, pageHeight - 7);
    doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

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

  const newPage = () => {
    doc.addPage();
    addHeader();
  };

  const section = (title: string, body: [string, string][]) => {
    if (!body.length) return;
    if (y > 250) newPage();

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
      margin: { left: margin, right: margin, bottom: 13 },
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: RGB.tinta, lineColor: RGB.borda, lineWidth: 0.15 },
      headStyles: { fillColor: RGB.destaque, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: RGB.card },
      didDrawPage: footer,
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 8;
  };

  const noticeBlock = (title: string, text: string) => {
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 8);
    const needed = 11 + lines.length * 4.2;
    if (y + needed > pageHeight - 16) newPage();

    doc.setFillColor(...RGB.card);
    doc.setDrawColor(...RGB.borda);
    doc.roundedRect(margin, y, pageWidth - margin * 2, needed, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...RGB.destaque);
    doc.text(title, margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...RGB.tinta);
    doc.text(lines, margin + 4, y + 11);
    y += needed + 4;
  };

  addHeader();

  if (input.action === 'completa_cnpj') {
    const r = input.result ?? {};
    const dados = r.dados ?? {};
    const restr = r.restricoes ?? {};
    const score = r.score ?? restr.score ?? {};
    const exact = score?.score === null || score?.score === undefined || score?.score === '' ? null : Number(score.score);
    const temExact = exact !== null && Number.isFinite(exact) && exact >= 0 && exact <= 1000;
    const faixa = score?.faixa_score?.label
      || (score?.faixa_score?.min !== undefined && score?.faixa_score?.max !== undefined
        ? `${score.faixa_score.min}–${score.faixa_score.max}`
        : null);

    const alertRows: [string, string][] = (Array.isArray(r.alertas) ? r.alertas : [])
      .filter((a: any) => !/fornecedor|provedor|fonte/i.test(String(a?.titulo ?? '')))
      .map((a: any) => [str(a?.titulo, 'Alerta'), str(a?.detalhe)]);
    section('Resumo e alertas', alertRows);

    section('Score e risco', rows([
      ...(temExact ? [['Score', `${Math.round(exact as number)}/1000`] as [string, any]] : []),
      ...(!temExact && faixa ? [['Faixa de score', faixa] as [string, any]] : []),
      ['Probabilidade de inadimplência', score?.probabilidade_inadimplencia !== null && score?.probabilidade_inadimplencia !== undefined ? `${score.probabilidade_inadimplencia}%` : null],
      ['Análise de risco', score?.risco],
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

    const restricoesValidas = Array.isArray(restr?.restricoes) ? restr.restricoes.filter(nonZeroRestriction) : [];
    if (restricoesValidas.length) {
      section('Restrições e apontamentos', restricoesValidas.flatMap((item: any, index: number) => rows([
        [`Restrição ${index + 1}`, item?.tipo],
        ['Quantidade', item?.quantidade],
        ['Valor total', item?.valor_total],
        ['Primeira ocorrência', item?.data_primeiro],
        ['Última ocorrência', item?.data_ultimo],
      ])));
    } else {
      section('Restrições e apontamentos', [['Situação', 'Nenhuma restrição identificada nos módulos consultados.']]);
    }

    const protestos = r?.protestos ?? restr?.protestos ?? {};
    section('Resumo de protestos', rows([
      ['Quantidade', Number(protestos?.quantidade ?? 0)],
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

    if (r?.observacao) section('Observação', [['Nota', str(r.observacao)]]);
  } else {
    section('Resultado', safeRows(input.resultadoFormatado));
  }

  if (y > pageHeight - 75) newPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...RGB.destaque);
  doc.text('Informações importantes', margin, y);
  y += 5;

  noticeBlock(
    'Uso confidencial e finalidade',
    'Este relatório é confidencial e destinado exclusivamente ao usuário que realizou a consulta, para apoio em análises cadastrais, comerciais e de crédito, sempre observadas as finalidades permitidas pela legislação aplicável.',
  );
  noticeBlock(
    'Responsabilidade pela decisão',
    'A decisão de conceder, negar, limitar ou condicionar crédito é de exclusiva responsabilidade de quem realiza a análise. As informações apresentadas pela ConsultaTec servem como subsídio e não devem ser utilizadas isoladamente como justificativa automática para uma decisão comercial ou creditícia.',
  );
  noticeBlock(
    'Atualização e disponibilidade dos dados',
    'A ConsultaTec emprega esforços para apresentar informações consistentes e atualizadas, mas podem existir atrasos, divergências, indisponibilidades ou registros ainda não disponibilizados nas bases consultadas. Sempre que necessário, confirme informações críticas antes de tomar uma decisão.',
  );
  noticeBlock(
    'Proteção de dados',
    'O usuário é responsável por utilizar os dados de acordo com a LGPD e demais normas aplicáveis, respeitando finalidade, necessidade, segurança, confidencialidade e os direitos dos titulares.',
  );

  footer();
  return doc.output('dataurlstring');
}
