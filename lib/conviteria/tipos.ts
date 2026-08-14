// ---------------------------------------------------------------------------
// Contrato do convite. O mesmo objeto alimenta a previa do wizard (estado
// local) e a pagina publicada (vindo do banco). Um so caminho de render.
// ---------------------------------------------------------------------------

export type TipoSecao =
  | 'foto'
  | 'frase'
  | 'musica'
  | 'nomes'
  | 'data'
  | 'contagem'
  | 'calendario'
  | 'local'
  | 'rsvp'
  | 'presentes'
  | 'recados'
  | 'padrinhos'
  | 'dresscode'
  | 'galeria'
  | 'marca'
  | 'fim';

export interface SecaoConfig {
  tipo: TipoSecao;
  ordem: number;
  ativo: boolean;
  /** Sobrescreve titulo, texto e rotulo do botao por secao. */
  config?: {
    titulo?: string;
    texto?: string;
    destaque?: string;
    /** Autoria da frase/versiculo. */
    autor?: string;
    rotuloBotao?: string;
    href?: string;
    // Campos livres. Declare acima o que for usado em JSX: valor `unknown`
    // dentro de `{x && <tag/>}` produz `unknown`, que nao e um ReactNode.
    [chave: string]: unknown;
  };
}

export interface Padrinho {
  nome: string;
  papel?: string;
  fotoUrl?: string;
}

/**
 * Presente escolhido pelo casal no wizard.
 *
 * Guarda um SNAPSHOT de titulo e valor, e nao so o `catalogoId`: a previa
 * precisa funcionar sem consultar o banco, e um item que sair do catalogo
 * depois nao pode sumir de um convite ja publicado.
 */
export interface PresenteEscolhido {
  catalogoId: string;
  titulo: string;
  valorCentavos: number;
  permiteValorLivre?: boolean;
  imagemUrl?: string | null;
}

export interface PresenteExibicao {
  id: string;
  titulo: string;
  valorCentavos: number;
  imagemUrl?: string | null;
  esgotado?: boolean;
}

export type OrigemMusica = 'upload' | 'youtube';

export interface ConviteConfig {
  temaId: string;
  fonteId: string;
  tipoEventoId: string;

  anfitrioes: {
    /** Como aparece em destaque: "Miriam e Ithiel" */
    exibicao: string;
    /** Assinatura no rodape. Opcional. */
    completo?: string;
    /** Monograma do lacre: "MI" */
    iniciais: string;
    /** True quando o usuario editou as iniciais a mao: a partir dai o
        wizard para de deriva-las do nome exibido. */
    iniciaisManual?: boolean;
  };

  evento: {
    /** ISO com fuso. Ex.: 2026-10-31T13:00:00-03:00 */
    dataIso: string;
    dataExtenso: string;
    diaSemana: string;
    horario: string;
    /** Subtitulo sob os nomes. Ex.: "Convidam para a cerimonia de casamento" */
    convocacao?: string;
  };

  local?: {
    nome?: string;
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
    mapsUrl?: string;
    /** Embed do google-maps-proxy. Quando ausente, so mostra o botao. */
    mapEmbedUrl?: string;
  };

  /** Textura de fundo. Ver TEXTURAS em components/conviteria/Texturas.tsx. */
  texturaId?: string;
  /**
   * Onde a textura aparece.
   *
   *   'externa'  fundo ao redor do papel. Invisivel no celular, onde o papel
   *              ocupa a largura toda — e o que estava acontecendo.
   *   'papel'    dentro do convite, atras do texto.
   *   'ambas'    nas duas.
   *
   * Ausente = 'papel', porque e a unica que funciona em qualquer largura.
   */
  texturaOnde?: 'externa' | 'papel' | 'ambas';

  /** Família visual dos ornamentos e formato da aba do envelope. */
  ornamentoId?: string;
  envelopeId?: string;

  /** Arte do lacre. Ver LACRES em components/conviteria/LacreArte.tsx. */
  lacreId?: string;
  /** Cor da cera. Sem efeito quando lacreId = 'nenhum'. */
  lacreCor?: string;
  /** Logo do cliente no lugar das iniciais do lacre. */
  logoLacreUrl?: string | null;
  /** Fonte e ajuste fino do monograma. Ver AjusteLacre em LacreArte.tsx. */
  lacreAjuste?: {
    fonte?: string;
    escala?: number;
    x?: number;
    y?: number;
  };

  /** Escolhidos no wizard. Viram linhas em `conviteria.presentes` ao publicar. */
  presentesEscolhidos?: PresenteEscolhido[];

  midia?: {
    /**
     * Acabamento da foto principal. Ver ACABAMENTOS em secoes/Foto.tsx.
     * Ausente = 'moldura', que e o comportamento que ja existia.
     */
    acabamento?: string;
    fotoPrincipal?: string;
    fotoCapa?: string;
    /** Logo independente do lacre, exibido dentro do convite. */
    logoEventoUrl?: string;
    enquadramento?: string;
    galeria?: string[];
    musica?: {
      origem: OrigemMusica;
      /** upload: caminho no Storage. youtube: id do video. */
      arquivoUrl?: string;
      youtubeVideoId?: string;
    /** true = player de video do YouTube. false/ausente = so a musica. */
    mostrarVideo?: boolean;
      /** Rede de seguranca se o embed do YouTube falhar. */
      fallbackUrl?: string;
      titulo?: string;
    };
  };

  padrinhos?: Padrinho[];
  presentes?: PresenteExibicao[];

  /** Textos livres por chave, para o wizard preencher sem migracao. */
  textos?: Record<string, string>;

  links?: {
    rsvp?: string;
    presentes?: string;
    recados?: string;
  };

  secoes: SecaoConfig[];

  /** Contorno do monograma, gerado no servidor ao publicar. */
  lacrePath?: string;

  /** Preenchido na etapa de publicacao. */
  publicacao?: {
    slug?: string;
    planoId?: 'avulso' | 'mensal';
  };
}

/** Contexto de render: muda o comportamento, nunca a aparencia. */
export interface ModoRender {
  /** Na previa, links nao navegam e a musica nao toca sozinha. */
  previa?: boolean;
  /** Secao que o wizard esta editando agora, para rolar ate ela. */
  secaoFoco?: TipoSecao;
  /**
   * Id do evento. Presente so no convite publicado — a previa do wizard nao
   * tem evento ainda. E o que o modal de presentes usa para gerar o PIX, e
   * tambem o que faz o botao "Presentear" ficar inerte na previa sem precisar
   * de outra flag.
   */
  eventoId?: string;
}

/**
 * Props de toda secao. Fica aqui, e nao em Convite.tsx, porque o motor importa
 * as secoes e as secoes importariam o motor de volta — ciclo de import.
 */
export interface PropsSecao {
  cfg: ConviteConfig;
  secao: SecaoConfig;
  modo: ModoRender;
}
