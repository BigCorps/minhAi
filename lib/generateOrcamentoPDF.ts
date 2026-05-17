import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ItemOrcamento {
  descricao: string;
  qtd: number;
  valor_unitario: number;
  subtotal: number;
}

interface OrcamentoContext {
  cliente: { nome: string; contato: string };
  itens: ItemOrcamento[];
  total: number;
  condicoes?: string;
}

interface CompanyInfo {
  name: string;
  logo_url?: string;
  theme_color?: string;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [isNaN(r) ? 249 : r, isNaN(g) ? 115 : g, isNaN(b) ? 22 : b];
}

export async function generateOrcamentoPDF(
  orcamento: OrcamentoContext,
  company: CompanyInfo
): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const [cr, cg, cb] = hexToRgb(company.theme_color || '#f97316');

  let y = margin;

  // ── Logo ──────────────────────────────────────────────────
  if (company.logo_url) {
    const logoBase64 = await loadImageAsBase64(company.logo_url);
    if (logoBase64) {
      const ext = company.logo_url.match(/\.(png|jpg|jpeg|webp)/i)?.[1]?.toUpperCase() || 'PNG';
      const imgFormat = ext === 'JPG' ? 'JPEG' : ext;
      try {
        doc.addImage(logoBase64, imgFormat as any, margin, y, 30, 30);
      } catch {
        // logo inválido — ignora
      }
    }
  }

  // ── Nome da empresa ───────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cr, cg, cb);
  doc.text(company.name, margin + 35, y + 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('ORÇAMENTO', margin + 35, y + 20);

  y += 38;

  // ── Linha separadora ──────────────────────────────────────
  doc.setDrawColor(cr, cg, cb);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Data de emissão ───────────────────────────────────────
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Emitido em: ${dataEmissao}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // ── Dados do cliente ──────────────────────────────────────
  if (orcamento.cliente.nome || orcamento.cliente.contato) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('CLIENTE', margin + 5, y + 7);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(orcamento.cliente.nome || '—', margin + 5, y + 15);

    if (orcamento.cliente.contato) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(orcamento.cliente.contato, pageW - margin - 5, y + 15, { align: 'right' });
    }

    y += 30;
  }

  // ── Tabela de itens ───────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Qtd', 'Valor Unit.', 'Subtotal']],
    body: orcamento.itens.map(item => [
      item.descricao,
      String(item.qtd),
      `R$ ${Number(item.valor_unitario).toFixed(2)}`,
      `R$ ${Number(item.subtotal).toFixed(2)}`,
    ]),
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: {
      fillColor: [cr, cg, cb],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Total ─────────────────────────────────────────────────
  doc.setDrawColor(cr, cg, cb);
  doc.setLineWidth(0.4);
  doc.line(pageW - margin - 80, y, pageW - margin, y);
  y += 6;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('TOTAL', pageW - margin - 80, y);
  doc.setTextColor(cr, cg, cb);
  doc.text(`R$ ${Number(orcamento.total).toFixed(2)}`, pageW - margin, y, { align: 'right' });
  y += 10;

  // ── Condições ─────────────────────────────────────────────
  if (orcamento.condicoes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Condições:', margin, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    const linhas = doc.splitTextToSize(orcamento.condicoes, pageW - margin * 2);
    doc.text(linhas, margin, y);
    y += linhas.length * 5 + 5;
  }

  // ── Rodapé ────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Orçamento gerado por minhAi • minhai.com.br', pageW / 2, pageH - 10, { align: 'center' });

  return doc.output('datauristring');
}