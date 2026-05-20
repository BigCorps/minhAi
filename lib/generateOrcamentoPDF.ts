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
  slug?: string;
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
  return [isNaN(r) ? 59 : r, isNaN(g) ? 130 : g, isNaN(b) ? 246 : b];
}

export async function generateOrcamentoPDF(
  orcamento: OrcamentoContext,
  company: CompanyInfo,
  pixQrBase64?: string
): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const [cr, cg, cb] = hexToRgb(company.theme_color || '#3b82f6');

  let y = margin;

  // ── Logo ──────────────────────────────────────────────────
let logoH = 0;
  if (company.logo_url) {
    console.log('[PDF LOGO] logo_url tipo:', company.logo_url.startsWith('data:') ? 'data URI' : 'URL')
    const logoBase64 = company.logo_url.startsWith('data:')
      ? company.logo_url
      : await loadImageAsBase64(company.logo_url);
    console.log('[PDF LOGO] logoBase64 ok:', !!logoBase64)

    if (logoBase64) {
      // Detecta formato pelo data URI ou pela extensão da URL
      let imgFormat = 'PNG';
      if (logoBase64.startsWith('data:image/jpeg') || logoBase64.startsWith('data:image/jpg')) {
        imgFormat = 'JPEG';
      } else if (logoBase64.startsWith('data:image/webp')) {
        imgFormat = 'WEBP';
      } else if (!logoBase64.startsWith('data:')) {
        const ext = company.logo_url.match(/\.(png|jpg|jpeg|webp)/i)?.[1]?.toUpperCase() || 'PNG';
        imgFormat = ext === 'JPG' ? 'JPEG' : ext;
      }
      try {
        const imgProps = doc.getImageProperties(logoBase64);
        const logoW = 30;
        logoH = (imgProps.height * logoW) / imgProps.width;
        doc.addImage(logoBase64, imgFormat as any, margin, y, logoW, logoH);
      } catch {
        logoH = 0;
      }
    }
  }

  // ── Nome da empresa — centralizado verticalmente no bloco do logo ──
  const textX = margin + (logoH > 0 ? 35 : 0);
  const blocoH = Math.max(logoH, 20); // altura mínima do bloco mesmo sem logo
  const nomeY = y + blocoH / 2 - 2;  // nome levemente acima do centro
  const subtituloY = y + blocoH / 2 + 6; // subtítulo abaixo do nome

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cr, cg, cb);
  doc.text(company.name, textX, nomeY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('ORÇAMENTO', textX, subtituloY);

  y += blocoH + 8;

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
      doc.text(
        orcamento.cliente.contato,
        pageW - margin - 5,
        y + 15,
        { align: 'right' }
      );
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
  doc.text(
    `R$ ${Number(orcamento.total).toFixed(2)}`,
    pageW - margin,
    y,
    { align: 'right' }
  );
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
  const rodapeY = pageH - 28;

  // Linha separadora do rodapé
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, rodapeY - 4, pageW - margin, rodapeY - 4);

  // Texto esquerdo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(
    'Orçamento gerado por minhAi • minhai.app',
    margin,
    rodapeY + 2
  );

  // ── QR Code PIX no canto direito do rodapé ───────────────
if (company.slug && orcamento.total > 0) {
    try {
      const pixUrl = `https://minhai.app/pix/${company.slug}/${orcamento.total.toFixed(2)}`

      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'https://minhai.app'

      const qrFullUrl = `${baseUrl}/api/qrcode?data=${encodeURIComponent(pixUrl)}&size=150&color=%23000000&bg=%23ffffff`
      // Usa QR pré-gerado se disponível (server-side), senão busca via fetch (client-side)
      const qrBase64 = pixQrBase64 ?? await loadImageAsBase64(qrFullUrl)

      if (qrBase64) {
        const qrSize = 20; // mm no PDF
        const qrX = pageW - margin - qrSize;
        const qrY = rodapeY - qrSize + 2;

        // Label "Pague via PIX" acima do QR
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text('Pague via PIX', qrX + qrSize / 2, qrY - 1.5, { align: 'center' });

        // QR Code
        doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize);

        // Link por extenso abaixo do QR
        const linkLabel = `minhai.app/pix/${company.slug}/${orcamento.total.toFixed(2)}`;
        doc.setFontSize(5.5);
        doc.setTextColor(150, 150, 150);
        doc.text(
          linkLabel,
          qrX + qrSize / 2,
          qrY + qrSize + 3,
          { align: 'center' }
        );
      }
    } catch {
      // QR Code falhou — PDF gerado normalmente sem ele
    }
  }

  return doc.output('datauristring');
}
