// lib/melhoria/relatorioPDF.ts
// ─────────────────────────────────────────────────────────────────────────────
// Relatório de adesão para levar ao médico.
//
// Mesmo padrão do lib/consultatec/generatePDF.ts: jsPDF + jspdf-autotable,
// paleta em RGB, rodapé por página, quebra controlada. Ambas as bibliotecas já
// estão no package.json (jspdf ^2.5.2, jspdf-autotable ^5.0.7).
//
// ── O QUE ESTE PDF É, E O QUE NÃO É ─────────────────────────────────────────
// Ele é um REGISTRO do que a pessoa marcou no aplicativo. Não é prontuário,
// não é atestado e não prova que o remédio foi de fato ingerido — prova que
// alguém tocou em "Tomei". Isso está escrito no próprio documento, porque um
// papel com aparência oficial numa consulta pode ser lido como mais do que é.
//
// E ele NÃO interpreta: não diz se a adesão é boa ou ruim, não sugere mudar
// dose, não classifica risco. Mostra os números e cala a boca — quem
// interpreta é o médico.
// ─────────────────────────────────────────────────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const RGB = {
  fundo:    [255, 255, 255] as [number, number, number],
  card:     [241, 245, 249] as [number, number, number],
  borda:    [148, 163, 184] as [number, number, number],
  tinta:    [15, 23, 42]    as [number, number, number],
  muted:    [71, 85, 105]   as [number, number, number],
  destaque: [15, 118, 110]  as [number, number, number],
  alerta:   [180, 83, 9]    as [number, number, number],
};

export interface DoseRegistro {
  previsto_para: string;
  status: 'tomado' | 'pulado' | 'perdido' | 'pendente' | 'notificado';
  confirmado_em: string | null;
  medicamento_nome: string;
  medicamento_dosagem: string | null;
}

export interface DadosRelatorio {
  nomePaciente: string;
  dataNascimento?: string | null;
  periodoInicio: Date;
  periodoFim: Date;
  registros: DoseRegistro[];
  medicamentosAtivos: {
    nome: string;
    dosagem: string | null;
    horarios: string[];
    dias: string;
  }[];
}

const TZ = 'America/Sao_Paulo';

/**
 * Formata data.
 *
 * ⚠️ Cuidado com data pura (coluna `date`, ex.: data_nascimento). O
 * new Date('1948-03-12') é meia-noite UTC; formatado em America/Sao_Paulo
 * (UTC-3) vira 11/03/1948 — o aniversário de todo mundo aparece um dia antes.
 *
 * Instante (timestamptz) precisa da conversão de fuso; data pura NÃO pode
 * levar conversão nenhuma. Por isso os dois caminhos.
 */
const data = (d: string | Date) => {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ,
  }).format(typeof d === 'string' ? new Date(d) : d);
};

const hora = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
    .format(new Date(d));

