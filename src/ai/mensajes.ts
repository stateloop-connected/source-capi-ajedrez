import type { Dificultad } from './ia';

/** Petición del hilo principal al worker de la IA. */
export interface PeticionIA {
  id: number;
  fenInicial: string;
  jugadas: string[];
  dificultad: Dificultad;
}

/** Respuesta del worker: la jugada elegida en notación UCI (o null si no hay jugadas). */
export interface RespuestaIA {
  id: number;
  uci: string | null;
}
