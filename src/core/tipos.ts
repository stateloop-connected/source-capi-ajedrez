/**
 * Tipos y constantes básicas del motor de ajedrez.
 *
 * Una pieza se codifica como un número: color | tipo.
 *  - Tipo: 1..6 (peón, caballo, alfil, torre, dama, rey).
 *  - Color: 0 para las claras (blancas) y 8 para las oscuras (negras).
 * Una casilla vacía vale 0.
 *
 * Las casillas se numeran de 0 a 63: a1 = 0, b1 = 1, ..., h8 = 63.
 */

export const CLARAS = 0;
export const OSCURAS = 8;
export type Color = typeof CLARAS | typeof OSCURAS;

export const VACIA = 0;
export const PEON = 1;
export const CABALLO = 2;
export const ALFIL = 3;
export const TORRE = 4;
export const DAMA = 5;
export const REY = 6;
export type TipoPieza = 1 | 2 | 3 | 4 | 5 | 6;

/** Piezas a las que puede coronar un peón. */
export const TIPOS_CORONACION: readonly TipoPieza[] = [DAMA, TORRE, ALFIL, CABALLO];

/** Banderas de movimientos especiales. */
export const BANDERA_NORMAL = 0;
export const BANDERA_DOBLE_PASO = 1;
export const BANDERA_AL_PASO = 2;
export const BANDERA_ENROQUE_CORTO = 3;
export const BANDERA_ENROQUE_LARGO = 4;

/** Derechos de enroque como máscara de bits. */
export const ENROQUE_CLARAS_CORTO = 1;
export const ENROQUE_CLARAS_LARGO = 2;
export const ENROQUE_OSCURAS_CORTO = 4;
export const ENROQUE_OSCURAS_LARGO = 8;

export interface Movimiento {
  /** Casilla de origen (0..63). */
  desde: number;
  /** Casilla de destino (0..63). */
  hasta: number;
  /** Pieza que se mueve (color | tipo). */
  pieza: number;
  /** Pieza capturada (color | tipo) o 0. En la captura al paso es el peón capturado. */
  capturada: number;
  /** Tipo de pieza a la que se corona (sin color) o 0. */
  coronacion: number;
  /** Una de las constantes BANDERA_*. */
  bandera: number;
}

export function colorDe(pieza: number): Color {
  return (pieza & 8) as Color;
}

export function tipoDe(pieza: number): number {
  return pieza & 7;
}

export function colorContrario(color: Color): Color {
  return (color ^ 8) as Color;
}

/** Letras FEN de cada tipo (índice = tipo). */
export const LETRAS_FEN = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

/** Valor de material clásico usado para la ventaja (+N) y el modo fácil. */
export const VALOR_MATERIAL = [0, 1, 3, 3, 5, 9, 0];
