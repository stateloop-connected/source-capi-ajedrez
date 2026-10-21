/**
 * Notación algebraica estándar (SAN) y notación UCI de los movimientos.
 * La SAN interna usa las letras internacionales (K, Q, R, B, N); la interfaz
 * puede traducirla a la notación española con aSanEspanol().
 */
import { COLUMNAS, columna, fila, indiceCasilla, nombreCasilla } from './casillas';
import type { Posicion } from './posicion';
import {
  BANDERA_ENROQUE_CORTO,
  BANDERA_ENROQUE_LARGO,
  PEON,
  type Movimiento,
} from './tipos';

const LETRAS_SAN = ['', '', 'N', 'B', 'R', 'Q', 'K'];
const LETRAS_UCI = ['', '', 'n', 'b', 'r', 'q', ''];

/** Genera la SAN de un movimiento legal en la posición actual (antes de jugarlo). */
export function aSan(pos: Posicion, m: Movimiento, legales: Movimiento[] = pos.movimientosLegales()): string {
  let san: string;
  if (m.bandera === BANDERA_ENROQUE_CORTO) {
    san = 'O-O';
  } else if (m.bandera === BANDERA_ENROQUE_LARGO) {
    san = 'O-O-O';
  } else {
    const tipo = m.pieza & 7;
    const destino = nombreCasilla(m.hasta);
    const captura = m.capturada !== 0;
    if (tipo === PEON) {
      san = captura ? `${COLUMNAS[columna(m.desde)]}x${destino}` : destino;
      if (m.coronacion) san += `=${LETRAS_SAN[m.coronacion]}`;
    } else {
      san = LETRAS_SAN[tipo] + desambiguacion(m, legales) + (captura ? 'x' : '') + destino;
    }
  }

  pos.hacer(m);
  if (pos.enJaque()) san += pos.tieneMovimientoLegal() ? '+' : '#';
  pos.deshacer();
  return san;
}

/** Añade columna, fila o ambas cuando otra pieza igual puede llegar a la misma casilla. */
function desambiguacion(m: Movimiento, legales: Movimiento[]): string {
  const rivales = legales.filter((o) => o.pieza === m.pieza && o.hasta === m.hasta && o.desde !== m.desde);
  if (rivales.length === 0) return '';
  const mismaColumna = rivales.some((o) => columna(o.desde) === columna(m.desde));
  const mismaFila = rivales.some((o) => fila(o.desde) === fila(m.desde));
  if (!mismaColumna) return COLUMNAS[columna(m.desde)];
  if (!mismaFila) return String(fila(m.desde) + 1);
  return nombreCasilla(m.desde);
}

function normalizarSan(san: string): string {
  return san.replace(/[+#!?]/g, '').replace(/0/g, 'O').trim();
}

/** Busca el movimiento legal que corresponde a una SAN (acepta "+", "#", "!" y "?"). */
export function desdeSan(pos: Posicion, san: string): Movimiento | null {
  const buscado = normalizarSan(san);
  const legales = pos.movimientosLegales();
  for (const m of legales) {
    if (normalizarSan(aSan(pos, m, legales)) === buscado) return m;
  }
  return null;
}

/** Notación UCI: "e2e4", "e7e8q". */
export function aUci(m: Movimiento): string {
  return nombreCasilla(m.desde) + nombreCasilla(m.hasta) + LETRAS_UCI[m.coronacion];
}

/** Busca el movimiento legal que corresponde a una cadena UCI. */
export function desdeUci(pos: Posicion, uci: string): Movimiento | null {
  const desde = indiceCasilla(uci.slice(0, 2));
  const hasta = indiceCasilla(uci.slice(2, 4));
  const coronacion = uci.length > 4 ? LETRAS_UCI.indexOf(uci[4].toLowerCase()) : 0;
  if (desde < 0 || hasta < 0 || coronacion < 0) return null;
  return (
    pos.movimientosLegales().find(
      (m) => m.desde === desde && m.hasta === hasta && m.coronacion === coronacion,
    ) ?? null
  );
}

const A_ESPANOL: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };

/** Traduce la SAN internacional a la notación española (R, D, T, A, C). */
export function aSanEspanol(san: string): string {
  return san.replace(/[KQRBN]/g, (letra) => A_ESPANOL[letra]);
}
