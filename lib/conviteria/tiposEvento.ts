import type { TipoSecao } from './tipos';

export interface TipoEvento {
  id: string;
  nome: string;
  grupo: string;
  secoesPadrao: TipoSecao[];
  /** Rotulos que mudam por tipo. Casamento tem "noivos", vaquinha nao. */
  rotulos: { anfitrioes: string; convocacao: string };
}

const CASAMENTO: TipoSecao[] = [
  'foto', 'frase', 'musica', 'nomes', 'data', 'contagem',
  'calendario', 'local', 'rsvp', 'presentes', 'recados', 'dresscode', 'fim',
];
const FESTA: TipoSecao[] = [
  'foto', 'musica', 'nomes', 'data', 'contagem', 'local',
  'rsvp', 'presentes', 'recados', 'fim',
];

export const TIPOS_EVENTO: TipoEvento[] = [
  { id: 'casamento', nome: 'Casamento', grupo: 'casamento', secoesPadrao: CASAMENTO,
    rotulos: { anfitrioes: 'Nomes dos noivos', convocacao: 'Convidam para a cerimônia de casamento' } },
  { id: 'bodas-prata', nome: 'Bodas de Prata', grupo: 'casamento', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nomes do casal', convocacao: 'Convidam para a celebração' } },
  { id: 'bodas-ouro', nome: 'Bodas de Ouro', grupo: 'casamento', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nomes do casal', convocacao: 'Convidam para a celebração' } },
  { id: 'noivado', nome: 'Noivado', grupo: 'casamento', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nomes dos noivos', convocacao: 'Convidam para o noivado' } },
  { id: 'cha-de-panela', nome: 'Chá de Panela', grupo: 'casamento', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nomes do casal', convocacao: 'Convidam para o chá de panela' } },
  { id: 'debutante', nome: 'Debutante', grupo: 'debutante', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nome da debutante', convocacao: 'Convida para a festa de 15 anos' } },
  { id: 'aniversario', nome: 'Aniversário', grupo: 'aniversario', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nome do aniversariante', convocacao: 'Convida para o aniversário' } },
  { id: 'aniversario-infantil', nome: 'Aniversário Infantil', grupo: 'aniversario',
    secoesPadrao: ['foto', 'musica', 'nomes', 'data', 'contagem', 'local', 'rsvp', 'presentes', 'fim'],
    rotulos: { anfitrioes: 'Nome do aniversariante', convocacao: 'Convida para a festa' } },
  { id: 'happy-hour', nome: 'Happy Hour', grupo: 'happy_hour', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nome do encontro', convocacao: 'Vamos nos encontrar' } },
  { id: 'confraternizacao', nome: 'Confraternização', grupo: 'happy_hour', secoesPadrao: FESTA,
    rotulos: { anfitrioes: 'Nome do evento', convocacao: 'Convidamos você' } },
  { id: 'vaquinha', nome: 'Vaquinha', grupo: 'vaquinha',
    secoesPadrao: ['foto', 'frase', 'nomes', 'contagem', 'presentes', 'recados', 'fim'],
    rotulos: { anfitrioes: 'Nome da campanha', convocacao: 'Ajude a gente a chegar lá' } },
];

export const TIPO_PADRAO = TIPOS_EVENTO[0];

export function acharTipo(id: string): TipoEvento {
  return TIPOS_EVENTO.find((t) => t.id === id) ?? TIPO_PADRAO;
}
