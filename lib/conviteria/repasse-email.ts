import crypto from 'node:crypto';
import { brlSaque } from './saque';
import { escaparHtml, enviarEmailConviteIA } from './email';

export const EMAIL_OPERACAO_SAQUE =
  process.env.CONVITEIA_SAQUE_EMAIL || 'ith.almeida@gmail.com';

export const BASE_CONVITEIA =
  (process.env.CONVITEIA_BASE_URL || 'https://conviteia.com').replace(/\/+$/, '');

export function gerarTokenRepasse() {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashTokenRepasse(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function emailNovaSolicitacao({
  repasseId, token, nomeConvite, nomeTitular, cpf, chavePix, tipoChave,
  valorCentavos, saldoAntesCentavos, saldoDepoisCentavos, solicitadoEm,
}: {
  repasseId: string;
  token: string;
  nomeConvite: string;
  nomeTitular: string;
  cpf: string;
  chavePix: string;
  tipoChave: string;
  valorCentavos: number;
  saldoAntesCentavos: number;
  saldoDepoisCentavos: number;
  solicitadoEm: string;
}) {
  const confirmar = `${BASE_CONVITEIA}/api/conviteria/repasse/acao?token=${encodeURIComponent(token)}&acao=confirmar`;
  const falhar = `${BASE_CONVITEIA}/api/conviteria/repasse/acao?token=${encodeURIComponent(token)}&acao=falhar`;

  await enviarEmailConviteIA({
    para: EMAIL_OPERACAO_SAQUE,
    assunto: `ConviteIA — saque de ${brlSaque(valorCentavos)} solicitado`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#40232c">
        <h2 style="color:#a04a63">Nova solicitação de saque</h2>
        <p>Faça o PIX pelo banco e depois use um dos botões abaixo.</p>

        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Convite</b></td><td>${escaparHtml(nomeConvite)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Valor</b></td><td><b>${brlSaque(valorCentavos)}</b></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Titular</b></td><td>${escaparHtml(nomeTitular)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>CPF</b></td><td>${escaparHtml(cpf)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Tipo da chave</b></td><td>${escaparHtml(tipoChave)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Chave PIX</b></td><td><code>${escaparHtml(chavePix)}</code></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Saldo antes</b></td><td>${brlSaque(saldoAntesCentavos)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Saldo reservado/restante</b></td><td>${brlSaque(saldoDepoisCentavos)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee"><b>Solicitado em</b></td><td>${escaparHtml(solicitadoEm)}</td></tr>
          <tr><td style="padding:8px"><b>ID</b></td><td><code>${escaparHtml(repasseId)}</code></td></tr>
        </table>

        <div style="margin:28px 0">
          <a href="${confirmar}" style="display:inline-block;background:#198754;color:#fff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:bold;margin-right:8px">
            Confirmar repasse realizado
          </a>
          <a href="${falhar}" style="display:inline-block;background:#b42318;color:#fff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:bold">
            Não foi possível realizar
          </a>
        </div>

        <p style="font-size:12px;color:#777">Os links são de uso único e expiram automaticamente.</p>
      </div>
    `,
  });
}

export async function emailRepasseConcluido({
  para, nome, valorCentavos, concluidoEm,
}: {
  para: string;
  nome: string;
  valorCentavos: number;
  concluidoEm: string;
}) {
  await enviarEmailConviteIA({
    para,
    assunto: `ConviteIA — repasse de ${brlSaque(valorCentavos)} realizado`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#40232c">
        <h2 style="color:#a04a63">Repasse realizado</h2>
        <p>Olá, ${escaparHtml(nome)}.</p>
        <p>O repasse de <b>${brlSaque(valorCentavos)}</b> foi realizado via PIX para a chave informada na solicitação.</p>
        <p>Confirmação registrada em ${escaparHtml(concluidoEm)}.</p>
        <p style="font-size:12px;color:#777">ConviteIA</p>
      </div>
    `,
  });
}

export async function emailRepasseFalhou({
  para, nome, valorCentavos,
}: {
  para: string;
  nome: string;
  valorCentavos: number;
}) {
  await enviarEmailConviteIA({
    para,
    assunto: `ConviteIA — não foi possível concluir seu repasse`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#40232c">
        <h2 style="color:#a04a63">Não foi possível concluir o repasse</h2>
        <p>Olá, ${escaparHtml(nome)}.</p>
        <p>Não conseguimos concluir o PIX de <b>${brlSaque(valorCentavos)}</b> para a chave informada.</p>
        <p>O valor foi devolvido ao saldo disponível do seu convite. Confira os dados de recebimento e solicite novamente.</p>
        <p style="font-size:12px;color:#777">ConviteIA</p>
      </div>
    `,
  });
}
