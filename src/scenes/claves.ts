/** Claves de las escenas y eventos globales del juego. */
export const ESCENAS = {
  carga: 'Carga',
  menu: 'Menu',
  instrucciones: 'Instrucciones',
  juego: 'Juego',
} as const;

/** Evento del juego que se emite cuando la pantalla cambia entre vertical y horizontal. */
export const EVENTO_REORIENTAR = 'reorientar';
