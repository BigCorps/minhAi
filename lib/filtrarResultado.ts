// lib/filtrarResultado.ts
// A API de Restrições (Quod/CREDINTEGRA) às vezes devolve, junto dos campos
// normais, um campo com um PDF inteiro em base64 (relatório alternativo do
// próprio provedor). Isso não é um dado pra exibir — é um anexo bruto que,
// se entrar no resultado_formatado, estoura tanto a tela quanto o PDF que a
// gente gera. Esse filtro tira qualquer campo assim antes de renderizar.

const CAMPOS_IGNORADOS = ['pdfbase64', 'pdf_base64', 'pdfb64'];

export function removerCamposBinarios<T extends { label: string; value: string }>(rows: T[]): T[] {
  return rows.filter((r) => {
    const chaveNormalizada = (r.label || '').toLowerCase().replace(/[\s_]/g, '');
    if (CAMPOS_IGNORADOS.includes(chaveNormalizada)) return false;
    // segunda camada de proteção: qualquer valor absurdamente longo (>2000
    // caracteres) quase certamente não é um dado de exibição, é um anexo.
    if (typeof r.value === 'string' && r.value.length > 2000) return false;
    return true;
  });
}