export interface Plano {
  id: 'avulso' | 'mensal';
  nome: string;
  centavos: number;
  periodo?: string;
  descricao: string;
  destaques: string[];
}

export const PLANOS: Plano[] = [
  {
    id: 'avulso',
    nome: 'Um convite',
    centavos: 2990,
    descricao: 'Pagamento único. O convite fica no ar para sempre.',
    destaques: [
      'Endereço personalizado',
      'Confirmação de presença ilimitada',
      'Lista de presentes por PIX',
      'Mural de recados',
      'Edição depois de publicado',
    ],
  },
  {
    id: 'mensal',
    nome: 'Convites à vontade',
    centavos: 14990,
    periodo: 'por mês',
    descricao: 'Para quem cria convites com frequência. Cancele quando quiser.',
    destaques: [
      'Convites ilimitados enquanto o plano estiver ativo',
      'Todos os recursos do plano avulso',
      'Convites já publicados continuam no ar mesmo se cancelar',
    ],
  },
];

/** Taxa sobre presentes recebidos. */
export const TAXA_PRESENTE = 0.01;

export function calcularTaxa(centavos: number) {
  const taxa = Math.round(centavos * TAXA_PRESENTE);
  return { taxa, liquido: centavos - taxa };
}

export const brl = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
