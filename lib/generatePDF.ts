import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateConsultaPDF(
  tipoConsulta: string,
  resultadoFormatado: [string, string][]
): string {
  const doc = new jsPDF({ compress: true });
  const MARGEM = 15;
  const LARGURA_PAGINA = doc.internal.pageSize.getWidth();

  // Cabeçalho - Azul eAi (#A2D9F7)
  doc.setFillColor(162, 217, 247);
  doc.rect(0, 0, LARGURA_PAGINA, 30, 'F');
  doc.setFontSize(18);
  doc.setTextColor(40, 43, 48);
  doc.text('Relatório de Consulta', MARGEM, 18);
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 104);
  doc.text(
    `eAi - Assistente Virtual | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    MARGEM,
    24
  );

  // Título da consulta
  doc.setFontSize(16);
  doc.setTextColor(26, 32, 44);
  doc.text(
    `Consulta: ${tipoConsulta.toUpperCase().replace(/_/g, ' ')}`,
    MARGEM,
    45
  );
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGEM, 48, LARGURA_PAGINA - MARGEM, 48);

  // Tabela de resultados
  if (resultadoFormatado.length > 0) {
    autoTable(doc, {
      startY: 55,
      head: [['Campo', 'Informação']],
      body: resultadoFormatado,
      theme: 'striped',
      headStyles: {
        fillColor: [176, 203, 31], // #B0CB1F - Verde limão eAi
        textColor: [26, 32, 44],    // #1a202c
      },
      margin: { left: MARGEM, right: MARGEM },
      alternateRowStyles: { fillColor: [247, 250, 252] }, // #f7fafc
    });
  } else {
    doc.setFontSize(12);
    doc.setTextColor(113, 128, 150);
    doc.text('Nenhum resultado retornado para esta consulta.', MARGEM, 65);
  }

  // Rodapé
  const finalY = (doc as any).lastAutoTable?.finalY || 80;
  doc.setFontSize(8);
  doc.setTextColor(113, 128, 150);
  doc.text(
    'Documento gerado automaticamente pelo sistema eAi.',
    MARGEM,
    finalY + 20
  );

  // Retornar data URI completo
  return doc.output('dataurlstring');
}
