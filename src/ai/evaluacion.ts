/**
 * Evaluación estática: material + tablas de posición (piece-square tables).
 * Las tablas están escritas desde el punto de vista de las claras, con la fila 8 arriba,
 * tal como se leerían en un diagrama.
 */
import { OSCURAS, REY, columna, fila, type Posicion } from '../core';

/** Valor de cada tipo de pieza en centipeones (índice = tipo). */
export const VALOR_PIEZA = [0, 100, 320, 330, 500, 900, 0];

// prettier-ignore
const TABLA_PEON = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];
// prettier-ignore
const TABLA_CABALLO = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
// prettier-ignore
const TABLA_ALFIL = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
// prettier-ignore
const TABLA_TORRE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];
// prettier-ignore
const TABLA_DAMA = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
// prettier-ignore
const TABLA_REY_MEDIO = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];
// prettier-ignore
const TABLA_REY_FINAL = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50,
];

/** Tablas por tipo de pieza (el rey se evalúa aparte). */
const TABLAS: number[][] = [[], TABLA_PEON, TABLA_CABALLO, TABLA_ALFIL, TABLA_TORRE, TABLA_DAMA];

/** Peso de cada pieza para calcular la fase de la partida (24 = apertura, 0 = final). */
const PESO_FASE = [0, 0, 1, 1, 2, 4, 0];
const FASE_TOTAL = 24;

/** Índice en las tablas (escritas con la fila 8 arriba) para una pieza de cada color. */
function indiceTabla(casilla: number, esOscura: boolean): number {
  return esOscura ? casilla : (7 - fila(casilla)) * 8 + columna(casilla);
}

function distanciaAlCentro(casilla: number): number {
  const c = columna(casilla);
  const f = fila(casilla);
  return Math.max(3 - c, c - 4) + Math.max(3 - f, f - 4);
}

function distanciaEntre(a: number, b: number): number {
  return Math.abs(columna(a) - columna(b)) + Math.abs(fila(a) - fila(b));
}

/** Evalúa la posición en centipeones desde el punto de vista del bando al que le toca. */
export function evaluar(pos: Posicion): number {
  const t = pos.tablero;
  let material = 0;
  let posicional = 0;
  let fase = 0;
  let reyClaro = 0;
  let reyOscuro = 0;

  for (let c = 0; c < 64; c++) {
    const p = t[c];
    if (p === 0) continue;
    const tipo = p & 7;
    const esOscura = (p & 8) === OSCURAS;
    const signo = esOscura ? -1 : 1;
    fase += PESO_FASE[tipo];
    if (tipo === REY) {
      if (esOscura) reyOscuro = c;
      else reyClaro = c;
      continue;
    }
    material += signo * VALOR_PIEZA[tipo];
    posicional += signo * TABLAS[tipo][indiceTabla(c, esOscura)];
  }

  // El rey se refugia en la apertura y se centraliza en el final (evaluación interpolada).
  const f = Math.min(fase, FASE_TOTAL);
  const reyMedio = TABLA_REY_MEDIO[indiceTabla(reyClaro, false)] - TABLA_REY_MEDIO[indiceTabla(reyOscuro, true)];
  const reyFinal = TABLA_REY_FINAL[indiceTabla(reyClaro, false)] - TABLA_REY_FINAL[indiceTabla(reyOscuro, true)];
  posicional += Math.round((reyMedio * f + reyFinal * (FASE_TOTAL - f)) / FASE_TOTAL);

  // En finales ganados, empujar al rey rival al borde y acercar el propio ayuda a dar mate.
  let remate = 0;
  if (f <= 8 && Math.abs(material) >= 400) {
    const ganaClaras = material > 0;
    const reyPerdedor = ganaClaras ? reyOscuro : reyClaro;
    const reyGanador = ganaClaras ? reyClaro : reyOscuro;
    const bono = 10 * distanciaAlCentro(reyPerdedor) + 4 * (14 - distanciaEntre(reyGanador, reyPerdedor));
    remate = ganaClaras ? bono : -bono;
  }

  const total = material + posicional + remate;
  return pos.turno === OSCURAS ? -total : total;
}