export function gerarRelatorioAdesao(dados: DadosRelatorio): string {
  const doc = new jsPDF({ compress: true });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina  = doc.internal.pageSize.getHeight();
  const margem = 15;
  let y = 0;

  const rodape = () => {
    const pagina = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.setFontSize(7.5);
    doc.setTextColor(...RGB.muted);
    doc.text(
      'Gerado pela MelhorIA (melhoria.org) — registro do que foi marcado no aplicativo, não é documento médico.',
      margem, alturaPagina - 8,
    );
    doc.text(`Página ${pagina}`, larguraPagina - margem, alturaPagina - 8, { align: 'right' });
  };

  const novaPagina = () => { doc.addPage(); y = margem + 6; };

  // ── Cabeçalho ─────────────────────────────────────────────────────────
  doc.setFillColor(...RGB.destaque);
  doc.rect(0, 0, larguraPagina, 26, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Registro de medicação', margem, 13);

  doc.setFontSize(9);
  doc.text('MelhorIA — a IA da Melhor Idade', margem, 20);

  y = 36;

  // ── Identificação ─────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setTextColor(...RGB.tinta);
  doc.text(dados.nomePaciente, margem, y);
  y += 6;

  doc.setFontSize(9.5);
  doc.setTextColor(...RGB.muted);
  if (dados.dataNascimento) {
    doc.text(`Nascimento: ${data(dados.dataNascimento)}`, margem, y);
    y += 5;
  }
  doc.text(
    `Período: ${data(dados.periodoInicio)} a ${data(dados.periodoFim)}`,
    margem, y,
  );
  y += 5;
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: TZ })}`, margem, y);
  y += 10;

  // ── Resumo numérico ───────────────────────────────────────────────────
  const total   = dados.registros.length;
  const tomados = dados.registros.filter((r) => r.status === 'tomado').length;
  const pulados = dados.registros.filter((r) => r.status === 'pulado').length;
  const perdidos = dados.registros.filter((r) => r.status === 'perdido').length;
  const percentual = total > 0 ? Math.round((tomados / total) * 100) : 0;

  doc.setFillColor(...RGB.card);
  doc.setDrawColor(...RGB.borda);
  doc.roundedRect(margem, y, larguraPagina - margem * 2, 26, 2, 2, 'FD');

  doc.setFontSize(22);
  doc.setTextColor(...RGB.destaque);
  doc.text(`${percentual}%`, margem + 6, y + 15);

  doc.setFontSize(9.5);
  doc.setTextColor(...RGB.tinta);
  doc.text(
    `${tomados} de ${total} doses marcadas como tomadas`,
    margem + 30, y + 10,
  );
  doc.setTextColor(...RGB.muted);
  doc.text(
    `${pulados} marcadas como não tomadas · ${perdidos} sem confirmação`,
    margem + 30, y + 17,
  );

  y += 34;

  // ── Medicamentos em uso ───────────────────────────────────────────────
  if (dados.medicamentosAtivos.length > 0) {
    doc.setFontSize(11.5);
    doc.setTextColor(...RGB.tinta);
    doc.text('Medicamentos cadastrados', margem, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Medicamento', 'Dosagem', 'Horários', 'Dias']],
      body: dados.medicamentosAtivos.map((m) => [
        m.nome,
        m.dosagem ?? '—',
        m.horarios.join(', '),
        m.dias,
      ]),
      theme: 'grid',
      margin: { left: margem, right: margem, bottom: 14 },
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: RGB.tinta, lineColor: RGB.borda, lineWidth: 0.15 },
      headStyles: { fillColor: RGB.destaque, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: RGB.card },
      didDrawPage: rodape,
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 10;
  }

  // ── Adesão por medicamento ────────────────────────────────────────────
  const porMedicamento = new Map<string, { total: number; tomados: number }>();
  for (const r of dados.registros) {
    const chave = [r.medicamento_nome, r.medicamento_dosagem].filter(Boolean).join(' ');
    const atual = porMedicamento.get(chave) ?? { total: 0, tomados: 0 };
    atual.total++;
    if (r.status === 'tomado') atual.tomados++;
    porMedicamento.set(chave, atual);
  }

  if (porMedicamento.size > 0) {
    if (y > alturaPagina - 60) novaPagina();

    doc.setFontSize(11.5);
    doc.setTextColor(...RGB.tinta);
    doc.text('Doses marcadas por medicamento', margem, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Medicamento', 'Previstas', 'Tomadas', '%']],
      body: [...porMedicamento.entries()].map(([nome, v]) => [
        nome,
        String(v.total),
        String(v.tomados),
        `${v.total > 0 ? Math.round((v.tomados / v.total) * 100) : 0}%`,
      ]),
      theme: 'grid',
      margin: { left: margem, right: margem, bottom: 14 },
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: RGB.tinta, lineColor: RGB.borda, lineWidth: 0.15 },
      headStyles: { fillColor: RGB.destaque, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: RGB.card },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      didDrawPage: rodape,
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 10;
  }

  // ── Doses sem confirmação ─────────────────────────────────────────────
  // Só o que NÃO foi tomado. Listar 400 linhas de "tomado" não ajuda ninguém
  // numa consulta de 15 minutos; o que o médico precisa ver é a exceção.
  const faltas = dados.registros
    .filter((r) => r.status === 'perdido' || r.status === 'pulado')
    .sort((a, b) => a.previsto_para.localeCompare(b.previsto_para));

  if (faltas.length > 0) {
    if (y > alturaPagina - 60) novaPagina();

    doc.setFontSize(11.5);
    doc.setTextColor(...RGB.tinta);
    doc.text('Doses não confirmadas', margem, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Hora', 'Medicamento', 'Situação']],
      // Teto de 120 linhas: acima disso o PDF vira ilegível e ninguém lê.
      body: faltas.slice(0, 120).map((r) => [
        data(r.previsto_para),
        hora(r.previsto_para),
        [r.medicamento_nome, r.medicamento_dosagem].filter(Boolean).join(' '),
        r.status === 'pulado' ? 'Marcada como não tomada' : 'Sem confirmação',
      ]),
      theme: 'grid',
      margin: { left: margem, right: margem, bottom: 14 },
      styles: { fontSize: 8, cellPadding: 2, textColor: RGB.tinta, lineColor: RGB.borda, lineWidth: 0.15 },
      headStyles: { fillColor: RGB.alerta, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: RGB.card },
      didDrawPage: rodape,
    });

    y = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 8;

    if (faltas.length > 120) {
      doc.setFontSize(8);
      doc.setTextColor(...RGB.muted);
      doc.text(`E mais ${faltas.length - 120} registros não exibidos.`, margem, y);
      y += 8;
    }
  }

  // ── Ressalva ──────────────────────────────────────────────────────────
  // Sem isto o documento pode ser lido como prova de ingestão, que ele não é.
  if (y > alturaPagina - 40) novaPagina();

  const texto =
    'Este relatório mostra o que foi registrado no aplicativo MelhorIA. Uma dose marcada como tomada '
    + 'indica que alguém confirmou no aplicativo, o que não comprova a ingestão do medicamento. '
    + 'Doses sem confirmação podem ter sido tomadas sem que ninguém marcasse. '
    + 'A MelhorIA não avalia tratamento, não indica dose e não substitui a avaliação do profissional de saúde.';

  const linhas = doc.splitTextToSize(texto, larguraPagina - margem * 2 - 8);
  const altura = 8 + linhas.length * 4.2;

  doc.setFillColor(...RGB.card);
  doc.setDrawColor(...RGB.borda);
  doc.roundedRect(margem, y, larguraPagina - margem * 2, altura, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(...RGB.muted);
  doc.text(linhas, margem + 4, y + 6);

  rodape();

  return doc.output('datauristring');
}
