// ---------------------------------------------------------------------------
// Pares tipograficos. Espelha conviteria.fontes no banco.
//
// escalaDisplay existe porque cursiva fina e sans pesada precisam de corpos
// muito diferentes para ter o mesmo peso visual. Sem isso, trocar a fonte
// desequilibra o cartao.
// ---------------------------------------------------------------------------

export interface ParTipografico {
  id: string;
  nome: string;
  display: string;
  corpo: string;
  pesoDisplay: number;
  escalaDisplay: number;
  grupos: string[];
}

export const FONTES: ParTipografico[] = [
  { id: 'classico', nome: 'Clássico',
    display: "'Pinyon Script', cursive", corpo: "'Cormorant Garamond', serif",
    pesoDisplay: 400, escalaDisplay: 1.15, grupos: ['casamento'] },

  { id: 'romantico', nome: 'Romântico',
    display: "'Great Vibes', cursive", corpo: "'Quicksand', sans-serif",
    pesoDisplay: 400, escalaDisplay: 1.05, grupos: ['casamento'] },

  { id: 'moderno-suave', nome: 'Moderno Suave',
    display: "'Parisienne', cursive", corpo: "'Jost', sans-serif",
    pesoDisplay: 400, escalaDisplay: 1.1, grupos: ['casamento'] },

  { id: 'delicado', nome: 'Delicado',
    display: "'Italianno', cursive", corpo: "'Lora', serif",
    pesoDisplay: 400, escalaDisplay: 1.35, grupos: ['casamento'] },

  { id: 'editorial', nome: 'Editorial',
    display: "'Cormorant Garamond', serif", corpo: "'Cormorant Garamond', serif",
    pesoDisplay: 600, escalaDisplay: 0.82, grupos: ['casamento', 'happy_hour'] },

  { id: 'contemporaneo', nome: 'Contemporâneo',
    display: "'Playfair Display', serif", corpo: "'Nunito Sans', sans-serif",
    pesoDisplay: 500, escalaDisplay: 0.82, grupos: ['debutante', 'aniversario'] },

  { id: 'leve', nome: 'Leve',
    display: "'Sacramento', cursive", corpo: "'Poppins', sans-serif",
    pesoDisplay: 400, escalaDisplay: 1.2, grupos: ['debutante', 'casamento'] },

  { id: 'autoral', nome: 'Autoral',
    display: "'Fraunces', serif", corpo: "'Karla', sans-serif",
    pesoDisplay: 600, escalaDisplay: 0.78, grupos: ['aniversario', 'vaquinha'] },

  { id: 'urbano', nome: 'Urbano',
    display: "'Bricolage Grotesque', sans-serif", corpo: "'Inter', sans-serif",
    pesoDisplay: 600, escalaDisplay: 0.76, grupos: ['happy_hour', 'vaquinha'] },

  { id: 'impacto', nome: 'Impacto',
    display: "'Archivo Black', sans-serif", corpo: "'Archivo', sans-serif",
    pesoDisplay: 400, escalaDisplay: 0.66, grupos: ['happy_hour', 'aniversario'] },
];

export const FONTE_PADRAO = FONTES[0];

export function acharFonte(id: string): ParTipografico {
  return FONTES.find((f) => f.id === id) ?? FONTE_PADRAO;
}

export function fontesDoGrupo(grupo: string): ParTipografico[] {
  return FONTES.filter((f) => f.grupos.includes(grupo));
}
