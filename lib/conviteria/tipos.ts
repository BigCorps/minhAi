export type TipoSecao =
  | 'foto' | 'frase' | 'musica' | 'nomes' | 'data' | 'contagem' | 'calendario'
  | 'local' | 'rsvp' | 'presentes' | 'recados' | 'padrinhos' | 'dresscode'
  | 'programacao' | 'informacoes' | 'galeria' | 'marca' | 'fim';

export interface SecaoConfig {
  tipo: TipoSecao;
  ordem: number;
  ativo: boolean;
  config?: {
    titulo?: string;
    texto?: string;
    destaque?: string;
    autor?: string;
    rotuloBotao?: string;
    href?: string;
    [chave: string]: unknown;
  };
}

export interface Padrinho { nome: string; papel?: string; fotoUrl?: string; }

export interface PresenteEscolhido {
  catalogoId: string;
  titulo: string;
  valorCentavos: number;
  permiteValorLivre?: boolean;
  imagemUrl?: string | null;
  personalizado?: boolean;
  tituloOriginal?: string;
  valorOriginalCentavos?: number;
  imagemOriginalUrl?: string | null;
}

export interface PresenteExibicao {
  id: string;
  titulo: string;
  valorCentavos: number;
  imagemUrl?: string | null;
  esgotado?: boolean;
}

export interface ProgramacaoItem {
  id: string;
  horario: string;
  titulo: string;
  descricao?: string;
}

export interface InformacaoItem {
  id: string;
  /** `traje` permanece por compatibilidade com convites antigos. Novos trajes usam `dressCode`. */
  tipo: 'traje' | 'criancas' | 'estacionamento' | 'transporte' | 'hospedagem' | 'fotos' | 'outro';
  titulo: string;
  texto: string;
  /** Imagem opcional de referência exibida junto da informação no convite. */
  imagemUrl?: string;
}

export interface DressCodeConfig {
  /** Título principal da seção. Ex.: Dress Code, Traje, Como se vestir. */
  titulo?: string;
  /** Linha curta opcional antes/abaixo do tipo de traje. */
  subtitulo?: string;
  /** Ex.: Esporte fino, Passeio completo, Social. */
  tipo?: string;
  /** Orientação geral para os convidados. */
  texto?: string;
  /** Cores/peças que os anfitriões gostariam que fossem evitadas. */
  evitar?: string;
  /** Até cinco referências visuais. */
  imagens?: string[];
}

export type OrigemMusica = 'upload' | 'youtube';

export interface ConviteConfig {
  temaId: string;
  fonteId: string;
  tipoEventoId: string;
  anfitrioes: {
    exibicao: string;
    completo?: string;
    iniciais: string;
    iniciaisManual?: boolean;
  };
  evento: {
    dataIso: string;
    dataExtenso: string;
    diaSemana: string;
    horario: string;
    convocacao?: string;
  };
  local?: {
    nome?: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
    mapsUrl?: string;
    mapEmbedUrl?: string;
  };
  texturaId?: string;
  texturaOnde?: 'externa' | 'papel' | 'ambas';
  ornamentoId?: string;
  envelopeId?: string;
  lacreId?: string;
  lacreCor?: string;
  logoLacreUrl?: string | null;
  logoLacreAjuste?: { escala?: number; x?: number; y?: number; rotacao?: number; };
  lacreAjuste?: { fonte?: string; escala?: number; x?: number; y?: number; };
  presentesEscolhidos?: PresenteEscolhido[];
  /** URL opcional para lista hospedada em outra loja/site. */
  listaPresentesExternaUrl?: string;
  /** Conteúdo de gestão que também pode aparecer no convite público. */
  programacao?: ProgramacaoItem[];
  informacoes?: InformacaoItem[];
  /** Seção independente de traje / dress code. */
  dressCode?: DressCodeConfig;
  midia?: {
    acabamento?: string;
    fotoPrincipal?: string;
    fotoCapa?: string;
    logoEventoUrl?: string;
    logoEventoAjuste?: { largura?: number; alinhamento?: 'esquerda' | 'centro' | 'direita'; };
    enquadramento?: string;
    /** Galeria compartilhada com o onboarding. O total do convite é limitado a cinco fotos. */
    galeria?: string[];
    musica?: {
      origem: OrigemMusica;
      arquivoUrl?: string;
      youtubeVideoId?: string;
      mostrarVideo?: boolean;
      fallbackUrl?: string;
      titulo?: string;
    };
  };
  padrinhos?: Padrinho[];
  presentes?: PresenteExibicao[];
  textos?: Record<string, string>;
  links?: { rsvp?: string; presentes?: string; recados?: string; };
  secoes: SecaoConfig[];
  lacrePath?: string;
  publicacao?: { slug?: string; planoId?: 'avulso' | 'mensal'; };
  /** Campos legados/visuais usados por componentes existentes. */
  etiquetaId?: string;
  textoEtiqueta?: string;
}

export interface ModoRender {
  previa?: boolean;
  teste?: boolean;
  secaoFoco?: TipoSecao;
  eventoId?: string;
  iniciarMidia?: boolean;
}

export interface PropsSecao {
  cfg: ConviteConfig;
  secao: SecaoConfig;
  modo: ModoRender;
}
