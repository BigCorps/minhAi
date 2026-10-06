export type CommercialProfile = { code: string; signals: readonly string[] };
export type CommercialMetadata = {
  customerProfiles: readonly CommercialProfile[];
  partnerProfiles: readonly CommercialProfile[];
  exclusionSignals: readonly string[];
  partnerValueProposition: string;
  customerValueProposition: string;
  futurePartnerProgram?: {
    exclusiveLinkAndQr: boolean; referredCustomerBenefit: string; directoryListing: boolean;
    persistentAttribution: boolean; financialCommissionRequired: boolean; implemented: false;
  };
};
const BUSINESS_EXCLUSIONS = ["pessoa física", "consumidor particular", "perfil pessoal", "casal particular", "noiva particular", "noivo particular"] as const;
export const PRODUCTS = {
  conviteia: {
    commercial: {
      "customerProfiles": [
          {
            "code": "own_events",
            "signals": [
              "eventos próprios",
              "organiza seus próprios eventos",
              "vende ingressos",
              "promove seus eventos"
            ]
          },
          {
            "code": "corporate_event_need",
            "signals": [
              "eventos corporativos",
              "eventos internos",
              "necessita de convites",
              "precisa de convites",
              "precisa de RSVP"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "event_partner",
            "signals": [
              "buffet",
              "cerimonialista",
              "cerimonial",
              "espaço de eventos",
              "espaços de eventos",
              "organizador de eventos",
              "organiza eventos",
              "empresa de eventos",
              "produtora de eventos",
              "organiza seus próprios eventos",
              "vende ingressos",
              "promove seus eventos",
              "eventos próprios"
            ]
          },
          {
            "code": "photography_partner",
            "signals": [
              "fotógrafo",
              "fotografia"
            ]
          },
          {
            "code": "strategic_invitation_partner",
            "signals": [
              "oferece convites",
              "oferece RSVP",
              "plataforma de convites",
              "plataforma de RSVP"
            ]
          }
        ],
        "partnerValueProposition": "Oferecer convites e memórias aos clientes indicados, com atribuição da parceria.",
        "customerValueProposition": "Organizar convites, RSVP e memórias dos eventos da empresa.",
        "futurePartnerProgram": {
          "exclusiveLinkAndQr": true,
          "referredCustomerBenefit": "Pacote Memórias gratuito ao contratar por indicação.",
          "directoryListing": true,
          "persistentAttribution": true,
          "financialCommissionRequired": false,
          "implemented": false
        },
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "ConviteIA",
    url: "https://conviteia.com",
    lane: "api1",
    audience: "Cerimonialistas, buffets, espaços de eventos e organizadores de eventos",
    pitch: "convites digitais, confirmação de presença e memórias do evento",
    question: "Quantos eventos você organiza por mês?",
  },
  melhoria: {
    commercial: {
      "customerProfiles": [
          {
            "code": "team_wellbeing",
            "signals": [
              "bem-estar da equipe",
              "bem-estar corporativo",
              "rotina da equipe",
              "hábitos da equipe",
              "programa de bem-estar"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "wellbeing_partner",
            "signals": [
              "consultoria de RH",
              "consultoria de recursos humanos",
              "consultoria de bem-estar",
              "benefícios corporativos"
            ]
          }
        ],
        "partnerValueProposition": "Complementar programas corporativos de bem-estar e consultoria.",
        "customerValueProposition": "Apoiar objetivos, rotina e bem-estar da equipe.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "MelhorIA",
    url: "https://melhoria.org",
    lane: "api1",
    audience: "Empresas interessadas em organização de rotina e bem-estar",
    pitch: "organização de rotina, objetivos e acompanhamento de hábitos",
    question:
      "Você procura uma solução para sua rotina ou para apresentar à sua equipe?",
  },
  midia: {
    commercial: {
      "customerProfiles": [
          {
            "code": "advertiser",
            "signals": [
              "anunciante",
              "anunciantes",
              "anunciar",
              "publicidade local",
              "campanha publicitária"
            ]
          },
          {
            "code": "media_agency",
            "signals": [
              "agência de publicidade",
              "agência de marketing",
              "agência"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "screen_owner",
            "signals": [
              "dono de telas",
              "dono de painel",
              "dono de painéis",
              "possui telas",
              "opera telas",
              "rede de telas",
              "telas publicitárias",
              "painel de LED"
            ]
          },
          {
            "code": "agency",
            "signals": [
              "agência de publicidade",
              "agência de marketing",
              "agência"
            ]
          }
        ],
        "partnerValueProposition": "Disponibilizar inventário de telas e gerir mídia para clientes.",
        "customerValueProposition": "Divulgar a empresa e gerir campanhas em telas.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "Mídia.Pro",
    url: "https://midia.pro",
    lane: "api2",
    audience: "Estabelecimentos com telas e anunciantes locais",
    pitch: "gestão de anúncios e conteúdos em telas",
    question: "Você quer anunciar ou possui telas para exibir publicidade?",
  },
  artefinal: {
    commercial: {
      "customerProfiles": [
          {
            "code": "print_production",
            "signals": [
              "gráfica",
              "estamparia",
              "impressão",
              "produção gráfica",
              "preparação de arquivos"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "visual_partner",
            "signals": [
              "agência de design",
              "comunicação visual",
              "distribuidor gráfico",
              "consultoria gráfica",
              "software gráfico"
            ]
          }
        ],
        "partnerValueProposition": "Complementar serviços de design, comunicação visual e produção.",
        "customerValueProposition": "Preparar arquivos e materiais para produção e impressão.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "ArteFinal",
    url: "https://ia.artefinal.app",
    lane: "api2",
    audience: "Gráficas, estamparias e profissionais de comunicação visual",
    pitch: "preparação de arquivos e montagem de materiais para impressão",
    question:
      "Quais materiais você prepara para impressão com mais frequência?",
  },
  consultatec: {
    commercial: {
      "customerProfiles": [
          {
            "code": "business_data_need",
            "signals": [
              "consulta de dados",
              "consultas de dados",
              "consulta de CNPJ",
              "análise cadastral",
              "rotina comercial"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "data_integrator",
            "signals": [
              "ERP",
              "integração de dados",
              "integrador",
              "software de gestão",
              "consultoria comercial"
            ]
          }
        ],
        "partnerValueProposition": "Integrar consultas a softwares e serviços comerciais.",
        "customerValueProposition": "Consultar dados nas rotinas comerciais da empresa.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
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
    commercial: {
      "customerProfiles": [
          {
            "code": "administrative_automation",
            "signals": [
              "atendimento repetitivo",
              "tarefas administrativas",
              "automação de atendimento",
              "processos repetitivos",
              "alto volume de atendimento"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "automation_integrator",
            "signals": [
              "agência",
              "consultoria de automação",
              "integrador",
              "desenvolvimento de software",
              "ERP"
            ]
          }
        ],
        "partnerValueProposition": "Complementar soluções e serviços de automação dos clientes.",
        "customerValueProposition": "Automatizar atendimento e tarefas administrativas.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "FuncionarIA",
    url: "https://funcionaria.net",
    lane: "api3",
    audience: "Empresas com atendimento repetitivo e tarefas administrativas",
    pitch: "automação de atendimento e tarefas da empresa",
    question: "Qual tarefa repetitiva mais ocupa sua equipe hoje?",
  },
  pixwiki: {
    commercial: {
      "customerProfiles": [
          {
            "code": "pix_operator",
            "signals": [
              "marketplace",
              "e-commerce",
              "loja virtual",
              "checkout",
              "volume de Pix",
              "processa Pix"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "software_partner",
            "signals": [
              "agência",
              "desenvolvedor",
              "desenvolvimento de software",
              "software house",
              "ERP",
              "consultoria",
              "processa Pix"
            ]
          }
        ],
        "partnerValueProposition": "Integrar Pix e cobrança aos sistemas e projetos dos clientes.",
        "customerValueProposition": "Operar checkout, confirmação de Pix e automações de cobrança.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "PixWiki",
    url: "https://pix.wiki",
    lane: "high_ticket",
    audience:
      "Operações com volume de Pix e necessidade de checkout e integrações",
    pitch: "checkout, confirmação de Pix e automações de cobrança",
    question:
      "Qual o volume mensal de Pix e quais integrações sua operação precisa?",
  },
  monitoria_vip: {
    commercial: {
      "customerProfiles": [
          {
            "code": "camera_operation",
            "signals": [
              "muitas câmeras",
              "múltiplas câmeras",
              "opera câmeras",
              "rede de câmeras",
              "central de monitoramento",
              "opera monitoramento"
            ]
          }
        ],
        "partnerProfiles": [
          {
            "code": "security_integrator",
            "signals": [
              "integrador",
              "instalador",
              "instalação de câmeras",
              "empresa de segurança",
              "segurança eletrônica"
            ]
          }
        ],
        "partnerValueProposition": "Complementar instalação, integração e serviços de segurança.",
        "customerValueProposition": "Acompanhar operações com câmeras e implantação assistida.",
      exclusionSignals: BUSINESS_EXCLUSIONS,
    } satisfies CommercialMetadata,
    name: "MonitorIA VIP",
    url: "https://vip.monitoria.cam",
    lane: "high_ticket",
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

// Shared by server validation and the Admin UI; no server dependencies or credentials.
export function businessHostname(value: unknown): string | null {
  const host = normalizeDomain(value);
  if (!host || host.length > 253 || /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
      /\.(localhost|local|internal|test|invalid)$/i.test(host) ||
      /^(gmail\.com|hotmail\.com|outlook\.com|yahoo\.[a-z.]+|icloud\.com|proton\.(me|mail\.com)|aol\.com|live\.com)$/.test(host)) return null;
  try {
    const raw = String(value || "").trim();
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port ? host : null;
  } catch { return null; }
}
export function isValidatedWebDecisionMaker(lead: { contact_name?: unknown; domain?: unknown }, qualification: any) {
  return !!(typeof lead.contact_name === "string" && lead.contact_name.trim() && businessHostname(lead.domain) &&
    qualification?.decision_maker?.source === "web_research" && qualification.decision_maker.validated === true);
}
