export const PRODUCTS = {
  conviteia: {
    name: "ConviteIA",
    url: "https://conviteia.com",
    lane: "api1",
    audience: "Cerimonialistas, buffets e organizadores de eventos",
    pitch: "convites digitais, confirmação de presença e memórias do evento",
    question: "Quantos eventos você organiza por mês?",
  },
  melhoria: {
    name: "MelhorIA",
    url: "https://melhoria.org",
    lane: "api1",
    audience: "Empresas interessadas em organização de rotina e bem-estar",
    pitch: "organização de rotina, objetivos e acompanhamento de hábitos",
    question:
      "Você procura uma solução para sua rotina ou para apresentar à sua equipe?",
  },
  midia: {
    name: "Mídia.Pro",
    url: "https://midia.pro",
    lane: "api2",
    audience: "Estabelecimentos com telas e anunciantes locais",
    pitch: "gestão de anúncios e conteúdos em telas",
    question: "Você quer anunciar ou possui telas para exibir publicidade?",
  },
  artefinal: {
    name: "ArteFinal",
    url: "https://ia.artefinal.app",
    lane: "api2",
    audience: "Gráficas, estamparias e profissionais de comunicação visual",
    pitch: "preparação de arquivos e montagem de materiais para impressão",
    question:
      "Quais materiais você prepara para impressão com mais frequência?",
  },
  consultatec: {
    name: "ConsultaTec",
    url: "https://consulta.tec.br",
    lane: "api3",
    audience:
      "Empresas que precisam consultar dados em suas rotinas comerciais",
    pitch: "consultas para apoiar sua rotina comercial",
    question:
      "Que tipo de consulta sua empresa precisa realizar e com qual frequência?",
  },
  funcionaria: {
    name: "FuncionarIA",
    url: "https://funcionaria.net",
    lane: "api3",
    audience: "Empresas com atendimento repetitivo e tarefas administrativas",
    pitch: "automação de atendimento e tarefas da empresa",
    question: "Qual tarefa repetitiva mais ocupa sua equipe hoje?",
  },
  pixwiki: {
    name: "PixWiki",
    url: "https://pix.wiki",
    lane: "silva",
    audience:
      "Operações com volume de Pix e necessidade de checkout e integrações",
    pitch: "checkout, confirmação de Pix e automações de cobrança",
    question:
      "Qual o volume mensal de Pix e quais integrações sua operação precisa?",
  },
  monitoria_vip: {
    name: "MonitorIA VIP",
    url: "https://vip.monitoria.cam",
    lane: "silva",
    audience: "Operações com múltiplas câmeras e acompanhamento assistido",
    pitch: "monitoramento de operações com câmeras e implantação assistida",
    question: "Quantas câmeras e locais sua operação precisa acompanhar?",
  },
} as const;
export type Product = keyof typeof PRODUCTS;
export type Provider = "econodata" | "apollo" | "hunter";
export const PROVIDERS: Provider[] = ["econodata", "apollo", "hunter"];
export function isProduct(v: unknown): v is Product {
  return typeof v === "string" && Object.hasOwn(PRODUCTS, v);
}
export function templateFor(p: Product) {
  return {
    product: p,
    name: `bigcorps_${p}_apresentacao_v1`,
    language: "pt_BR",
    category: "MARKETING",
    body: `Olá! Aqui é o assistente comercial da BigCorps. Você autorizou receber informações sobre ${PRODUCTS[p].name}. Podemos ajudar com ${PRODUCTS[p].pitch}. Quer conhecer? Acesse {{1}} ou responda aqui. Para não receber mais mensagens, responda SAIR.`,
  };
}
export const STAGES: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  replied: "Respondeu",
  qualified: "Qualificado",
  meeting: "Reunião",
  proposal: "Proposta",
  paid: "Pago",
  won: "Pago e ativado",
  lost: "Perdido",
};
export type LeadInput = {
  company_name: string;
  contact_name?: string | null;
  domain?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  source_ref: string;
  evidence: string;
  email_status?: string;
};
export function normalizeDomain(v: unknown): string | null {
  try {
    const s = String(v || "").trim();
    if (!s) return null;
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return h.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(h) ? h : null;
  } catch {
    return null;
  }
}
export function normalizeLead(input: LeadInput): LeadInput {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const phone = String(input.phone || "").replace(/\D/g, "");
  return {
    ...input,
    company_name: String(input.company_name || "")
      .trim()
      .slice(0, 160),
    contact_name: input.contact_name?.slice(0, 120) || null,
    domain: normalizeDomain(input.domain),
    cnpj:
      String(input.cnpj || "").replace(/\D/g, "").length === 14
        ? String(input.cnpj).replace(/\D/g, "")
        : null,
    email:
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255
        ? email
        : null,
    phone: /^[1-9]\d{9,14}$/.test(phone) ? phone : null,
    evidence: String(input.evidence || "").slice(0, 2000),
    source_ref: String(input.source_ref || "").slice(0, 500),
  };
}
export function identityKeys(l: LeadInput) {
  return [
    ...(l.cnpj ? [`cnpj:${l.cnpj}`] : []),
    ...(l.domain ? [`domain:${l.domain}`] : []),
    ...(l.email ? [`email:${l.email}`] : []),
    ...(l.phone ? [`phone:${l.phone}`] : []),
  ];
}
export function qualificationScore(q: Record<string, unknown>) {
  return (
    (typeof q.need === "string" && q.need.trim().length >= 8 ? 40 : 0) +
    (q.authority === "yes" ? 20 : 0) +
    (q.timing === "now" ? 25 : q.timing === "30days" ? 15 : 0) +
    (typeof q.scale === "string" && q.scale.trim().length > 0 ? 15 : 0)
  );
}
export function businessHours(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = p.find((x) => x.type === "weekday")?.value;
  const hour = Number(p.find((x) => x.type === "hour")?.value);
  return day !== "Sat" && day !== "Sun" && hour >= 9 && hour < 18;
}
